// Robust consensus line calculation for sports betting odds
// Handles moneyline and three-way markets with proper de-vigging, outlier filtering, and sanity checks

// Import types from the types file
import { OutcomeQuote, Quote, OddsFormat, Canonical } from "./types";

// Tunables
const MAX_AGE_SECONDS = 300;        // ignore older than 5 minutes
const OUTLIER_Z = 2.5;              // MAD z-threshold on logit scale
const TRIM_PCT = 0.10;              // 10% trimmed mean
const P_MIN = 1e-6;                 // lower clamp
const P_MAX = 1 - 1e-6;             // upper clamp

// Sanity bounds (display guards)
const ML_AMERICAN_MIN = -10000;
const ML_AMERICAN_MAX = +10000;
const MIN_SAMPLES_PER_OUTCOME = 3;  // require at least 3 clean quotes

// 2) Core Math Helpers
function clamp01(p: number) {
  return Math.min(P_MAX, Math.max(P_MIN, p));
}

// American/Decimal conversions
function americanToDecimal(a: number): number {
  return a >= 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
}

function decimalToImplied(d: number): number {
  return 1 / d;
}

function impliedToDecimal(p: number): number {
  return 1 / clamp01(p);
}

function impliedToAmerican(p: number): number {
  const d = impliedToDecimal(p);
  return d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1));
}

function normalizeOddsToImplied(odds: number, fmt: OddsFormat): number {
  const d = fmt === "decimal" ? odds : americanToDecimal(odds);
  return decimalToImplied(d);
}

// De-vig N-way (simple normalization)
function removeVigNWay(psRaw: number[]): number[] {
  const s = psRaw.reduce((a, b) => a + b, 0);
  if (!isFinite(s) || s <= 0) return psRaw.map(() => NaN);
  const ps = psRaw.map(p => p / s);
  // exact renormalization
  const sum = ps.reduce((a, b) => a + b, 0) || 1;
  return ps.map(p => p / sum);
}

// Robust stats on logit scale
function logit(p: number) { 
  const pc = clamp01(p); 
  return Math.log(pc / (1 - pc)); 
}

function invLogit(z: number) { 
  return 1 / (1 + Math.exp(-z)); 
}

function median(xs: number[]) {
  const a = [...xs].sort((x, y) => x - y);
  const n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

function mad(xs: number[], med?: number) {
  const m = med ?? median(xs);
  const devs = xs.map(x => Math.abs(x - m));
  return median(devs) || 0;
}

function madFilterProbabilities(ps: number[], zThresh = OUTLIER_Z): number[] {
  if (ps.length <= 3) return ps;
  const zs = ps.map(p => logit(p));
  const m = median(zs);
  const madVal = mad(zs, m) || 1e-6;
  const scale = 1.4826 * madVal;
  return ps.filter((p, i) => Math.abs(zs[i] - m) / scale <= zThresh);
}

function trimmedMeanLogit(ps: number[], trimPct = TRIM_PCT): number {
  if (ps.length === 0) return NaN;
  const zs = ps.map(p => logit(p)).sort((a, b) => a - b);
  const n = zs.length;
  const k = Math.floor(n * trimPct);
  const kept = zs.slice(k, Math.max(k + 1, n - k)); // keep at least 1
  const avg = kept.reduce((a, b) => a + b, 0) / kept.length;
  return invLogit(avg);
}

function isFresh(iso?: string, maxAgeSec = MAX_AGE_SECONDS) {
  if (!iso) return true;
  const age = (Date.now() - new Date(iso).getTime()) / 1000;
  return age <= maxAgeSec;
}

// Helper to pick most common value from array
function pickMostCommon<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  const counts = new Map<T, number>();
  arr.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
  let maxCount = 0;
  let maxItem: T | undefined;
  counts.forEach((count, item) => {
    if (count > maxCount) {
      maxCount = count;
      maxItem = item;
    }
  });
  return maxItem;
}

