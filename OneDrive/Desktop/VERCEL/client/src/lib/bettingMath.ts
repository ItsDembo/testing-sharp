// Comprehensive Sports Betting Mathematical Calculations
// Implements the four pillars: Win Probability, +EV, Arbitrage, and Middling

export interface OddsData {
  odds: number;
  format: 'american' | 'decimal';
  sportsbook?: string;
}

export interface ArbitrageResult {
  isArbitrage: boolean;
  profitMargin: number;
  arbPercent: number;
  stake1: number;
  stake2: number;
  totalStake: number;
  guaranteedProfit: number;
}

export interface MiddlingResult {
  expectedValue: number;
  middleRange: { min: number; max: number };
  middleHitProbability: number;
  doubleWinPayout: number;
  netLoss: number;
  isPositiveEV: boolean;
}

export interface EVResult {
  ev: number;
  evPercent: number;
  isPositiveEV: boolean;
  impliedProbability: number;
  trueProbability: number;
  payout: number;
}

/**
 * Convert American odds to decimal odds
 */
export function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return 1 + (americanOdds / 100);
  } else {
    return 1 + (100 / Math.abs(americanOdds));
  }
}

/**
 * Convert decimal odds to American odds
 */
export function decimalToAmerican(decimalOdds: number): number {
  if (decimalOdds >= 2) {
    return (decimalOdds - 1) * 100;
  } else {
    return -100 / (decimalOdds - 1);
  }
}

/**
 * Calculate implied probability from odds
 */
