/**
 * Comprehensive Betting Mathematics Implementation
 * 
 * This module implements the exact mathematical approach for:
 * 1. Converting odds to implied probability
 * 2. Removing vig (market overround) 
 * 3. Calculating fair probabilities
 * 4. Computing Expected Value (EV)
 * 5. Converting between odds formats
 */

export interface SportsbookOdds {
  book: string;
  odds: number; // American odds
  url?: string;
  lastUpdated?: string;
}

export interface MarketData {
  homeOdds: SportsbookOdds[];
  awayOdds: SportsbookOdds[];
  overOdds?: SportsbookOdds[];
  underOdds?: SportsbookOdds[];
}

export interface FairOddsResult {
  fairProbability: number;
  fairOddsDecimal: number;
  fairOddsAmerican: number;
  originalVig: number;
  impliedProbability: number;
}

export interface EVCalculation {
  evPercent: number;
  evDecimal: number;
  payout: number;
  fairProbability: number;
  impliedProbability: number;
}

/**
 * Step 1: Convert American odds to implied probability
 */
export function oddsToImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else if (americanOdds < 0) {
    return (-americanOdds) / (-americanOdds + 100);
  } else {
    throw new Error('Invalid odds: cannot be zero');
  }
}

/**
 * Step 2 & 3: Remove vig and normalize probabilities for a two-way market
 */
export function removeVigTwoWay(
  odds1: number, 
  odds2: number
): { fairProb1: number; fairProb2: number; originalVig: number } {
  // Convert to implied probabilities
  const impliedProb1 = oddsToImpliedProbability(odds1);
  const impliedProb2 = oddsToImpliedProbability(odds2);
  
  // Sum the probabilities (should be > 1.0 due to vig)
  const totalImplied = impliedProb1 + impliedProb2;
  
  // Calculate the vig (overround)
  const originalVig = (totalImplied - 1.0) * 100; // Convert to percentage
  
  // Normalize to remove vig
  const fairProb1 = impliedProb1 / totalImplied;
  const fairProb2 = impliedProb2 / totalImplied;
  
  return {
    fairProb1,
    fairProb2,
    originalVig
  };
}

/**
 * Step 2 & 3: Remove vig for three-way markets (like totals with multiple outcomes)
 */
export function removeVigThreeWay(
  odds1: number,
  odds2: number, 
  odds3: number
): { fairProb1: number; fairProb2: number; fairProb3: number; originalVig: number } {
  const impliedProb1 = oddsToImpliedProbability(odds1);
  const impliedProb2 = oddsToImpliedProbability(odds2);
  const impliedProb3 = oddsToImpliedProbability(odds3);
  
  const totalImplied = impliedProb1 + impliedProb2 + impliedProb3;
  const originalVig = (totalImplied - 1.0) * 100;
  
  return {
    fairProb1: impliedProb1 / totalImplied,
    fairProb2: impliedProb2 / totalImplied,
    fairProb3: impliedProb3 / totalImplied,
    originalVig
  };
}

/**
 * Step 4: Convert fair probability back to fair odds
 */
export function probabilityToDecimalOdds(probability: number): number {
  if (probability <= 0 || probability >= 1) {
    throw new Error('Probability must be between 0 and 1');
  }
  return 1 / probability;
}

export function decimalToAmericanOdds(decimalOdds: number): number {
  if (decimalOdds >= 2.0) {
    return (decimalOdds - 1) * 100;
  } else {
    return -100 / (decimalOdds - 1);
  }
}

export function probabilityToAmericanOdds(probability: number): number {
  const decimal = probabilityToDecimalOdds(probability);
  return decimalToAmericanOdds(decimal);
}

/**
 * Step 5: Calculate payout multiple for $1 stake
 */
export function calculatePayout(americanOdds: number): number {
  if (americanOdds > 0) {
    return americanOdds / 100;
  } else if (americanOdds < 0) {
    return 100 / (-americanOdds);
  } else {
    throw new Error('Invalid odds: cannot be zero');
  }
}

/**
 * Step 5 & 6: Calculate Expected Value
 * @deprecated Use calculateEV from @shared/lib/evCalculations for canonical EV calculation
 */
export function calculateEV(
  sportsbookOdds: number,
  fairProbability: number
): EVCalculation {
  // Use canonical EV calculation from shared library
  const { calculateEV: canonicalCalculateEV } = require('../../shared/lib/evCalculations');
  const result = canonicalCalculateEV(sportsbookOdds, fairProbability, 100);

  const payout = calculatePayout(sportsbookOdds);
  const impliedProbability = oddsToImpliedProbability(sportsbookOdds);

  return {
    evPercent: result.evPercent,
    evDecimal: result.evPercent / 100,
    payout,
    fairProbability,
    impliedProbability
  };
}

/**
 * Comprehensive market analysis for a two-way market (moneyline, spread)
 */
