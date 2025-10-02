// Bet category types and classification utilities
export type BetCategory = 'all' | 'ev' | 'arbitrage' | 'middling' | 'player_props';

export interface CategorizedBettingOpportunity {
  category: BetCategory;
  arbitrageProfit?: number; // For arbitrage bets
  middlingRange?: { min: number; max: number }; // For middling bets
}

// Classification logic for betting opportunities
export class BetCategorizer {
  static categorizeBet(odds: number, impliedProbability: number, fairProbability: number): BetCategory {
    const ev = ((impliedProbability - fairProbability) / fairProbability) * 100;
    
    if (ev >= 3) {
      return 'ev';
    } else if (ev >= -2 && ev < 3) {
      return 'middling';
    } else if (ev < -2) {
      return 'arbitrage';
    } else {
      return 'ev';
    }
  }

  static getCategoryDescription(category: BetCategory): string {
    switch (category) {
      case 'all':
        return 'All betting opportunities';
      case 'ev':
        return 'Positive expected value bets';
      case 'arbitrage':
        return 'Arbitrage opportunities';
      case 'middling':
        return 'Middling opportunities';
      case 'player_props':
        return 'Player proposition bets';
      default:
        return 'Unknown category';
    }
  }

  static getCategoryColor(category: BetCategory): string {
    switch (category) {
      case 'ev':
        return 'bg-green-500 text-white';
      case 'arbitrage':
        return 'bg-blue-500 text-white';
      case 'middling':
        return 'bg-yellow-500 text-black';
      case 'player_props':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  }
}