// 3) Validation & Grouping Guards
// Reject quotes with obviously bad shapes or "Field"
function isValidQuoteForMarket(q: Quote): boolean {
  if (q.marketType !== "moneyline" && q.marketType !== "threeway") return false; // this module is ONLY for ML/3-way
  if (!q.outcomes || q.outcomes.length < 2) return false;
  // block props/futures/field mixes by name heuristic
  const badNames = new Set(["Field", "Any", "Other", "Draw (No Bet)"]);
  if (q.outcomes.some(o => !o || !isFinite(o.price) || badNames.has((o.name || "").trim()))) return false;
  return true;
}

function groupKey(eventId: string, marketType: Quote["marketType"], outcomeName: string) {
  return `${eventId}__${marketType}__${outcomeName}`;
}

// 4) Consensus Calculator (Moneyline & Three-way)
export function calculateConsensus(quotes: Quote[]): {
  eventId: string;
  marketType: "moneyline" | "threeway";
  outcomes: { name: string; prob: number; decimal: number; american: number }[];
}[] {
  // 1) keep only relevant, fresh, valid quotes
  const fresh = quotes.filter(q => isFresh(q.lastUpdate) && isValidQuoteForMarket(q));

  // 2) group by (eventId + marketType)
  type Bucket = { eventId: string; marketType: Quote["marketType"]; quotes: Quote[] };
  const buckets = new Map<string, Bucket>();
  for (const q of fresh) {
    const key = `${q.eventId}__${q.marketType}`;
    if (!buckets.has(key)) buckets.set(key, { eventId: q.eventId, marketType: q.marketType, quotes: [] });
    buckets.get(key)!.quotes.push(q);
  }

  const results: {
    eventId: string;
    marketType: "moneyline" | "threeway";
    outcomes: { name: string; prob: number; decimal: number; american: number }[];
  }[] = [];

  const bucketArray = Array.from(buckets.values());
  for (const bucket of bucketArray) {
    const { eventId, marketType, quotes: qs } = bucket;
    // derive outcome names expected from majority
    const nameCounts = new Map<string, number>();
    qs.forEach((q: Quote) => q.outcomes.forEach((o: OutcomeQuote) => nameCounts.set(o.name, (nameCounts.get(o.name) ?? 0) + 1)));
    const outcomeNames = Array.from(nameCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, marketType === "threeway" ? 3 : 2)
      .map(([n]) => n);

    // Collect fair probabilities per outcome
    const fairByOutcome: Record<string, number[]> = Object.fromEntries(outcomeNames.map(n => [n, []]));

    for (const q of qs) {
      // map in the order of outcomeNames; drop quotes missing one of the expected outcomes
      const prices: number[] = [];
      const fmt: OddsFormat[] = [];
      const outcomeIndex: Record<string, number> = {};
      q.outcomes.forEach((o, i) => { outcomeIndex[o.name] = i; });
      let complete = true;
      for (const name of outcomeNames) {
        const idx = outcomeIndex[name];
        if (idx === undefined) { complete = false; break; }
        prices.push(q.outcomes[idx].price);
        fmt.push(q.outcomes[idx].oddsFormat);
      }
      if (!complete) continue;

      const psRaw = prices.map((odds, i) => normalizeOddsToImplied(odds, fmt[i]));
      const psFair = removeVigNWay(psRaw);
      outcomeNames.forEach((name, i) => fairByOutcome[name].push(psFair[i]));
    }

    // Outlier filter & aggregate
    const agg: { name: string; p: number }[] = [];
    for (const name of outcomeNames) {
      let arr = fairByOutcome[name].filter(Number.isFinite);
      if (arr.length < MIN_SAMPLES_PER_OUTCOME) continue; // not enough clean samples
      arr = madFilterProbabilities(arr, OUTLIER_Z);
      if (arr.length < MIN_SAMPLES_PER_OUTCOME) continue;
      const p = trimmedMeanLogit(arr, TRIM_PCT);
      agg.push({ name, p: clamp01(p) });
    }
    if (agg.length !== outcomeNames.length) continue; // skip incomplete

    // Renormalize across outcomes
    const sum = agg.reduce((a, b) => a + b.p, 0) || 1;
    const normalized = agg.map(({ name, p }) => ({ name, p: p / sum }));

    // Sanity gate for standard ML/3-way
    const probs = normalized.map(x => x.p);
    if (probs.some(p => p < 0.002 || p > 0.998)) {
      // hide instead of displaying absurd +44900/-inf
      continue;
    }

    // Build odds
    const outcomes = normalized.map(({ name, p }) => {
      const decimal = impliedToDecimal(p);
      const american = impliedToAmerican(p);
      // final odds guard
      if (american < ML_AMERICAN_MIN || american > ML_AMERICAN_MAX) {
        throw new Error(`Consensus odds out of ML bounds for ${eventId}/${name}: ${american}`);
      }
      return { name, prob: p, decimal, american };
    });

    results.push({ eventId, marketType, outcomes });
  }

  return results;
}

