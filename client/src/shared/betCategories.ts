export type BetCategory = 'all' | 'ev' | 'arb' | 'mid' | 'neutral';

export interface BetCategorizer {
  categorize(opportunity: any): BetCategory;
}

export class DefaultBetCategorizer implements BetCategorizer {
  categorize(opportunity: any): BetCategory {
    if (!opportunity) return 'neutral';
    
    // If category is already set, use it
    if (opportunity.category && ['ev', 'arb', 'mid', 'neutral'].includes(opportunity.category)) {
      return opportunity.category;
    }
    
    // Categorize based on EV percentage
    if (opportunity.evPercent >= 3) {
      return 'ev';
    }
    
    // Check for arbitrage opportunities
    if (opportunity.arbitrageInfo && opportunity.arbitrageInfo.roi > 1) {
      return 'arb';
    }
    
    // Check for middling opportunities
    if (opportunity.middlingInfo && opportunity.middlingInfo.potentialProfit > 0) {
      return 'mid';
    }
    
    // Default to neutral if no clear category
    return 'neutral';
  }
}