export function getImpliedProbability(odds: number, format: 'american' | 'decimal' = 'american'): number {
  if (format === 'decimal') {
    return 1 / odds;
  }
  
  // American odds
  if (odds > 0) {
    return 100 / (odds + 100);
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
}

/**
 * Calculate payout per $1 bet
 */
export function getPayout(odds: number, format: 'american' | 'decimal' = 'american'): number {
  if (format === 'decimal') {
    return odds - 1;
  }
  
  // American odds
  if (odds > 0) {
    return odds / 100;
  } else {
    return 100 / Math.abs(odds);
  }
}

/**
 * Calculate Expected Value with detailed breakdown
 * @deprecated Use calculateEV from @shared/lib/evCalculations instead
 */
export function calculateEV(
  bookOdds: number,
  trueProbability: number,
  stake: number = 100,
  format: 'american' | 'decimal' = 'american'
): EVResult {
  // Convert to American odds if needed
  const americanOdds = format === 'decimal'
    ? decimalToAmerican(bookOdds)
    : bookOdds;

  // Use canonical EV calculation formula
  const decimal = americanOdds > 0 ? 1 + americanOdds/100 : 1 + 100/Math.abs(americanOdds);
  const profitIfWin = stake * (decimal - 1);
  const ev = trueProbability * profitIfWin - (1 - trueProbability) * stake;
  const evPercent = (ev / stake) * 100;

  const impliedProbability = getImpliedProbability(bookOdds, format);
  const payout = getPayout(bookOdds, format);

  return {
    ev,
    evPercent,
    isPositiveEV: ev > 0,
    impliedProbability,
    trueProbability,
    payout
  };
}

/**
 * Calculate arbitrage opportunity with optimal stake allocation
 */
export function calculateArbitrageDetailed(
  oddsA: OddsData,
  oddsB: OddsData,
  totalStake: number = 100
): ArbitrageResult {
  const probA = getImpliedProbability(oddsA.odds, oddsA.format);
  const probB = getImpliedProbability(oddsB.odds, oddsB.format);
  
  const arbPercent = probA + probB;
  const isArbitrage = arbPercent < 1;
  const profitMargin = isArbitrage ? ((1 - arbPercent) / arbPercent) * 100 : 0;
  
  let stake1 = 0;
  let stake2 = 0;
  let guaranteedProfit = 0;
  
  if (isArbitrage) {
    // Calculate optimal stake allocation
    const decimalA = oddsA.format === 'decimal' ? oddsA.odds : americanToDecimal(oddsA.odds);
    const decimalB = oddsB.format === 'decimal' ? oddsB.odds : americanToDecimal(oddsB.odds);
    
    stake1 = totalStake / (1 + (decimalA / decimalB));
    stake2 = totalStake - stake1;
    
    // Calculate guaranteed profit
    const payoutA = stake1 * decimalA;
    const payoutB = stake2 * decimalB;
    guaranteedProfit = Math.min(payoutA, payoutB) - totalStake;
  }
  
  return {
    isArbitrage,
    profitMargin,
    arbPercent,
    stake1,
    stake2,
    totalStake,
    guaranteedProfit
  };
}

/**
 * Calculate middling opportunity
 */
export function calculateMiddlingDetailed(
  line1: number,
  odds1: number,
  line2: number,
  odds2: number,
  middleProbability: number,
  stake: number = 100,
  format: 'american' | 'decimal' = 'american'
): MiddlingResult {
  const payout1 = getPayout(odds1, format);
  const payout2 = getPayout(odds2, format);
  
  // Calculate the middle range
  const middleRange = {
    min: Math.min(line1, line2),
    max: Math.max(line1, line2)
  };
  
  // If final score lands in middle → both bets win
  const doubleWinPayout = (stake * payout1) + (stake * payout2);
  
  // Otherwise → one wins, one loses
  const netLoss = stake - Math.max(stake * payout1, stake * payout2);
  
  // Expected value calculation
  const expectedValue = (middleProbability * doubleWinPayout) + ((1 - middleProbability) * netLoss);
  
  return {
    expectedValue,
    middleRange,
    middleHitProbability: middleProbability,
    doubleWinPayout,
    netLoss,
    isPositiveEV: expectedValue > 0
  };
}

/**
 * Remove vig from two-way market to get true probabilities
 */
export function removeVigTwoWay(
  odds1: number,
  odds2: number,
  format: 'american' | 'decimal' = 'american'
): { prob1: number; prob2: number; vigPercent: number } {
  const impliedProb1 = getImpliedProbability(odds1, format);
  const impliedProb2 = getImpliedProbability(odds2, format);
  
  const totalImplied = impliedProb1 + impliedProb2;
  const vigPercent = ((totalImplied - 1) / totalImplied) * 100;
  
  // Proportional de-vig
  const prob1 = impliedProb1 / totalImplied;
  const prob2 = impliedProb2 / totalImplied;
  
  return { prob1, prob2, vigPercent };
}

/**
 * Remove vig from three-way market (includes draw)
 */
export function removeVigThreeWay(
  odds1: number,
  odds2: number,
  odds3: number,
  format: 'american' | 'decimal' = 'american'
): { prob1: number; prob2: number; prob3: number; vigPercent: number } {
  const impliedProb1 = getImpliedProbability(odds1, format);
  const impliedProb2 = getImpliedProbability(odds2, format);
  const impliedProb3 = getImpliedProbability(odds3, format);
  
  const totalImplied = impliedProb1 + impliedProb2 + impliedProb3;
  const vigPercent = ((totalImplied - 1) / totalImplied) * 100;
  
  // Proportional de-vig
  const prob1 = impliedProb1 / totalImplied;
  const prob2 = impliedProb2 / totalImplied;
  const prob3 = impliedProb3 / totalImplied;
  
  return { prob1, prob2, prob3, vigPercent };
}

/**
 * Calculate Kelly Criterion for optimal bet sizing
 */
export function calculateKellyCriterion(
  odds: number,
  trueProbability: number,
  format: 'american' | 'decimal' = 'american'
): { kellyPercent: number; isRecommended: boolean } {
  const payout = getPayout(odds, format);
  
  // Kelly formula: f = (bp - q) / b
  // where b = payout, p = true probability, q = 1 - p
  const kellyPercent = ((payout * trueProbability) - (1 - trueProbability)) / payout * 100;
  
  return {
    kellyPercent: Math.max(0, kellyPercent), // Never bet negative Kelly
    isRecommended: kellyPercent > 0 && kellyPercent <= 25 // Conservative Kelly limit
  };
}

/**
 * Utility function to format percentage with proper sign
 */
export function formatPercent(value: number, decimals: number = 1): string {
  const formatted = value.toFixed(decimals);
  return value > 0 ? `+${formatted}%` : `${formatted}%`;
}

/**
 * Utility function to format currency
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  const formatted = Math.abs(value).toFixed(decimals);
  return value >= 0 ? `$${formatted}` : `-$${formatted}`;
}
