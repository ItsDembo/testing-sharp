/**
 * Comprehensive Betting Math Utilities
 * Handles all mathematical calculations for the trading terminal
 * Enhanced for accuracy and real-time trading
 */

export interface BettingMathResult {
  impliedProbability: number;
  trueProbability: number;
  vig: number;
  ev: number;
  fairOdds: number;
  category: 'ev' | 'arb' | 'mid' | 'neutral';
  arbitrageROI?: number;
  middlingSize?: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ArbitrageOpportunity {
  type: '2-way' | '3-way';
  roi: number;
  stakeSplit: number[];
  totalStake: number;
  guaranteedProfit: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface MiddlingOpportunity {
  size: number;
  potentialProfit: number;
  risk: number;
  breakEvenProbability: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Convert American odds to implied probability with enhanced precision
 */
export function americanToImpliedProbability(americanOdds: number): number {
  if (americanOdds === 0) throw new Error('Invalid odds: cannot be zero');
  
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

/**
 * Convert implied probability to American odds with proper rounding
 */
export function impliedProbabilityToAmerican(probability: number): number {
  if (probability <= 0 || probability >= 1) {
    throw new Error('Probability must be between 0 and 1');
  }
  
  if (probability >= 0.5) {
    return Math.round(-probability / (1 - probability) * 100);
  } else {
    return Math.round((1 - probability) / probability * 100);
  }
}

/**
 * Convert American odds to decimal odds
 */
export function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

/**
 * Convert decimal odds to American odds
 */
export function decimalToAmerican(decimalOdds: number): number {
  if (decimalOdds < 2) {
    return Math.round(-100 / (decimalOdds - 1));
  } else {
    return Math.round((decimalOdds - 1) * 100);
  }
}

/**
 * Calculate the vig (overround) from a set of odds with enhanced precision
 */
export function calculateVig(probabilities: number[]): number {
  if (probabilities.length === 0) return 0;
  
  const totalProbability = probabilities.reduce((sum, prob) => sum + prob, 0);
  return Math.max(0, totalProbability - 1);
}

/**
 * Remove vig to get true probabilities using improved normalization
 */
export function removeVig(probabilities: number[]): number[] {
  if (probabilities.length === 0) return [];
  
  const vig = calculateVig(probabilities);
  if (vig <= 0.001) return probabilities; // No significant vig
  
  const totalProbability = probabilities.reduce((sum, prob) => sum + prob, 0);
  return probabilities.map(prob => prob / totalProbability);
}

/**
 * Calculate Expected Value (EV) with enhanced precision
 * @deprecated Use calculateEV from @shared/lib/evCalculations for canonical EV calculation
 */
export function calculateEV(bookOdds: number, trueProbability: number): number {
  if (trueProbability <= 0 || trueProbability >= 1) {
    throw new Error('True probability must be between 0 and 1');
  }

  // Use canonical EV calculation from shared library
  try {
    const { calculateEV: canonicalCalculateEV } = require('@shared/lib/evCalculations');
    const result = canonicalCalculateEV(bookOdds, trueProbability, 100);
    // Return as percentage (already in percentage from canonical)
    return result.evPercent;
  } catch {
    // Fallback to inline calculation if import fails
    const payout = bookOdds > 0 ? (bookOdds / 100) + 1 : (100 / Math.abs(bookOdds)) + 1;
    const ev = (trueProbability * payout) - 1;
    return Math.round(ev * 10000) / 100;
  }
}

/**
 * Calculate EV with decimal odds for more precision
 * @deprecated Use calculateEV from @shared/lib/evCalculations for canonical EV calculation
 */
export function calculateEVWithDecimal(decimalOdds: number, trueProbability: number): number {
  if (trueProbability <= 0 || trueProbability >= 1) {
    throw new Error('True probability must be between 0 and 1');
  }

  // Use canonical EV calculation from shared library
  try {
    const { calculateEV: canonicalCalculateEV, decimalToAmerican } = require('@shared/lib/evCalculations');
    const americanOdds = decimalToAmerican(decimalOdds);
    const result = canonicalCalculateEV(americanOdds, trueProbability, 100);
    return result.evPercent;
  } catch {
    // Fallback to inline calculation
    const ev = (trueProbability * decimalOdds) - 1;
    return Math.round(ev * 10000) / 100;
  }
}

/**
 * Enhanced 2-way arbitrage detection with confidence scoring
 */
export function detectArbitrage2Way(odds1: number, odds2: number): ArbitrageOpportunity | null {
  const prob1 = americanToImpliedProbability(odds1);
  const prob2 = americanToImpliedProbability(odds2);
  
  const totalProbability = prob1 + prob2;
  
  if (totalProbability < 0.99) { // More conservative threshold
    // Arbitrage opportunity exists
    const roi = (1 - totalProbability) / totalProbability;
    const stake1 = 100 / (1 + (prob1 / prob2));
    const stake2 = 100 - stake1;
    
    // Calculate confidence based on ROI and probability gap
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (roi > 0.05) confidence = 'high';
    else if (roi > 0.02) confidence = 'medium';
    
    return {
      type: '2-way',
      roi: Math.round(roi * 10000) / 100,
      stakeSplit: [Math.round(stake1 * 100) / 100, Math.round(stake2 * 100) / 100],
      totalStake: 100,
      guaranteedProfit: Math.round(roi * 100 * 100) / 100,
      confidence
    };
  }
  
  return null;
}

/**
 * Enhanced 3-way arbitrage detection
 */
export function detectArbitrage3Way(odds1: number, odds2: number, odds3: number): ArbitrageOpportunity | null {
  const prob1 = americanToImpliedProbability(odds1);
  const prob2 = americanToImpliedProbability(odds2);
  const prob3 = americanToImpliedProbability(odds3);
  
  const totalProbability = prob1 + prob2 + prob3;
  
  if (totalProbability < 0.99) {
    const roi = (1 - totalProbability) / totalProbability;
    const stake1 = 100 / (1 + (prob1 / prob2) + (prob1 / prob3));
    const stake2 = 100 / (1 + (prob2 / prob1) + (prob2 / prob3));
    const stake3 = 100 - stake1 - stake2;
    
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (roi > 0.05) confidence = 'high';
    else if (roi > 0.02) confidence = 'medium';
    
    return {
      type: '3-way',
      roi: Math.round(roi * 10000) / 100,
      stakeSplit: [
        Math.round(stake1 * 100) / 100,
        Math.round(stake2 * 100) / 100,
        Math.round(stake3 * 100) / 100
      ],
      totalStake: 100,
      guaranteedProfit: Math.round(roi * 100 * 100) / 100,
      confidence
    };
  }
  
  return null;
}

/**
 * Enhanced middling opportunity detection
 */
export function detectMiddling(
  line1: number,
  line2: number,
  odds1: number,
  odds2: number
): MiddlingOpportunity | null {
  if (line1 >= line2) return null;
  
  const middleSize = line2 - line1;
  if (middleSize <= 0.1) return null; // Minimum middle size
  
  const prob1 = americanToImpliedProbability(odds1);
  const prob2 = americanToImpliedProbability(odds2);
  
  // Enhanced middling calculation
  const potentialProfit = (prob1 + prob2 - 1) * 100;
  const risk = Math.max(prob1, prob2) * 100;
  const breakEvenProbability = 1 - (potentialProfit / 100);
  
  if (potentialProfit > 0.5) { // Minimum profit threshold
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (potentialProfit > 2) confidence = 'high';
    else if (potentialProfit > 1) confidence = 'medium';
    
    return {
      size: Math.round(middleSize * 10) / 10,
      potentialProfit: Math.round(potentialProfit * 100) / 100,
      risk: Math.round(risk * 100) / 100,
      breakEvenProbability: Math.round(breakEvenProbability * 10000) / 100,
      confidence
    };
  }
  
  return null;
}

/**
 * Main function to analyze betting opportunities with enhanced accuracy
 */
export function analyzeBettingOpportunity(
  bookOdds: number,
  marketOdds: number[],
  marketType: 'moneyline' | 'spread' | 'total' | 'player_props' = 'moneyline'
): BettingMathResult {
  // Calculate implied probability from book odds
  const impliedProbability = americanToImpliedProbability(bookOdds);
  
  // Calculate market probabilities and remove vig
  const marketProbabilities = marketOdds.map(odds => americanToImpliedProbability(odds));
  const trueProbabilities = removeVig(marketProbabilities);
  
  // Enhanced true probability calculation
  let trueProbability: number;
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  
  if (marketType === 'moneyline' || marketType === 'spread') {
    // For 2-way markets, use market efficiency
    const marketProb = trueProbabilities.reduce((sum, prob) => sum + prob, 0) / trueProbabilities.length;
    trueProbability = 1 - marketProb;
    
    // Confidence based on market size
    if (marketOdds.length >= 5) confidence = 'high';
    else if (marketOdds.length >= 3) confidence = 'medium';
    else confidence = 'low';
  } else if (marketType === 'total') {
    // For totals, use weighted average
    trueProbability = trueProbabilities.reduce((sum, prob) => sum + prob, 0) / trueProbabilities.length;
    
    if (marketOdds.length >= 4) confidence = 'high';
    else if (marketOdds.length >= 2) confidence = 'medium';
    else confidence = 'low';
  } else {
    // For player props, use market average
    trueProbability = trueProbabilities.reduce((sum, prob) => sum + prob, 0) / trueProbabilities.length;
    confidence = marketOdds.length >= 3 ? 'medium' : 'low';
  }
  
  // Calculate vig
  const vig = calculateVig(marketProbabilities);
  
  // Calculate EV with enhanced precision
  const ev = calculateEV(bookOdds, trueProbability);
  
  // Calculate fair odds
  const fairOdds = impliedProbabilityToAmerican(trueProbability);
  
  // Enhanced category determination
  let category: 'ev' | 'arb' | 'mid' | 'neutral' = 'neutral';
  
  if (ev >= 5) {
    category = 'ev';
  } else if (ev >= 2) {
    category = 'ev';
  } else if (ev >= 0) {
    category = 'ev';
  }
  
  // Check for arbitrage opportunities
  if (marketOdds.length >= 2) {
    const arb2Way = detectArbitrage2Way(marketOdds[0], marketOdds[1]);
    if (arb2Way && arb2Way.roi > 1) {
      category = 'arb';
    }
  }
  
  return {
    impliedProbability: Math.round(impliedProbability * 10000) / 100,
    trueProbability: Math.round(trueProbability * 10000) / 100,
    vig: Math.round(vig * 10000) / 100,
    ev: ev,
    fairOdds: fairOdds,
    category: category,
    confidence
  };
}

/**
 * Calculate Kelly Criterion for optimal bet sizing with enhanced precision
 */
export function calculateKellyCriterion(ev: number, bookOdds: number): number {
  if (ev <= 0) return 0;
  
  const payout = bookOdds > 0 ? (bookOdds / 100) + 1 : (100 / Math.abs(bookOdds)) + 1;
  const winProbability = 1 / payout;
  
  const kelly = (ev * winProbability) / (payout - 1);
  return Math.max(0, Math.min(kelly, 0.25)); // Cap at 25% of bankroll
}

/**
 * Calculate optimal bet size based on bankroll and confidence
 */
export function calculateOptimalBetSize(
  bankroll: number,
  ev: number,
  confidence: 'high' | 'medium' | 'low',
  maxBetPercentage: number = 0.05
): number {
  if (ev <= 0) return 0;
  
  const baseBet = bankroll * maxBetPercentage;
  const confidenceMultiplier = confidence === 'high' ? 1.0 : confidence === 'medium' ? 0.7 : 0.4;
  const evMultiplier = Math.min(ev / 10, 2); // Cap EV multiplier at 2x
  
  return Math.round(baseBet * confidenceMultiplier * evMultiplier * 100) / 100;
}

/**
 * Format EV for display with enhanced precision
 */
export function formatEV(ev: number): string {
  if (ev >= 0) {
    return `+${ev.toFixed(2)}%`;
  }
  return `${ev.toFixed(2)}%`;
}

/**
 * Format probability for display with enhanced precision
 */
export function formatProbability(probability: number): string {
  return `${(probability * 100).toFixed(2)}%`;
}

/**
 * Get category color for UI with enhanced styling
 */
export function getCategoryColor(category: string): string {
  switch (category) {
    case 'ev':
      return 'text-green-500 font-semibold';
    case 'arb':
      return 'text-blue-500 font-semibold';
    case 'mid':
      return 'text-yellow-500 font-semibold';
    default:
      return 'text-slate-400';
  }
}

/**
 * Get confidence indicator for UI
 */
export function getConfidenceIndicator(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return '🟢';
    case 'medium':
      return '🟡';
    case 'low':
      return '🔴';
    default:
      return '⚪';
  }
}

/**
 * Validate odds for data integrity
 */
export function validateOdds(odds: number): boolean {
  return odds !== null && 
         odds !== undefined && 
         !isNaN(odds) && 
         odds !== 0 && 
         odds > -10000 && 
         odds < 10000;
}

/**
 * Calculate market efficiency score
 */
export function calculateMarketEfficiency(marketOdds: number[]): number {
  if (marketOdds.length < 2) return 0;
  
  const probabilities = marketOdds.map(odds => americanToImpliedProbability(odds));
  const mean = probabilities.reduce((sum, prob) => sum + prob, 0) / probabilities.length;
  const variance = probabilities.reduce((sum, prob) => sum + Math.pow(prob - mean, 2), 0) / probabilities.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Lower standard deviation = more efficient market
  return Math.max(0, 100 - (standardDeviation * 1000));
}