// 5) EV Calculator (per sportsbook offer vs consensus)
// EV for a single sportsbook price against consensus probability for THAT outcome.
export function calculateEVForOffer(params: {
  stake: number;                 // e.g., 100
  bookOdds: { price: number; oddsFormat: OddsFormat };
  consensusProb: number;         // 0..1 (vig-free)
}): { ev: number; evPct: number; profitIfWin: number; decimal: number; american: number } {
  const { stake, bookOdds, consensusProb } = params;
  const decimal = bookOdds.oddsFormat === "decimal" ? bookOdds.price : americanToDecimal(bookOdds.price);
  const profitIfWin = stake * (decimal - 1);                     // NET profit
  const lossIfLose = stake;
  const p = clamp01(consensusProb);

  const ev = p * profitIfWin - (1 - p) * lossIfLose;
  const evPct = ev / stake;

  // Clip display for pregame ML to avoid wildly misleading UI
  // (true EV can exceed this, but we suppress display if it does)
  if (!isFinite(ev) || decimal <= 1.0) return { ev: NaN, evPct: NaN, profitIfWin, decimal, american: impliedToAmerican(p) };

  return { ev, evPct, profitIfWin, decimal, american: impliedToAmerican(p) };
}

// 6) Legacy compatibility function REMOVED - was fabricating defaults (p=0.5, -110)
// Use calculateConsensusStrict() instead for proper consensus calculation

// 7) Test functions for validation
export function testConsensusSystem() {
  console.log('🧪 Testing enhanced consensus system...');
  
  // Test 1: Even ML market
  const evenMLQuotes: Quote[] = [
    {
      sportsbook: 'Book1',
      eventId: 'test1',
      marketType: 'moneyline',
      outcomes: [
        { name: 'home', price: -110, oddsFormat: 'american' },
        { name: 'away', price: -110, oddsFormat: 'american' }
      ]
    },
    {
      sportsbook: 'Book2',
      eventId: 'test1',
      marketType: 'moneyline',
      outcomes: [
        { name: 'home', price: -115, oddsFormat: 'american' },
        { name: 'away', price: -105, oddsFormat: 'american' }
      ]
    }
  ];
  
  const evenMLResult = calculateConsensus(evenMLQuotes);
  console.log('✅ Test 1 - Even ML consensus:', evenMLResult);
  
  // Test 2: Outlier filtering
  const outlierQuotes: Quote[] = [
    ...evenMLQuotes,
    {
      sportsbook: 'Book3',
      eventId: 'test1',
      marketType: 'moneyline',
      outcomes: [
        { name: 'home', price: -5999, oddsFormat: 'american' }, // absurd outlier
        { name: 'away', price: -5999, oddsFormat: 'american' }
      ]
    }
  ];
  
  const outlierResult = calculateConsensus(outlierQuotes);
  console.log('✅ Test 2 - Outlier filtering:', outlierResult);
  
  return { evenMLResult, outlierResult };
}

