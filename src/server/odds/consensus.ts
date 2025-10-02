// src/server/odds/consensus.ts
// Robust consensus calculation with proper de-vigging, outlier filtering, and sanity gates

export type Canonical = "home" | "away" | "draw";

export interface ConsensusResult {
  prob: number;      // 0..1 (vig-free)
  american?: number; // formatted only if sane; else omit
  reason?: "insufficient_samples" | "implausible_probs" | "invalid_quotes";
  samples: { home?: number; away?: number; draw?: number };
}

export interface Quote {
  sportsbook: string;
  eventId: string;
  marketType: "moneyline" | "threeway";
  participants?: { homeId: string; awayId: string; drawId?: string };
  outcomes: Array<{
    name: string;
    selectionId: string;
    price: number;
    oddsFormat: "american" | "decimal";
  }>;
  lastUpdate?: string;
}

// Constants for consensus calculation
const MIN_SAMPLES_PER_OUTCOME = 3;
const OUTLIER_Z = 2.5; // MAD outlier threshold
const TRIM_PCT = 0.1; // 10% trim each tail
const PROB_MIN = 1e-6; // Minimum probability
const PROB_MAX = 1 - 1e-6; // Maximum probability
const AMERICAN_MAX = 10000; // Maximum American odds

// Helper: Clamp probability to valid range
function clamp01(p: number): number {
  return Math.max(PROB_MIN, Math.min(PROB_MAX, p));
}

// Helper: Convert American odds to implied probability
function americanToImplied(american: number): number {
  if (american > 0) {
    return 100 / (american + 100);
  } else {
    return Math.abs(american) / (Math.abs(american) + 100);
  }
}

// Helper: Convert decimal odds to implied probability
function decimalToImplied(decimal: number): number {
  return 1 / decimal;
}

// Helper: Convert implied probability to decimal odds
function impliedToDecimal(prob: number): number {
  return 1 / prob;
}

// Helper: Convert implied probability to American odds
function impliedToAmerican(prob: number): number | undefined {
  if (prob < 0.02 || prob > 0.98) return undefined; // Guard against extreme values
  
  const decimal = impliedToDecimal(prob);
  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100);
  } else {
    return Math.round(-100 / (decimal - 1));
  }
}

// Helper: Normalize odds to implied probability
function normalizeOddsToImplied(odds: number, format: "american" | "decimal"): number {
  if (format === "decimal") {
    return decimalToImplied(odds);
  } else {
    return americanToImplied(odds);
  }
}

// Helper: Remove vig from N-way market
function removeVigNWay(probs: number[]): number[] {
  const total = probs.reduce((sum, p) => sum + p, 0);
  if (total <= 0) return probs;
  return probs.map(p => p / total);
}

// Helper: Pick most common value from array
function pickMostCommon<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  
  const counts = new Map<T, number>();
  arr.forEach(item => {
    counts.set(item, (counts.get(item) || 0) + 1);
  });
  
  let maxCount = 0;
  let mostCommon: T | undefined;
  
  counts.forEach((count, item) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = item;
    }
  });
  
  return mostCommon;
}

// Helper: Build canonicalizer from participant IDs
function buildCanonicalizer(homeId: string, awayId: string, drawId?: string) {
  const map = new Map<string, Canonical>();
  map.set(homeId, "home");
  map.set(awayId, "away");
  if (drawId) map.set(drawId, "draw");
  
  return (selectionId?: string): Canonical | null => {
    return selectionId ? map.get(selectionId) ?? null : null;
  };
}

// Helper: Map outcome to canonical slot
function toCanonical(outcome: any, canonOf: (id?: string) => Canonical | null): Canonical | null {
  return canonOf(outcome.selectionId);
}

// Helper: MAD outlier filtering on logit scale
function madFilterProbabilities(probs: number[], zThreshold: number = OUTLIER_Z): number[] {
  if (probs.length < 3) return probs;
  
  // Convert to logit scale for better outlier detection
  const logits = probs.map(p => Math.log(p / (1 - p)));
  
  // Calculate MAD
  const sorted = [...logits].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mad = sorted.reduce((sum, x) => sum + Math.abs(x - median), 0) / sorted.length;
  const scaledMad = 1.4826 * mad; // Scale MAD to approximate standard deviation
  
  // Filter outliers
  return probs.filter((_, i) => {
    const z = Math.abs(logits[i] - median) / scaledMad;
    return z <= zThreshold;
  });
}

