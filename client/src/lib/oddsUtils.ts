import { americanToDecimal as canonicalAmericanToDecimal, decimalToAmerican as canonicalDecimalToAmerican } from '@shared/lib/oddsConversion';

export function americanToDecimal(american: number | string | null | undefined): string | null {
  if (american == null) return null;
  const n = typeof american === "string" ? parseFloat(american) : american;

  if (!isFinite(n) || n === 0) return null;

  try {
    // Use canonical conversion with bounds checking
    const cappedAmerican = Math.max(-10000, Math.min(10000, n));
    const dec = canonicalAmericanToDecimal(cappedAmerican);

    // Ensure decimal odds are within reasonable betting range
    const boundedDec = Math.max(1.01, Math.min(51.00, dec));

    return boundedDec.toFixed(2);
  } catch {
    return null;
  }
}

export function decimalToAmerican(decimal: number | string | null | undefined): string | null {
  const price = typeof decimal === "string" ? parseFloat(decimal) : decimal;

  if ((price == null) || (price <= 1)) {
    return null;
  }

  try {
    const american = canonicalDecimalToAmerican(price);
    return american > 0 ? `+${american}` : `${american}`;
  } catch {
    return null;
  }
}

/**
 * Calculate implied probability from American odds
 */
export function calculateImpliedProbability(american: number | string | null | undefined): number {
  if (american == null) return 0;
  const n = typeof american === "string" ? parseFloat(american) : american;
  if (!isFinite(n) || n === 0) return 0;
  
  if (n > 0) {
    // Positive odds: 100 / (odds + 100)
    return 100 / (n + 100);
  } else {
    // Negative odds: |odds| / (|odds| + 100)
    return Math.abs(n) / (Math.abs(n) + 100);
  }
}

/**
 * Calculate win probability percentage from odds (supports both American and Decimal)
 */
export function calculateWinProbability(odds: number | string | null | undefined): number {
  if (odds == null) return 0;
  
  const n = typeof odds === "string" ? parseFloat(odds) : odds;
  
  if (!isFinite(n) || n === 0) return 0;
  
  let impliedProb: number;
  
  // Smart detection: Check if these are decimal odds (1.01 to 999.99) or American odds
  if (n > 0 && n < 1000) {
    // These look like decimal odds - use direct formula
    impliedProb = 1 / n;
  } else {
    // These look like American odds - use American formula
    const cappedOdds = Math.max(-10000, Math.min(10000, n));
    
    if (cappedOdds > 0) {
      // Positive American odds: probability = 100 / (odds + 100)
      impliedProb = 100 / (cappedOdds + 100);
    } else {
      // Negative American odds: probability = |odds| / (|odds| + 100)
      impliedProb = Math.abs(cappedOdds) / (Math.abs(cappedOdds) + 100);
    }
  }
  
  const percentage = impliedProb * 100;
  
  // Ensure percentage is between 1 and 99 (realistic betting range)
  const boundedPercentage = Math.max(1, Math.min(99, percentage));
  
  return Math.round(boundedPercentage * 100) / 100;
}

/**
 * Calculate Expected Value (EV) percentage with comprehensive debugging
 */
export function calculateEV(myOdds: number | string, fairOdds: number | string): number {
  const myOddsNum = typeof myOdds === "string" ? parseFloat(myOdds) : myOdds;
  const fairOddsNum = typeof fairOdds === "string" ? parseFloat(fairOdds) : fairOdds;
  
  // Enhanced validation
  if (!isFinite(myOddsNum) || !isFinite(fairOddsNum) || 
      myOddsNum === 0 || fairOddsNum === 0) {
    return 0;
  }
  
  // Smart detection and conversion to decimal odds
  let myDecimal: number, fairDecimal: number;
  
  // Convert myOdds to decimal
  if (myOddsNum > 0 && myOddsNum < 1000) {
    myDecimal = myOddsNum; // Already decimal
  } else {
    // Convert from American
    const capped = Math.max(-10000, Math.min(10000, myOddsNum));
    myDecimal = capped > 0 ? (1 + capped / 100) : (1 - 100 / capped);
  }
  
  // Convert fairOdds to decimal
  if (fairOddsNum > 0 && fairOddsNum < 1000) {
    fairDecimal = fairOddsNum; // Already decimal
  } else {
    // Convert from American
    const capped = Math.max(-10000, Math.min(10000, fairOddsNum));
    fairDecimal = capped > 0 ? (1 + capped / 100) : (1 - 100 / capped);
  }
  
  // Calculate implied probabilities
  const fairImpliedProb = 1 / fairDecimal;
  
  // EV formula: (probability * decimal_odds) - 1
  const ev = (fairImpliedProb * myDecimal) - 1;
  const evPercent = ev * 100;
  
  // Cap EV at reasonable bounds (-50% to +100%)
  const boundedEV = Math.max(-50, Math.min(100, evPercent));
  
  return Math.round(boundedEV * 100) / 100;
}

/**
 * Format odds display with proper + sign for positive odds
 */
export function formatOdds(odds: number | string | null | undefined): string {
  if (odds == null) return 'N/A';
  const n = typeof odds === "string" ? parseFloat(odds) : odds;
  if (!isFinite(n)) return 'N/A';
  
  if (n > 0) {
    return `+${n}`;
  } else {
    return `${n}`;
  }
}

/**
 * Parse odds from various string formats
 */