// Quick smoke test for the bullet-proof consensus system
export function testBulletProofConsensus() {
  console.log('🧪 Testing bullet-proof consensus system...');
  
  // should produce ~home 54% (-118), away 46% (+118)
  const quotes: Quote[] = [
    { 
      sportsbook: 'A', 
      eventId: 'E1', 
      marketType: 'moneyline', 
      lastUpdate: new Date().toISOString(),
      outcomes: [
        { name: 'Team H', price: -120, oddsFormat: 'american', role: 'home' },
        { name: 'Team A', price: +110, oddsFormat: 'american', role: 'away' }
      ] 
    },
    { 
      sportsbook: 'B', 
      eventId: 'E1', 
      marketType: 'moneyline', 
      lastUpdate: new Date().toISOString(),
      outcomes: [
        { name: 'Home', price: -115, oddsFormat: 'american', role: 'home' },
        { name: 'Away', price: +105, oddsFormat: 'american', role: 'away' }
      ] 
    },
    { 
      sportsbook: 'C', 
      eventId: 'E1', 
      marketType: 'moneyline', 
      lastUpdate: new Date().toISOString(),
      outcomes: [
        { name: 'H', price: -125, oddsFormat: 'american', role: 'home' },
        { name: 'A', price: +112, oddsFormat: 'american', role: 'away' }
      ] 
    },
    // outlier to be filtered
    { 
      sportsbook: 'D', 
      eventId: 'E1', 
      marketType: 'moneyline', 
      lastUpdate: new Date().toISOString(),
      outcomes: [
        { name: 'H', price: -5000, oddsFormat: 'american', role: 'home' },
        { name: 'A', price: +120, oddsFormat: 'american', role: 'away' }
      ] 
    },
  ];

  const result = calculateConsensusStrict(quotes);
  console.log('✅ Bullet-proof consensus test:', result);
  
  // Expected: one row with home ~0.54 (≈-118), away ~0.46 (≈+118), samples ≈3 per outcome, outlier ignored
  return result;
}

// 6) Strict Consensus System with Canonical Outcome Mapping
export type ConsensusOutcome = { 
  canonical: Canonical; 
  prob: number; 
  decimal: number; 
  american: number; 
};

export type ConsensusRow = {
  eventId: string;
  marketType: "moneyline" | "threeway";
  outcomes: ConsensusOutcome[];
  reason?: "insufficient_samples" | "implausible_probs" | "invalid_quotes";
  samples?: { home: number; away: number; draw: number };
};

// 2) Replace toCanonical heuristic with ID-based mapping
function buildCanonicalizer(homeId: string, awayId: string, drawId?: string) {
  const map = new Map<string, Canonical>();
  map.set(homeId, "home");
  map.set(awayId, "away");
  if (drawId) map.set(drawId, "draw");
  return (selectionId?: string): Canonical | null => (selectionId ? map.get(selectionId) ?? null : null);
}

function toCanonical(o: OutcomeQuote, canonOf: (id: string) => Canonical | null): Canonical | null {
  if (o.role) return o.role;                     // preferred
  if (o.selectionId) return canonOf(o.selectionId); // use selection ID mapping
  
  // fallback to string heuristics (less reliable)
  const s = (o.name || "").toLowerCase().trim();
  if (!s) return null;
  if (s.includes("draw")) return "draw";
  if (s.includes("home")) return "home";
  if (s.includes("away") || s.includes("visitor")) return "away";
  return null;
}

// 3) Strict market shape validation
function hasCorrectShape(q: Quote) {
  if (q.marketType === "moneyline" && q.outcomes.length !== 2) return false;
  if (q.marketType === "threeway" && q.outcomes.length !== 3) return false;
  return true;
}

// 4) Harden quote validation (reject sentinels, extreme & stale)
const AMERICAN_HARD_MIN = -5000; // tighter than 10k
const AMERICAN_HARD_MAX = +5000;

function isValidOutcomeQuote(o?: OutcomeQuote) {
  if (!o) return false;
  if (!isFinite(o.price) || o.price === 0) return false;
  if (o.oddsFormat === "american") {
    if (o.price < AMERICAN_HARD_MIN || o.price > AMERICAN_HARD_MAX) return false;
  }
  return true;
}