// Helper: Trimmed mean on logit scale
function trimmedMeanLogit(probs: number[], trimPercent: number = TRIM_PCT): number {
  if (probs.length < 3) return probs[0] || 0.5;
  
  // Convert to logit scale
  const logits = probs.map(p => Math.log(p / (1 - p)));
  
  // Sort and trim
  const sorted = logits.sort((a, b) => a - b);
  const trimCount = Math.floor(probs.length * trimPercent);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  
  // Calculate mean and convert back
  const meanLogit = trimmed.reduce((sum, x) => sum + x, 0) / trimmed.length;
  const prob = 1 / (1 + Math.exp(-meanLogit));
  
  return clamp01(prob);
}

// Helper: Check if quote is fresh (within 300s for prematch, 60s for live)
function isFresh(lastUpdate?: string, isLive: boolean = false): boolean {
  if (!lastUpdate) return false;
  
  const maxAge = isLive ? 60 : 300; // 60s for live, 300s for prematch
  const age = (Date.now() - new Date(lastUpdate).getTime()) / 1000;
  return age <= maxAge;
}

// Helper: Validate quote shape
function hasCorrectShape(q: Quote): boolean {
  return !!(q.outcomes && q.outcomes.length >= 2 && q.eventId && q.marketType);
}

// Helper: Validate outcome quote
function isValidOutcomeQuote(o?: any): boolean {
  return !!(o && o.name && o.price && o.oddsFormat && o.selectionId);
}

// Main consensus calculation function
export function calculateConsensusStrict(quotes: Quote[]): ConsensusResult[] {
  // Filter fresh, valid quotes
  const fresh = quotes.filter(q =>
    (q.marketType === "moneyline" || q.marketType === "threeway") &&
    isFresh(q.lastUpdate) &&
    hasCorrectShape(q) &&
    q.outcomes?.length >= 2 &&
    q.outcomes.every(isValidOutcomeQuote) &&
    !q.outcomes.some(o => ["Field", "Any", "Other", "Draw (No Bet)"].includes((o.name || "").trim()))
  );

  // Group by event and market type
  const buckets = new Map<string, Quote[]>();
  for (const q of fresh) {
    const key = `${q.eventId}__${q.marketType}`;
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(q);
  }

  const results: ConsensusResult[] = [];

  for (const [key, qs] of buckets.entries()) {
    const [eventId, marketType] = key.split("__") as [string, "moneyline" | "threeway"];

    // Build canonicalizer from participant IDs
    const homeId = pickMostCommon(qs.map(q => q.participants?.homeId).filter(Boolean));
    const awayId = pickMostCommon(qs.map(q => q.participants?.awayId).filter(Boolean));
    const drawId = pickMostCommon(qs.map(q => q.participants?.drawId).filter(Boolean));
    
    if (!homeId || !awayId) {
      console.warn(`Missing participant IDs for event ${eventId}, skipping`);
      continue;
    }
    
    const canonOf = buildCanonicalizer(homeId, awayId, drawId);

    // Collect fair probabilities per canonical outcome
    const fair: Record<Canonical, number[]> = { home: [], away: [], draw: [] };
    let validQuotes = 0;

    for (const q of qs) {
      // Require all needed canonical slots per quote
      const mapped = q.outcomes
        .map(o => ({ slot: toCanonical(o, canonOf), implied: normalizeOddsToImplied(o.price, o.oddsFormat) }))
        .filter(m => m.slot !== null) as { slot: Canonical; implied: number }[];

      const need: Canonical[] = (marketType === "threeway") ? ["home", "away", "draw"] : ["home", "away"];
      if (!need.every(n => mapped.some(m => m.slot === n))) continue;

      const ordered = need.map(n => mapped.find(m => m.slot === n)!.implied);
      const fairPs = removeVigNWay(ordered);
      need.forEach((n, i) => fair[n].push(fairPs[i]));
      validQuotes++;
    }

    if (validQuotes < MIN_SAMPLES_PER_OUTCOME) {
      results.push({
        prob: 0,
        reason: "insufficient_samples",
        samples: { home: fair.home.length, away: fair.away.length, draw: fair.draw.length }
      });
      continue;
    }

    const need: Canonical[] = (marketType === "threeway") ? ["home", "away", "draw"] : ["home", "away"];
    const agg: { canonical: Canonical; p: number }[] = [];

    for (const slot of need) {
      let arr = fair[slot].filter(Number.isFinite);
      arr = madFilterProbabilities(arr);
      if (arr.length < MIN_SAMPLES_PER_OUTCOME) {
        results.push({
          prob: 0,
          reason: "insufficient_samples",
          samples: { home: fair.home.length, away: fair.away.length, draw: fair.draw.length }
        });
        continue;
      }
      const p = trimmedMeanLogit(arr);
      agg.push({ canonical: slot, p: clamp01(p) });
    }
    
    if (agg.length !== need.length) continue;

    // Renormalize across outcomes
    const sum = agg.reduce((a, b) => a + b.p, 0) || 1;
    const normalized = agg.map(o => ({ ...o, p: o.p / sum }));

    // Sanity gate for extreme probabilities
    if (normalized.some(o => o.p <= 0.002 || o.p >= 0.998)) {
      results.push({
        prob: 0,
        reason: "implausible_probs",
        samples: { home: fair.home.length, away: fair.away.length, draw: fair.draw.length }
      });
      continue;
    }

    // Return consensus for each outcome
    for (const { canonical, p } of normalized) {
      const american = impliedToAmerican(p);
      
      results.push({
        prob: p,
        american: american,
        samples: { home: fair.home.length, away: fair.away.length, draw: fair.draw.length }
      });
    }
  }

  return results;
}

