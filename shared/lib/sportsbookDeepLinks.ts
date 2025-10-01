/**
 * Sportsbook Deep Linking System
 * 
 * Generates direct links to specific props on each sportsbook's website.
 * Each sportsbook has a different URL structure, so we handle them individually.
 */

export interface BetDetails {
  gameID: string;
  sport: string; // 'NHL', 'NBA', 'NFL', 'MLB', 'SOCCER', etc.
  league?: string;
  homeTeam: string;
  awayTeam: string;
  market: string; // 'Moneyline', 'Spread', 'Total', 'Player Prop'
  prop: string; // Full prop description (e.g., "Bruins ML", "Over 6.5", "Connor McDavid Over 0.5 Points")
  playerName?: string; // For player props
  line?: number; // For spreads and totals
  isLive?: boolean;
}

/**
 * Normalize team names for URL construction
 * Removes special characters, converts to lowercase, replaces spaces with hyphens
 */
function normalizeTeamName(team: string): string {
  return team
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .trim()
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
}

/**
 * Normalize sport names for URL construction
 */
function normalizeSport(sport: string): string {
  const sportMap: Record<string, string> = {
    'NHL': 'hockey',
    'NBA': 'basketball',
    'NFL': 'football',
    'MLB': 'baseball',
    'SOCCER': 'soccer',
    'NCAA BK': 'basketball',
    'NCAA FB': 'football',
    'TENNIS': 'tennis',
    'GOLF': 'golf',
    'MMA': 'mma',
    'BOXING': 'boxing'
  };
  return sportMap[sport.toUpperCase()] || sport.toLowerCase();
}

/**
 * Generate deep link for DraftKings
 * Example: https://sportsbook.draftkings.com/leagues/hockey/nhl?category=game-lines&subcategory=game
 */
function generateDraftKingsLink(bet: BetDetails): string {
  const sport = normalizeSport(bet.sport);
  const league = bet.league?.toLowerCase() || bet.sport.toLowerCase();
  
  // DraftKings uses a category-based system
  let category = 'game-lines';
  if (bet.market === 'Player Prop') {
    category = 'player-props';
  }
  
  // Try to construct a deep link, but DK's URLs are complex and often require event IDs
  // For now, we'll link to the league page with the right category
  return `https://sportsbook.draftkings.com/leagues/${sport}/${league}?category=${category}`;
}

/**
 * Generate deep link for FanDuel
 * Example: https://sportsbook.fanduel.com/navigation/nhl
 */
function generateFanDuelLink(bet: BetDetails): string {
  const sport = normalizeSport(bet.sport);
  const league = bet.league?.toLowerCase() || bet.sport.toLowerCase();
  
  // FanDuel uses navigation-based URLs
  return `https://sportsbook.fanduel.com/navigation/${league}`;
}

/**
 * Generate deep link for BetMGM
 * Example: https://sports.betmgm.com/en/sports/hockey-12/betting/usa-9/nhl-34
 */
function generateBetMGMLink(bet: BetDetails): string {
  const sport = normalizeSport(bet.sport);
  
  // BetMGM uses sport IDs, but we don't have them, so link to sport homepage
  return `https://sports.betmgm.com/en/sports/${sport}`;
}

/**
 * Generate deep link for Bet365
 * Example: https://www.bet365.com/#/HO/
 */
function generateBet365Link(bet: BetDetails): string {
  // Bet365 uses complex internal IDs that we don't have access to
  // Link to homepage for now
  return 'https://www.bet365.com/#/HO/';
}

/**
 * Generate deep link for BetRivers
 * Example: https://www.betrivers.com/online-sportsbook
 */
function generateBetRiversLink(bet: BetDetails): string {
  const sport = normalizeSport(bet.sport);
  
  // BetRivers has a simpler structure
  return `https://www.betrivers.com/online-sportsbook/${sport}`;
}

/**
 * Generate deep link for ESPN Bet
 * Example: https://espnbet.com/sport/hockey/league/nhl
 */
function generateESPNBetLink(bet: BetDetails): string {
  const sport = normalizeSport(bet.sport);
  const league = bet.league?.toLowerCase() || bet.sport.toLowerCase();
  
  return `https://espnbet.com/sport/${sport}/league/${league}`;
}

/**
 * Generate deep link for Fanatics
 * Example: https://www.fanaticssportsbook.com/sports/hockey/nhl
 */
function generateFanaticsLink(bet: BetDetails): string {
  const sport = normalizeSport(bet.sport);
  const league = bet.league?.toLowerCase() || bet.sport.toLowerCase();
  
  return `https://www.fanaticssportsbook.com/sports/${sport}/${league}`;
}

/**
 * Generate deep link for Caesars
 * Example: https://sportsbook.caesars.com/us/bet/hockey/nhl
 */
function generateCaesarsLink(bet: BetDetails): string {
  const sport = normalizeSport(bet.sport);
  const league = bet.league?.toLowerCase() || bet.sport.toLowerCase();
  
  return `https://sportsbook.caesars.com/us/bet/${sport}/${league}`;
}

/**
 * Generate deep link for William Hill
 * Example: https://williamhill.us/sports/hockey/nhl
 */