export function parseOdds(oddsString: string | number | null | undefined): number | null {
  if (oddsString == null) return null;
  if (typeof oddsString === 'number') return oddsString;
  
  const cleanString = oddsString.toString().replace(/[+\s]/g, ''); // Remove + and spaces
  const parsed = parseFloat(cleanString);
  
  return isFinite(parsed) ? parsed : null;
}

/**
 * Calculate Expected Value percentage (+EV%) using true probability method
 * 
 * @param odds - The sportsbook odds (supports American or Decimal format)
 * @param trueProbability - The no-vig fair probability (as decimal 0-1, e.g., 0.55 for 55%)
 * @param stake - The bet stake amount (default 100)
 * @returns EV percentage as a number (can be positive or negative)
 * 
 * Example: 
 * - Sportsbook offers +110 (implied prob = 47.6%)
 * - True probability = 55% (0.55)
 * - EV = (0.55 × 110) - (0.45 × 100) = 15.5
 * - +EV% = (15.5 ÷ 100) × 100 = +15.5%
 */
// Canonical EV% wrapper: always convert to American if decimal provided
export function calculateEVPercent(odds: number | string | null | undefined, trueProbability: number, stake: number = 100): number {
  if (odds == null || trueProbability == null || trueProbability <= 0 || trueProbability >= 1) {
    return 0;
  }
  const n = typeof odds === 'string' ? parseFloat(odds) : odds;
  if (!isFinite(n) || n === 0) return 0;

  // Determine format and ensure American odds for canonical calculation
  let americanOddsNum: number;
  if (Math.abs(n) >= 100 || n <= -100) {
    // Already American odds
    americanOddsNum = n;
  } else if (n > 1 && n < 100) {
    // Decimal odds → American (numeric)
    americanOddsNum = n < 2 ? -Math.round(100 / (n - 1)) : Math.round((n - 1) * 100);
  } else {
    // Fallback: treat as decimal odds in [1.01, 50]
    const d = Math.max(1.01, Math.min(50, n));
    americanOddsNum = d < 2 ? -Math.round(100 / (d - 1)) : Math.round((d - 1) * 100);
  }

  // Delegate to shared canonical implementation
  try {
    // Dynamic import avoids circular dependencies in some bundlers
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { calculateEVPercent: canonicalEVPercent } = require('@shared/lib/evCalculations');
    const val = canonicalEVPercent(americanOddsNum, trueProbability, stake);
    // Bound to reasonable range and round to 1 decimal
    const bounded = Math.max(-100, Math.min(500, val));
    return Math.round(bounded * 10) / 10;
  } catch {
    // If shared module unavailable, compute directly (identical math)
    const decimal = americanOddsNum > 0 ? 1 + americanOddsNum / 100 : 1 + 100 / Math.abs(americanOddsNum);
    const profitIfWin = (decimal - 1) * stake;
    const evDollars = (trueProbability * profitIfWin) - ((1 - trueProbability) * stake);
    const evPercent = (evDollars / stake) * 100;
    const bounded = Math.max(-100, Math.min(500, evPercent));
    return Math.round(bounded * 10) / 10;
  }
}

/**
 * Calculate no-vig fair probability from multiple sportsbook odds
 * Strips vig from odds across books to get fair probabilities
 * 
 * @param oddsArray - Array of odds from different sportsbooks
 * @returns Fair probability as decimal (0-1), or null if insufficient data
 */
export function calculateNoVigProbability(odds: number[]): number | undefined {
  if (!odds || odds.length < 2) return undefined;

  // 1. Filter and convert odds to probabilities
  const validOdds = odds.filter(o => o > 1 && o < 1000);
  if (validOdds.length < 2) return undefined;

  // 2. Book credibility weights (higher = more trusted)
  const bookWeights = {
    'DRAFTKINGS': 1.2,
    'FANDUEL': 1.1,
    'MGM': 1.0,
    'CAESARS': 0.9,
    'BET_RIVERS': 0.8,
    'DEFAULT': 0.7
  };

  // 3. Calculate weighted average probability
  let totalWeight = 0;
  let weightedSum = 0;

  validOdds.forEach(odds => {
    const book = odds.book || 'DEFAULT';
    const weight = bookWeights[book] || bookWeights.DEFAULT;
    const prob = 1 / odds;
    
    totalWeight += weight;
    weightedSum += prob * weight;
  });

  // 4. Remove vig using Shin's method for more accuracy
  const z = weightedSum / totalWeight;
  const marketVig = 1 - z;
  const noVigProb = z / (1 - marketVig);

  // 5. Clamp to reasonable values
  return Math.min(Math.max(noVigProb, 0.01), 0.99);
}

// New: Market-implied probability with liquidity weighting
export function calculateMarketImpliedProbability(oddsData: {odds: number, liquidity: number, book: string}[]) {
  if (!oddsData || oddsData.length < 2) return undefined;

  // Calculate liquidity-weighted probabilities
  const totalLiquidity = oddsData.reduce((sum, data) => sum + (data.liquidity || 1), 0);
  
  let weightedProbSum = 0;
  oddsData.forEach(data => {
    const weight = (data.liquidity || 1) / totalLiquidity;
    weightedProbSum += (1 / data.odds) * weight;
  });

  // Apply Shin adjustment for market efficiency
  const z = weightedProbSum;
  const marketVig = 1 - z;
  return z / (1 - marketVig);
}