// Field average calculation (competitor books only)
export function calculateFieldAverage(oddsComparison: any[], excludeMainBook: boolean = true): number | undefined {
  const competitor = oddsComparison.filter(b => {
    if (excludeMainBook && b.isMainBook) return false;
    if (!b.odds || !Number.isFinite(b.odds)) return false;
    return Math.abs(b.odds) >= 10 && Math.abs(b.odds) <= AMERICAN_MAX;
  });
  
  if (competitor.length < 3) return undefined; // Require ≥3 competitor books
  
  // Convert to implied probabilities
  const probs = competitor.map(b => americanToImplied(b.odds));
  
  // Apply MAD outlier filter
  const filtered = madFilterProbabilities(probs);
  if (filtered.length < 3) return undefined;
  
  // Calculate trimmed mean
  const avgProb = trimmedMeanLogit(filtered);
  
  // Sanity clamp
  if (avgProb <= 0.02 || avgProb >= 0.98) return undefined;
  
  // Convert back to American
  const american = impliedToAmerican(avgProb);
  return american;
}

// EV calculation using consensus probability
export function calculateEV(bookAmerican: number, consensusProb: number, stake: number = 100): number {
  if (!Number.isFinite(bookAmerican) || !Number.isFinite(consensusProb)) return 0;
  
  const decimal = bookAmerican >= 0 ? 1 + bookAmerican/100 : 1 + 100/Math.abs(bookAmerican);
  if (!Number.isFinite(decimal) || decimal <= 1) return 0;
  
  const profitIfWin = stake * (decimal - 1);
  const ev = consensusProb * profitIfWin - (1 - consensusProb) * stake;
  return (ev / stake) * 100;
}

// Edge calculation (price vs fair)
export function calculateEdge(bookAmerican: number, consensusProb: number): number {
  if (!Number.isFinite(bookAmerican) || !Number.isFinite(consensusProb)) return 0;
  
  const fairDecimal = 1 / consensusProb;
  const bookDecimal = bookAmerican >= 0 ? 1 + bookAmerican/100 : 1 + 100/Math.abs(bookAmerican);
  
  if (!Number.isFinite(fairDecimal) || !Number.isFinite(bookDecimal) || bookDecimal <= 1) return 0;
  
  return ((bookDecimal - fairDecimal) / fairDecimal) * 100;
}