function generateWilliamHillLink(bet: BetDetails): string {
  const sport = normalizeSport(bet.sport);
  const league = bet.league?.toLowerCase() || bet.sport.toLowerCase();
  
  return `https://williamhill.us/sports/${sport}/${league}`;
}

/**
 * Generate deep link for PointsBet
 * Example: https://pointsbet.com/sports/hockey/nhl
 */
function generatePointsBetLink(bet: BetDetails): string {
  const sport = normalizeSport(bet.sport);
  const league = bet.league?.toLowerCase() || bet.sport.toLowerCase();
  
  return `https://pointsbet.com/sports/${sport}/${league}`;
}

/**
 * Generate deep link for Unibet
 * Example: https://unibet.com/us/sports/hockey/nhl
 */
function generateUnibetLink(bet: BetDetails): string {
  const sport = normalizeSport(bet.sport);
  const league = bet.league?.toLowerCase() || bet.sport.toLowerCase();
  
  return `https://unibet.com/us/sports/${sport}/${league}`;
}

/**
 * Generate deep link for SugarHouse
 * Example: https://www.sugarhouse.com/online-sportsbook/hockey
 */
function generateSugarHouseLink(bet: BetDetails): string {
  const sport = normalizeSport(bet.sport);
  
  return `https://www.sugarhouse.com/online-sportsbook/${sport}`;
}

/**
 * Generate deep link for SportingBet
 * Example: https://www.sportingbet.com/sports/hockey/nhl
 */
function generateSportingBetLink(bet: BetDetails): string {
  const sport = normalizeSport(bet.sport);
  const league = bet.league?.toLowerCase() || bet.sport.toLowerCase();
  
  return `https://www.sportingbet.com/sports/${sport}/${league}`;
}

/**
 * Generate deep link for Sports Interaction
 * Example: https://www.sportsinteraction.com/hockey/nhl-betting
 */
function generateSportsInteractionLink(bet: BetDetails): string {
  const sport = normalizeSport(bet.sport);
  const league = bet.league?.toLowerCase() || bet.sport.toLowerCase();
  
  return `https://www.sportsinteraction.com/${sport}/${league}-betting`;
}

/**
 * Main function to generate deep link for any sportsbook
 */
export function generateSportsbookDeepLink(
  sportsbook: string,
  bet: BetDetails,
  fallbackUrl?: string
): string {
  // Normalize sportsbook name
  const normalizedBook = sportsbook.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  try {
    switch (normalizedBook) {
      case 'draftkings':
      case 'dk':
        return generateDraftKingsLink(bet);
      
      case 'fanduel':
      case 'fd':
        return generateFanDuelLink(bet);
      
      case 'betmgm':
      case 'mgm':
        return generateBetMGMLink(bet);
      
      case 'bet365':
      case '365':
        return generateBet365Link(bet);
      
      case 'betrivers':
      case 'rivers':
        return generateBetRiversLink(bet);
      
      case 'espnbet':
      case 'espn':
        return generateESPNBetLink(bet);
      
      case 'fanatics':
        return generateFanaticsLink(bet);
      
      case 'caesars':
        return generateCaesarsLink(bet);
      
      case 'williamhill':
      case 'wh':
        return generateWilliamHillLink(bet);
      
      case 'pointsbet':
      case 'pb':
        return generatePointsBetLink(bet);
      
      case 'unibet':
        return generateUnibetLink(bet);
      
      case 'sugarhouse':
      case 'sh':
        return generateSugarHouseLink(bet);
      
      case 'sportingbet':
        return generateSportingBetLink(bet);
      
      case 'sportsinteraction':
      case 'si':
        return generateSportsInteractionLink(bet);
      
      default:
        // If we don't have a specific handler, use fallback or generic metabet link
        return fallbackUrl || `https://go.metabet.io/bet/${bet.gameID}/${normalizedBook}`;
    }
  } catch (error) {
    console.error(`Error generating deep link for ${sportsbook}:`, error);
    return fallbackUrl || `https://go.metabet.io/bet/${bet.gameID}/${normalizedBook}`;
  }
}

/**
 * Extract bet details from event data
 */
export function extractBetDetails(event: any): BetDetails {
  // Parse team names from event string (e.g., "Flyers vs Bruins")
  const teams = event.event?.split(' vs ') || ['Unknown', 'Unknown'];
  const awayTeam = teams[0]?.trim() || 'Unknown';
  const homeTeam = teams[1]?.trim() || 'Unknown';

  // Parse line from prop (e.g., "Over 6.5" -> 6.5)
  const lineMatch = event.prop?.match(/[-+]?\d+\.?\d*/);
  const line = lineMatch ? parseFloat(lineMatch[0]) : undefined;

  // Parse player name from prop (e.g., "Connor McDavid Over 0.5 Points" -> "Connor McDavid")
  let playerName: string | undefined;
  if (event.market === 'Player Prop' && event.prop) {
    const propParts = event.prop.split(/\s+(Over|Under|O\/U)\s+/i);
    playerName = propParts[0]?.trim();
  }

  return {
    gameID: event.id?.split('-')[0] || 'unknown',
    sport: event.league || 'UNKNOWN',
    league: event.league,
    homeTeam,
    awayTeam,
    market: event.market || 'Unknown',
    prop: event.prop || 'Unknown',
    playerName,
    line,
    isLive: event.isLive || false
  };
}