export function analyzeTwoWayMarket(
  sportsbookOdds: SportsbookOdds[],
  side: 'home' | 'away' = 'home'
): {
  bestOdds: SportsbookOdds;
  fairOdds: FairOddsResult;
  evCalculations: Array<SportsbookOdds & EVCalculation>;
  consensus: {
    avgOdds: number;
    medianOdds: number;
    count: number;
  };
} {
  if (sportsbookOdds.length < 2) {
    throw new Error('Need at least 2 sportsbooks for market analysis');
  }
  
  // Find best odds (highest positive, least negative)
  const bestOdds = sportsbookOdds.reduce((best, current) => {
    if (current.odds > 0 && best.odds > 0) {
      return current.odds > best.odds ? current : best;
    } else if (current.odds < 0 && best.odds < 0) {
      return current.odds > best.odds ? current : best;
    } else if (current.odds > 0) {
      return current;
    } else {
      return best;
    }
  });
  
  // Calculate consensus
  const allOdds = sportsbookOdds.map(book => book.odds);
  const avgOdds = allOdds.reduce((sum, odds) => sum + odds, 0) / allOdds.length;
  const sortedOdds = [...allOdds].sort((a, b) => a - b);
  const medianOdds = sortedOdds[Math.floor(sortedOdds.length / 2)];
  
  // Use consensus odds to calculate fair probability (using best and worst for vig removal)
  const worstOdds = sportsbookOdds.reduce((worst, current) => {
    if (current.odds > 0 && worst.odds > 0) {
      return current.odds < worst.odds ? current : worst;
    } else if (current.odds < 0 && worst.odds < 0) {
      return current.odds < worst.odds ? current : worst;
    } else if (current.odds < 0) {
      return current;
    } else {
      return worst;
    }
  });
  
  // For a two-way market, we need the opposing side to calculate fair probability
  // We'll estimate the opposing side using market consensus
  const avgImplied = oddsToImpliedProbability(avgOdds);
  const opposingImplied = 1 - avgImplied; // Rough estimate
  const opposingOdds = probabilityToAmericanOdds(opposingImplied);
  
  const vigRemoval = removeVigTwoWay(avgOdds, opposingOdds);
  const fairProbability = side === 'home' ? vigRemoval.fairProb1 : vigRemoval.fairProb2;
  
  const fairOdds: FairOddsResult = {
    fairProbability,
    fairOddsDecimal: probabilityToDecimalOdds(fairProbability),
    fairOddsAmerican: probabilityToAmericanOdds(fairProbability),
    originalVig: vigRemoval.originalVig,
    impliedProbability: avgImplied
  };
  
  // Calculate EV for each sportsbook
  const evCalculations = sportsbookOdds.map(book => ({
    ...book,
    ...calculateEV(book.odds, fairProbability)
  }));
  
  return {
    bestOdds,
    fairOdds,
    evCalculations,
    consensus: {
      avgOdds: Math.round(avgOdds),
      medianOdds: Math.round(medianOdds),
      count: sportsbookOdds.length
    }
  };
}

/**
 * Comprehensive market analysis for markets with both sides (moneyline, spread, total)
 */
export function analyzeFullMarket(
  homeOdds: SportsbookOdds[],
  awayOdds: SportsbookOdds[]
): {
  home: ReturnType<typeof analyzeTwoWayMarket>;
  away: ReturnType<typeof analyzeTwoWayMarket>;
  marketVig: number;
  fairProbabilities: {
    home: number;
    away: number;
  };
} {
  // Find consensus odds for both sides
  const homeConsensus = homeOdds.reduce((sum, book) => sum + book.odds, 0) / homeOdds.length;
  const awayConsensus = awayOdds.reduce((sum, book) => sum + book.odds, 0) / awayOdds.length;
  
  // Remove vig using consensus odds
  const vigRemoval = removeVigTwoWay(homeConsensus, awayConsensus);
  
  // Analyze each side using the fair probabilities
  const homeAnalysis = {
    ...analyzeTwoWayMarket(homeOdds, 'home'),
    fairOdds: {
      ...analyzeTwoWayMarket(homeOdds, 'home').fairOdds,
      fairProbability: vigRemoval.fairProb1,
      fairOddsDecimal: probabilityToDecimalOdds(vigRemoval.fairProb1),
      fairOddsAmerican: probabilityToAmericanOdds(vigRemoval.fairProb1)
    }
  };
  
  const awayAnalysis = {
    ...analyzeTwoWayMarket(awayOdds, 'away'),
    fairOdds: {
      ...analyzeTwoWayMarket(awayOdds, 'away').fairOdds,
      fairProbability: vigRemoval.fairProb2,
      fairOddsDecimal: probabilityToDecimalOdds(vigRemoval.fairProb2),
      fairOddsAmerican: probabilityToAmericanOdds(vigRemoval.fairProb2)
    }
  };
  
  // Recalculate EV with proper fair probabilities
  homeAnalysis.evCalculations = homeOdds.map(book => ({
    ...book,
    ...calculateEV(book.odds, vigRemoval.fairProb1)
  }));
  
  awayAnalysis.evCalculations = awayOdds.map(book => ({
    ...book,
    ...calculateEV(book.odds, vigRemoval.fairProb2)
  }));
  
  return {
    home: homeAnalysis,
    away: awayAnalysis,
    marketVig: vigRemoval.originalVig,
    fairProbabilities: {
      home: vigRemoval.fairProb1,
      away: vigRemoval.fairProb2
    }
  };
}

/**
 * Helper function to format odds for display
 */
export function formatOdds(odds: number): string {
  if (odds > 0) {
    return `+${odds}`;
  } else {
    return odds.toString();
  }
}

/**
 * Helper function to format probability as percentage
 */
export function formatProbability(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`;
}

/**
 * Helper function to format EV percentage
 */
export function formatEV(evPercent: number): string {
  const sign = evPercent >= 0 ? '+' : '';
  return `${sign}${evPercent.toFixed(1)}%`;
}