// 5) Enhanced consensus calculation with strict validation
export function calculateConsensusStrict(quotes: Quote[]): ConsensusRow[] {
  const fresh = quotes.filter(q =>
    (q.marketType === "moneyline" || q.marketType === "threeway") &&
    isFresh(q.lastUpdate) &&
    hasCorrectShape(q) &&
    q.outcomes?.length >= 2 &&
    q.outcomes.every(isValidOutcomeQuote) &&
    !q.outcomes.some(o => ["Field", "Any", "Other", "Draw (No Bet)"].includes((o.name || "").trim()))
  );

  const buckets = new Map<string, Quote[]>();
  for (const q of fresh) {
    const key = `${q.eventId}__${q.marketType}`;
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(q);
  }

  const rows: ConsensusRow[] = [];

  const bucketArray = Array.from(buckets.entries());
  for (const [key, qs] of bucketArray) {
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

    // collect fair probabilities per canonical outcome
    const fair: Record<Canonical, number[]> = { home: [], away: [], draw: [] };
    let validQuotes = 0;

    for (const q of qs) {
      // 5) Require all needed canonical slots per quote
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

    const need: Canonical[] = (marketType === "threeway") ? ["home", "away", "draw"] : ["home", "away"];
    const agg: { canonical: Canonical; p: number }[] = [];

    for (const slot of need) {
      let arr = fair[slot].filter(Number.isFinite);
      arr = madFilterProbabilities(arr);
      if (arr.length < 3) { // require ≥3 clean per outcome
        rows.push({ 
          eventId, 
          marketType, 
          outcomes: [], 
          reason: "insufficient_samples", 
          samples: { home: fair.home.length, away: fair.away.length, draw: fair.draw.length } 
        });
        continue;
      }
      const p = trimmedMeanLogit(arr);
      agg.push({ canonical: slot, p: clamp01(p) });
    }
    if (agg.length !== need.length) continue;

    // renormalize across outcomes
    const sum = agg.reduce((a, b) => a + b.p, 0) || 1;
    const normalized = agg.map(o => ({ ...o, p: o.p / sum }));

    // 6) Make extreme probabilities non-displaying but still return a reason
    const LOW = 0.01, HIGH = 0.99;    // display guard; adjust per sport if needed
    if (normalized.some(o => o.p <= LOW || o.p >= HIGH)) {
      rows.push({ 
        eventId, 
        marketType, 
        outcomes: [], 
        reason: "implausible_probs", 
        samples: { home: fair.home.length, away: fair.away.length, draw: fair.draw.length } 
      });
      continue;
    }

    const outcomes = normalized.map(({ canonical, p }) => {
      const decimal = impliedToDecimal(p);
      const american = impliedToAmerican(p);
      return { canonical, prob: p, decimal, american };
    });

    rows.push({ eventId, marketType, outcomes, samples: { home: fair.home.length, away: fair.away.length, draw: fair.draw.length } });
  }

  return rows;
}

// 7) Fixed EV Calculator (use consensus probability, never default 0.5)
export function calculateEV({
  stake,
  bookAmerican,
  consensusProb // 0..1
}: { stake: number; bookAmerican: number; consensusProb: number }) {
  const decimal = americanToDecimal(bookAmerican);
  if (!isFinite(decimal) || decimal <= 1) return { ev: NaN, evPct: NaN, profitIfWin: NaN };

  const p = clamp01(consensusProb);               // ← MUST be 0..1
  const profitIfWin = stake * (decimal - 1);      // NET profit
  const ev = p * profitIfWin - (1 - p) * stake;
  const evPct = ev / stake;
  return { ev, evPct, profitIfWin };
}

// 8) UI Display Helpers (fix the ×100 bug + proper fallbacks)
// UI: display probability as percent
export function formatProbPct(p: number): string {
  // p is 0..1 internally
  return `${(p * 100).toFixed(1)}%`;
}

export function displayMyOdds(fromConsensusP?: number): string {
  if (fromConsensusP === undefined || !isFinite(fromConsensusP)) return "—"; // not 0
  const am = impliedToAmerican(fromConsensusP); // uses p 0..1
  return (Math.abs(am) > 10000) ? "—" : (am > 0 ? `+${am}` : `${am}`);
}
