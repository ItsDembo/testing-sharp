/**
 * EV Color Scheme Utility
 * Improved color scheme for EV percentages:
 * Very negative: dark red, Negative: red, Near zero: orange/yellow, 
 * Low positive: light green, Good positive: green, Excellent: bright green
 */
export function evColorClass(evPct: number): string {
  if (evPct < -10) return "text-red-700 font-bold"; // Very bad EV
  if (evPct < -5) return "text-red-600"; // Bad EV
  if (evPct < -1) return "text-red-500"; // Negative EV
  if (evPct < 0) return "text-orange-600"; // Slightly negative
  if (evPct < 1) return "text-orange-500"; // Very low positive
  if (evPct < 3) return "text-yellow-500"; // Low positive
  if (evPct < 5) return "text-green-400"; // Good positive
  if (evPct < 10) return "text-green-500"; // Very good positive
  return "text-green-600 font-bold"; // Excellent positive
}

/**
 * Get available providers from odds data structure
 * Dynamically extracts provider names from the odds payload
 */
export function getAvailableProviders(oddsData: any): string[] {
  if (!oddsData) return [];
  
  const providers = new Set<string>();
  
  // Extract from moneyline odds
  if (oddsData.moneyline) {
    if (oddsData.moneyline.away) {
      Object.keys(oddsData.moneyline.away).forEach(provider => {
        if (provider !== 'CONSENSUS' && Number.isFinite(oddsData.moneyline.away[provider])) {
          providers.add(provider);
        }
      });
    }
    if (oddsData.moneyline.home) {
      Object.keys(oddsData.moneyline.home).forEach(provider => {
        if (provider !== 'CONSENSUS' && Number.isFinite(oddsData.moneyline.home[provider])) {
          providers.add(provider);
        }
      });
    }
  }
  
  // Extract from spread odds
  if (oddsData.spread) {
    if (oddsData.spread.away) {
      Object.keys(oddsData.spread.away).forEach(provider => {
        if (provider !== 'CONSENSUS' && Number.isFinite(oddsData.spread.away[provider])) {
          providers.add(provider);
        }
      });
    }
    if (oddsData.spread.home) {
      Object.keys(oddsData.spread.home).forEach(provider => {
        if (provider !== 'CONSENSUS' && Number.isFinite(oddsData.spread.home[provider])) {
          providers.add(provider);
        }
      });
    }
  }
  
  // Extract from total odds
  if (oddsData.total) {
    if (oddsData.total.over) {
      Object.keys(oddsData.total.over).forEach(provider => {
        if (provider !== 'CONSENSUS' && Number.isFinite(oddsData.total.over[provider])) {
          providers.add(provider);
        }
      });
    }
    if (oddsData.total.under) {
      Object.keys(oddsData.total.under).forEach(provider => {
        if (provider !== 'CONSENSUS' && Number.isFinite(oddsData.total.under[provider])) {
          providers.add(provider);
        }
      });
    }
  }
  
  return Array.from(providers).sort();
}

/**
 * Get odds for a specific provider and market
 */
export function getProviderOdds(oddsData: any, provider: string, market: string, side: string): number | null {
  if (!oddsData || !provider || !market || !side) return null;
  
  const marketData = oddsData[market.toLowerCase()];
  if (!marketData) return null;
  
  const sideData = marketData[side.toLowerCase()];
  if (!sideData) return null;
  
  const odds = sideData[provider];
  return Number.isFinite(odds) ? odds : null;
}

/**
 * Filter field odds to only show providers with valid prices
 */
export function filterValidFieldOdds(fieldOdds: any[], primaryBook: string): any[] {
  return fieldOdds.filter(({ book, price }) => 
    book !== primaryBook && Number.isFinite(price)
  );
}
