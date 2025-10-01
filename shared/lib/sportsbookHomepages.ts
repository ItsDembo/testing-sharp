/**
 * Sportsbook Homepage URLs
 * 
 * Simple mapping of sportsbook names to their homepage URLs.
 * Used for direct linking to betting company homepages.
 */

export const SPORTSBOOK_HOMEPAGES: Record<string, string> = {
  // Major US Sportsbooks
  'DraftKings': 'https://sportsbook.draftkings.com',
  'FanDuel': 'https://sportsbook.fanduel.com',
  'BetMGM': 'https://sports.betmgm.com',
  'MGM': 'https://sports.betmgm.com',
  'Caesars': 'https://sportsbook.caesars.com',
  'ESPN BET': 'https://espnbet.com',
  'ESPN Bet': 'https://espnbet.com',
  'ESPNBET': 'https://espnbet.com',
  'Fanatics': 'https://www.fanaticssportsbook.com',
  'BetRivers': 'https://www.betrivers.com',
  'PointsBet': 'https://pointsbet.com',
  'Unibet': 'https://unibet.com/us',
  'William Hill': 'https://williamhill.us',
  'WilliamHill': 'https://williamhill.us',
  'SugarHouse': 'https://www.sugarhouse.com',
  'Sugar House': 'https://www.sugarhouse.com',
  
  // International Sportsbooks
  'Bet365': 'https://www.bet365.com',
  'BET365': 'https://www.bet365.com',
  'Sports Interaction': 'https://www.sportsinteraction.com',
  'SportsInteraction': 'https://www.sportsinteraction.com',
  'SportingBet': 'https://www.sportingbet.com',
  'Sporting Bet': 'https://www.sportingbet.com',
  
  // Other Sportsbooks
  'Bovada': 'https://www.bovada.lv',
  'BetOnline': 'https://www.betonline.ag',
  'Barstool': 'https://www.barstoolsportsbook.com',
  'WynnBET': 'https://www.wynnbet.com',
  'Hard Rock': 'https://www.hardrocksportsbook.com',
  'SuperBook': 'https://www.superbook.com',
  'Betway': 'https://betway.com',
  'PuntNow': 'https://puntnow.com',
  'Sportszino': 'https://sportszino.com',
  'SportTrade': 'https://sporttrade.com'
};

/**
 * Get homepage URL for a sportsbook
 * @param sportsbook - The sportsbook name
 * @returns Homepage URL or fallback to Google search
 */
export function getSportsbookHomepage(sportsbook: string): string {
  // Try exact match first
  const homepage = SPORTSBOOK_HOMEPAGES[sportsbook];
  if (homepage) {
    return homepage;
  }
  
  // Try case-insensitive match
  const normalizedSportsbook = sportsbook.toLowerCase();
  for (const [key, url] of Object.entries(SPORTSBOOK_HOMEPAGES)) {
    if (key.toLowerCase() === normalizedSportsbook) {
      return url;
    }
  }
  
  // Try partial match (for variations like "BetRivers PA", "DraftKings NY", etc.)
  for (const [key, url] of Object.entries(SPORTSBOOK_HOMEPAGES)) {
    if (normalizedSportsbook.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedSportsbook)) {
      return url;
    }
  }
  
  // Fallback to Google search
  return `https://www.google.com/search?q=${encodeURIComponent(sportsbook)}+sportsbook`;
}
