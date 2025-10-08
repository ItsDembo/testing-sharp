/********************************************
 * CONSOLIDATED BETTING CALCULATIONS LIBRARY
 * Single source of truth for all EV, devigging, probability, and odds calculations
 * Used by: tradingTerminalService.ts, frontend components, calculators
 ********************************************/

import { americanToDecimal, decimalToAmerican, americanToImpliedProb, decimalToImpliedProb } from './oddsConversion.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface EVResult {
  evPercent: number;
  evDollars: number;
  profitIfWin: number;
  impliedProbability: number;
  isPositiveEV: boolean;
}

export interface DeviggingResult {
  fairProb1: number;  // Fair probability for side 1 (0-1)
  fairProb2: number;  // Fair probability for side 2 (0-1)
  fairOdds1: number;  // Fair American odds for side 1
  fairOdds2: number;  // Fair American odds for side 2
  originalVig: number; // Vig percentage removed
}

export interface FairLineResult {
  fairLine: string;  // Display string (e.g., "-3.5", "O 45.5")
  fairProbability: number; // Fair probability (0-1)
  method: 'model' | 'devig' | 'consensus' | 'none';
}

// ============================================================================
// CORE EV CALCULATION (from shared/lib/evCalculations.ts)
// ============================================================================

/**
 * Calculate Expected Value for a bet
 * EV% = ((Pwin * ProfitWin) - ((1-Pwin) * Stake)) / Stake * 100
 * 
 * @param bookOdds - American odds from sportsbook (e.g., -110, +150)
 * @param fairProbability - Fair win probability as decimal (0-1)
 * @param stake - Bet amount in dollars (default: 100)
 * @returns EVResult with evPercent, evDollars, profitIfWin, impliedProbability, isPositiveEV
 */
export function calculateEV(bookOdds: number, fairProbability: number, stake: number = 100): EVResult {
  if (!Number.isFinite(bookOdds)) {
    throw new Error('Invalid book odds');
  }
  if (!Number.isFinite(fairProbability) || fairProbability <= 0 || fairProbability >= 1) {
    throw new Error('Fair probability must be a decimal in (0,1)');
  }
  if (!Number.isFinite(stake) || stake <= 0) {
    throw new Error('Stake must be positive');
  }

  const decimal = americanToDecimal(bookOdds);
  const profitIfWin = stake * (decimal - 1);
  const lossIfLose = stake;

  // EV in dollars
  const evDollars = (fairProbability * profitIfWin) - ((1 - fairProbability) * lossIfLose);
  // EV as percent of stake
  const evPercent = (evDollars / stake) * 100;

  const impliedProbability = decimalToImpliedProb(decimal);

  return {
    evPercent,
    evDollars,
    profitIfWin,
    impliedProbability,
    isPositiveEV: evPercent > 0,
  };
}

/**
 * Convenience wrapper returning only EV%
 */
export function calculateEVPercent(bookOdds: number, fairProb: number, stake: number = 100): number {
  return calculateEV(bookOdds, fairProb, stake).evPercent;
}

// ============================================================================
// DEVIGGING - Remove sportsbook vig to find fair odds
// ============================================================================

/**
 * Devig a two-way market (e.g., spread, total, moneyline)
 * Removes the sportsbook's built-in margin to find true fair odds
 * 
 * @param decimalOdds1 - Decimal odds for side 1
 * @param decimalOdds2 - Decimal odds for side 2
 * @returns DeviggingResult with fair probabilities and odds for both sides
 */
export function devigTwoWayMarket(decimalOdds1: number, decimalOdds2: number): DeviggingResult {
  // Convert to implied probabilities
  const impliedProb1 = 1 / decimalOdds1;
  const impliedProb2 = 1 / decimalOdds2;

  // Calculate vig (overround)
  const total = impliedProb1 + impliedProb2;
  const originalVig = ((total - 1) * 100); // Convert to percentage

  // Normalize to get fair probabilities (proportional method)
  const fairProb1 = impliedProb1 / total;
  const fairProb2 = impliedProb2 / total;

  // Convert fair probabilities back to American odds
  const fairOdds1 = decimalToAmerican(1 / fairProb1);
  const fairOdds2 = decimalToAmerican(1 / fairProb2);

  return {
    fairProb1,
    fairProb2,
    fairOdds1,
    fairOdds2,
    originalVig,
  };
}

/**
 * Devig using American odds (convenience wrapper)
 */
export function devigTwoWayMarketAmerican(americanOdds1: number, americanOdds2: number): DeviggingResult {
  const decimal1 = americanToDecimal(americanOdds1);
  const decimal2 = americanToDecimal(americanOdds2);
  return devigTwoWayMarket(decimal1, decimal2);
}

/**
 * Get fair probability for one side of a two-way market after devigging
 * Returns probability for side 1
 */
export function getFairProbFromTwoWay(decimalOdds1: number, decimalOdds2: number): number {
  const result = devigTwoWayMarket(decimalOdds1, decimalOdds2);
  return result.fairProb1;
}

// ============================================================================
// PROBABILITY CALCULATIONS
// ============================================================================

/**
 * Calculate win probability from American odds (implied probability)
 * Returns as percentage (0-100)
 */
export function calculateWinProbability(americanOdds: number): number {
  if (!americanOdds || !Number.isFinite(americanOdds)) return 50;

  const impliedProb = americanToImpliedProb(americanOdds);
  return Math.round(impliedProb * 100 * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate implied probability from American odds
 * Returns as decimal (0-1)
 */
export function calculateImpliedProbability(americanOdds: number): number {
  return americanToImpliedProb(americanOdds);
}

/**
 * Calculate win probability from decimal odds
 * Returns as percentage (0-100)
 */
export function calculateWinProbabilityFromDecimal(decimalOdds: number): number {
  if (!decimalOdds || decimalOdds <= 1) return 50;
  return Math.round((1 / decimalOdds) * 100 * 10) / 10;
}

// ============================================================================
// FAIR LINE CALCULATION
// ============================================================================

/**
 * Calculate fair line for a market using available data
 * Priority: 1) Model projection, 2) Devigged odds, 3) Consensus
 * 
 * @param sideOdds - Odds for this side from multiple books
 * @param oppositeSideOdds - Odds for opposite side (for devigging)
 * @param modelFairProb - Optional: Sharp Shot model projection (0-1 or 0-100)
 * @param marketType - Type of market ('spread', 'total', 'moneyline')
 * @param line - The line value (e.g., -3.5 for spread, 45.5 for total)
 * @returns FairLineResult with display string and probability
 */
export function calculateFairLine(
  sideOdds: Array<{ american?: number; decimal?: number }>,
  oppositeSideOdds?: Array<{ american?: number; decimal?: number }>,
  modelFairProb?: number,
  marketType: 'spread' | 'total' | 'moneyline' = 'moneyline',
  line?: number
): FairLineResult {
  // Priority 1: Use model projection if available
  if (typeof modelFairProb === 'number' && Number.isFinite(modelFairProb)) {
    const prob = modelFairProb > 1 ? modelFairProb / 100 : modelFairProb;
    const fairOdds = decimalToAmerican(1 / prob);
    
    let fairLine = '';
    if (marketType === 'spread' && typeof line === 'number') {
      fairLine = line >= 0 ? `+${line}` : `${line}`;
    } else if (marketType === 'total' && typeof line === 'number') {
      fairLine = `O/U ${line}`;
    } else {
      fairLine = fairOdds >= 0 ? `+${fairOdds}` : `${fairOdds}`;
    }
    
    return {
      fairLine,
      fairProbability: prob,
      method: 'model'
    };
  }

  // Priority 2: Devig if we have both sides
  if (sideOdds && sideOdds.length > 0 && oppositeSideOdds && oppositeSideOdds.length > 0) {
    const bestSide = getBestOdds(sideOdds);
    const bestOpp = getBestOdds(oppositeSideOdds);
    
    if (bestSide && bestOpp) {
      const decimal1 = bestSide.decimal || americanToDecimal(bestSide.american!);
      const decimal2 = bestOpp.decimal || americanToDecimal(bestOpp.american!);
      
      const devigged = devigTwoWayMarket(decimal1, decimal2);
      const fairOdds = devigged.fairOdds1;
      
      let fairLine = '';
      if (marketType === 'spread' && typeof line === 'number') {
        fairLine = line >= 0 ? `+${line}` : `${line}`;
      } else if (marketType === 'total' && typeof line === 'number') {
        fairLine = `O/U ${line}`;
      } else {
        fairLine = fairOdds >= 0 ? `+${fairOdds}` : `${fairOdds}`;
      }
      
      return {
        fairLine,
        fairProbability: devigged.fairProb1,
        method: 'devig'
      };
    }
  }

  // Priority 3: Use consensus (median of available odds)
  if (sideOdds && sideOdds.length > 0) {
    const americanOdds = sideOdds
      .map(o => o.american || (o.decimal ? decimalToAmerican(o.decimal) : null))
      .filter((o): o is number => o !== null);
    
    if (americanOdds.length > 0) {
      const median = getMedian(americanOdds);
      const prob = calculateImpliedProbability(median);
      
      let fairLine = '';
      if (marketType === 'spread' && typeof line === 'number') {
        fairLine = line >= 0 ? `+${line}` : `${line}`;
      } else if (marketType === 'total' && typeof line === 'number') {
        fairLine = `O/U ${line}`;
      } else {
        fairLine = median >= 0 ? `+${median}` : `${median}`;
      }
      
      return {
        fairLine,
        fairProbability: prob,
        method: 'consensus'
      };
    }
  }

  // No data available
  return {
    fairLine: 'N/A',
    fairProbability: 0.5,
    method: 'none'
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get best odds (highest decimal) from array
 */
function getBestOdds(odds: Array<{ american?: number; decimal?: number }>): { american: number; decimal: number } | null {
  if (!odds || odds.length === 0) return null;

  let bestDecimal = 0;
  let bestAmerican = 0;

  for (const o of odds) {
    const decimal = o.decimal || (o.american ? americanToDecimal(o.american) : 0);
    if (decimal > bestDecimal) {
      bestDecimal = decimal;
      bestAmerican = o.american || decimalToAmerican(decimal);
    }
  }

  return bestDecimal > 0 ? { american: bestAmerican, decimal: bestDecimal } : null;
}

/**
 * Calculate median of array
 */
function getMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

