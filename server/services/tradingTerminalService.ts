import { API_KEY, API_BASE_URL } from '../sportsDataService.js';
import {
  calculateEV,
  calculateEVPercent,
  calculateWinProbability as calcWinProb,
  calculateImpliedProbability,
  devigTwoWayMarket,
  getFairProbFromTwoWay,
  calculateFairLine
} from '../../shared/lib/bettingCalculations.js';
import { americanToDecimal, decimalToAmerican } from '../../shared/lib/oddsConversion.js';

// Trading Terminal Data Types based on Sharp Shot API documentation
export interface TradingTerminalEvent {
  id: string;
  event: string;
  league: string;
  prop: string;
  market: string;
  myOdds: number;
  myOddsEuropean?: number;
  winProbability: number;
  evPercentage: number;
  /** ✅ Only set when the ARB pair is sane (both sides comparable). Percentage, e.g. 8.6 for 8.6% */
  arbPercentage?: number;
  fieldOdds: Array<{
    book: string;
    american?: number;
    european?: number;
    odds?: number; // Legacy field
    url?: string;
  }>;
  gameTime: string;
  isLive: boolean;
  gameStatus: 'live' | 'upcoming' | 'final';
  playerID?: number; // Permanent player ID for player props
  fairLine?: string; // Fair line projection (e.g., "-3.5", "O 45.5", "+150")
  // Enrichment from Games API (excitement metrics)
  points?: number;
  highPoints?: number;
  pointsLevel?: string;
  rationale?: string;
  headline?: string;
  // Odds splits data (betting percentages)
  betsPercentage?: number; // % of bets on this side
  handlePercentage?: number; // % of handle on this side
}

// Sharp Shot API Game interface based on documentation
interface SharpShotGame {
  gameID: string;
  sport: string;
  team1ID: string;
  team1City: string;
  team1Name: string;
  team1Ranking?: number;
  team1Score?: number;
  team2ID: string;
  team2City: string;
  team2Name: string;
  team2Ranking?: number;
  team2Score?: number;
  progress?: number;
  timeLeft?: string;
  location?: string;
  points?: number;
  highPoints?: number;
  pointsLevel?: string;
  rationale?: string;
  date?: string;
  time?: string;
  headline?: string;
  headlineDate?: string;
  leagueCode?: string;
}

// Sharp Shot API Odds interface based on documentation
interface SharpShotOdds {
  gameID: string;
  sport: string;
  team1ID: string;
  team1City: string;
  team1Name: string;
  team2ID: string;
  team2City: string;
  team2Name: string;
  date?: string;
  time?: string;
  odds: Array<{
    provider: string;
    moneyLine1?: number; // Away team moneyline (decimal format)
    moneyLine2?: number; // Home team moneyline (decimal format)
    spread?: number;     // Spread line (relative to home team)
    spreadLine1?: number; // Away team spread price
    spreadLine2?: number; // Home team spread price
    overUnder?: number;   // Over/Under line
    overUnderLineOver?: number;  // Over price
    overUnderLineUnder?: number; // Under price
    url?: string;
  }>;
  playerProps?: any[]; // Player props from SideOdds API
}

// Odds Splits interface for betting percentages
interface OddsSplits {
  gameID: string;
  sport: string;
  moneyline?: {
    team1?: { bets?: number; handle?: number };
    team2?: { bets?: number; handle?: number };
  };
  spread?: {
    team1?: { bets?: number; handle?: number };
    team2?: { bets?: number; handle?: number };
  };
  total?: {
    over?: { bets?: number; handle?: number };
    under?: { bets?: number; handle?: number };
  };
}

export class TradingTerminalService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = API_KEY;
    this.baseUrl = API_BASE_URL;
  }

  // Main method to get all trading terminal data
  async getTradingTerminalData(sport?: string): Promise<TradingTerminalEvent[]> {
    try {

      // Step 1: Get games from Games API (includes live and upcoming)
      const gamesFromGamesApi = await this.fetchGamesJson(sport);
      // Step 2: Get upcoming games from Links API as supplement
      const upcomingGamesFromLinks = await this.fetchUpcomingGamesFromLinks(sport);

      // Step 3: Combine and deduplicate games
      const allGames = this.combineAndDeduplicateGames(gamesFromGamesApi, upcomingGamesFromLinks);

      if (allGames.length === 0) {
        return [];
      }

      // Step 4: Fetch odds for relevant games (live and upcoming only)
      const oddsData = await this.fetchOddsForGames(allGames);

      // Step 5: Fetch odds splits for betting percentages
      const oddsSplitsData = await this.fetchOddsSplitsForGames(allGames);

      // Step 6: Transform to trading opportunities
      const opportunities = this.createTradingOpportunities(allGames, oddsData, oddsSplitsData);

      return opportunities;
    } catch (error) {
      console.error('❌ [TRADING TERMINAL] Error:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ [TRADING TERMINAL] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return [];
    }
  }

  // Fetch games using correct API endpoint
  private async fetchGamesJson(sport?: string): Promise<SharpShotGame[]> {
    try {
      const url = new URL(`${this.baseUrl}/games.json`);
      url.searchParams.append('apiKey', this.apiKey);

      if (sport) {
        url.searchParams.append('sport', sport);
      }


      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SharpShot/1.0'
        },
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`Games API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📄 Games API response structure:`, Object.keys(data));

      // Extract games from response - API returns {"meta": {...}, "results": [...]}
      const games = data.results || [];
      console.log(`🎮 Extracted ${games.length} games from API response`);

      // Log first few games for debugging
      if (games.length > 0) {
        console.log(`📊 Sample game data:`, {
          gameID: games[0].gameID,
          sport: games[0].sport,
          team1Name: games[0].team1Name,
          team2Name: games[0].team2Name,
          timeLeft: games[0].timeLeft,
          points: games[0].points,
          date: games[0].date,
          time: games[0].time
        });
      }

      // Parse and clean up game data
      const parsedGames = games.map((game: any) => {
        // Extract team names with better fallbacks and normalization
        let team1Name = game.team1Name || game.team1 || game.awayTeam || '';
        let team2Name = game.team2Name || game.team2 || game.homeTeam || '';

        // Clean up team names - remove extra whitespace and normalize
        team1Name = String(team1Name || '').trim().replace(/\s+/g, ' ');
        team2Name = String(team2Name || '').trim().replace(/\s+/g, ' ');

        // If team names are empty or just numbers, try to combine city + name
        if (!team1Name || team1Name.length < 2) {
          const city1 = game.team1City || game.awayCity || '';
          const name1 = game.team1Name || '';
          team1Name = `${city1} ${name1}`.trim() || game.team1ID || 'Away Team';
        }
        if (!team2Name || team2Name.length < 2) {
          const city2 = game.team2City || game.homeCity || '';
          const name2 = game.team2Name || '';
          team2Name = `${city2} ${name2}`.trim() || game.team2ID || 'Home Team';
        }

        // Extract RAW league code (keep it raw for mapping later)
        let rawLeagueCode = (game.leagueCode || game.league || game.sport || '').toString().trim().toUpperCase();

        // Human-friendly label map (do NOT overwrite the raw code)
        const leagueLabelMap: Record<string,string> = {
          BBM:'MLB', FBP:'NFL', BKP:'NBA', HOP:'NHL', HCP:'NHL',
          BKC:'NCAA BK', FBC:'NCAA FB',
          SOE:'EPL', SOG:'Bundesliga', SOI:'Serie A', SOS:'La Liga', SOS2:'LaLiga 2',
          SOF:'Ligue 1', SOF2:'Ligue 2', SOZ:'Brasileirão A', SOZ2:'Brasileirão B'
        };
        const leagueLabel = leagueLabelMap[rawLeagueCode] || rawLeagueCode || 'Unknown League';

        return {
          ...game,
          team1Name: team1Name,
          team2Name: team2Name,
          leagueCode: rawLeagueCode,   // keep RAW code here
          leagueLabel,                 // optional (UI)
          sport: game.sport || rawLeagueCode
        };
      });

      console.log(`✅ Parsed ${parsedGames.length} games with proper team names`);
      return parsedGames;
    } catch (error) {
      console.error('❌ Error fetching games:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  // Fetch upcoming games from Links API (better for upcoming games)
  private async fetchUpcomingGamesFromLinks(sport?: string): Promise<SharpShotGame[]> {
    try {
      const now = new Date().getTime();
      const futureDate = now + (7 * 24 * 60 * 60 * 1000); // 7 days from now

      const url = new URL(`${this.baseUrl}/links.json`);
      url.searchParams.append('apiKey', this.apiKey);
      url.searchParams.append('startDate', now.toString());
      url.searchParams.append('endDate', futureDate.toString());
      if (sport) {
        url.searchParams.append('sport', sport);
      }

      console.log(`🔗 Fetching upcoming games from Links API: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SharpShot/1.0'
        },
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        console.log(`⚠️ Links API error: ${response.status} - ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      console.log(`🔗 Links API response structure:`, Object.keys(data));
      console.log(`🔗 Links API results count: ${data.results ? data.results.length : 'undefined'}`);

      if (!data.results || !Array.isArray(data.results)) {
        console.log('⚠️ [LINKS API] No results array found in response');
        return [];
      }

      // Extract unique games from links data
      const gameMap = new Map<string, SharpShotGame>();

      data.results.forEach((link: any) => {
        if (link.gameID && !gameMap.has(link.gameID)) {
          // Extract team names from multiple sources
          let team1Name = '';
          let team2Name = '';
          let leagueCode = 'UNKNOWN';

          // PRIORITY 1: Try direct team name fields first
          if (link.team1 || link.team2) {
            team1Name = String(link.team1 || '').trim();
            team2Name = String(link.team2 || '').trim();
          }

          // PRIORITY 2: Try SiriusXM links (most reliable for major leagues)
          if ((!team1Name || !team2Name) && link.links && Array.isArray(link.links)) {
            const siriusLinks = link.links.filter((l: any) => l.source === 'SIRIUSXM' && l.team);

            if (siriusLinks.length >= 2) {
              const awayLink = siriusLinks.find((l: any) => l.team === 'away');
              const homeLink = siriusLinks.find((l: any) => l.team === 'home');

              if (awayLink && homeLink) {
                // Extract team names from SiriusXM URLs
                const awayUrl = awayLink.url || '';
                const homeUrl = homeLink.url || '';

                // Parse team names from URLs like "seattle-mariners" -> "Mariners"
                const awayMatch = awayUrl.match(/\/([^\/]+)-([^\/]+)$/);
                const homeMatch = homeUrl.match(/\/([^\/]+)-([^\/]+)$/);

                if (awayMatch && homeMatch) {
                  team1Name = awayMatch[2].replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                  team2Name = homeMatch[2].replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

                  // Determine league from URL structure
                  if (awayUrl.includes('/mlb/') || homeUrl.includes('/mlb/')) leagueCode = 'BBM';
                  else if (awayUrl.includes('/nfl/') || homeUrl.includes('/nfl/')) leagueCode = 'FBP';
                  else if (awayUrl.includes('/nba/') || homeUrl.includes('/nba/')) leagueCode = 'BKP';
                  else if (awayUrl.includes('/nhl/') || homeUrl.includes('/nhl/')) leagueCode = 'HCP';
                }
              }
            }
          }

          // PRIORITY 3: Try headline parsing
          if (!team1Name || !team2Name) {
            const headline = link.headline || '';

            // Pattern 1: "Team1 (stats) when they play host to Team2"
            const hostMatch = headline.match(/([A-Za-z\s\-\.]+)\s*\([^)]+\)\s+when they (?:play host to|welcome)\s+([A-Za-z\s\-\.#]+?)(?:\s+in|\s*$|,)/i);
            if (hostMatch) {
              team2Name = team2Name || hostMatch[1].trim();
              team1Name = team1Name || hostMatch[2].trim();
            }

            // Pattern 2: "Team1 hopes/looks to... when they welcome Team2"
            if (!team1Name || !team2Name) {
              const hopesMatch = headline.match(/([A-Za-z\s\-\.#]+?)\s+(?:hopes|looks)\s+to[^,]+when they welcome\s+([A-Za-z\s\-\.#]+?)(?:\s+in|\s*$|,)/i);
              if (hopesMatch) {
                team2Name = team2Name || hopesMatch[1].trim();
                team1Name = team1Name || hopesMatch[2].trim();
              }
            }

            // Pattern 3: "Player leads Team1 against Team2"
            if (!team1Name || !team2Name) {
              const leadsMatch = headline.match(/leads\s+([A-Za-z\s\-\.#]+?)\s+against\s+(?:undefeated\s+)?([A-Za-z\s\-\.#]+?)(?:,|\s+fresh|\s+in|\s+and|\s+aiming|\s*$)/i);
              if (leadsMatch) {
                team1Name = team1Name || leadsMatch[1].trim();
                team2Name = team2Name || leadsMatch[2].trim();
              }
            }

            // Pattern 4: "Team1 welcomes Team2" or "Team1 plays host to Team2"
            if (!team1Name || !team2Name) {
              const welcomesMatch = headline.match(/([A-Za-z\s\-\.#]+?)\s+(?:welcomes|plays host to|hosts)\s+([A-Za-z\s\-\.#]+?)(?:,|\s+in|\s+and|\s+aiming|\s*$)/i);
              if (welcomesMatch) {
                team2Name = team2Name || welcomesMatch[1].trim();
                team1Name = team1Name || welcomesMatch[2].trim();
              }
            }

            // Pattern 5: "Team1 visits Team2" or "Team1 travels to face Team2"
            if (!team1Name || !team2Name) {
              const visitsMatch = headline.match(/([A-Za-z\s\-\.#]+?)\s+(?:visits|travels to face|travels to)\s+([A-Za-z\s\-\.#]+?)(?:,|\s+in|\s+and|\s+aiming|\s+hoping|\s*$)/i);
              if (visitsMatch) {
                team1Name = team1Name || visitsMatch[1].trim();
                team2Name = team2Name || visitsMatch[2].trim();
              }
            }

            // Pattern 6: "Team1, Team2 meet" or "Team1 and Team2 meet"
            if (!team1Name || !team2Name) {
              const meetMatch = headline.match(/([A-Za-z\s\-\.#]+?)\s+(?:and|,)\s+([A-Za-z\s\-\.#]+?)\s+(?:meet|face off)/i);
              if (meetMatch) {
                team1Name = team1Name || meetMatch[1].trim();
                team2Name = team2Name || meetMatch[2].trim();
              }
            }

            // Pattern 7: "Team1 vs Team2" or "Team1 at Team2"
            if (!team1Name || !team2Name) {
              const vsMatch = headline.match(/([A-Za-z\s\-\.#]+)\s+(?:vs|v|at|@)\s+([A-Za-z\s\-\.#]+)/i);
              if (vsMatch) {
                team1Name = team1Name || vsMatch[1].trim();
                team2Name = team2Name || vsMatch[2].trim();
              }
            }

          }

          // PRIORITY 4: Try combining city + team name
          if (!team1Name || team1Name.length < 2) {
            const city1 = link.team1City || link.awayCity || '';
            const name1 = link.team1Name || '';
            team1Name = `${city1} ${name1}`.trim();
          }
          if (!team2Name || team2Name.length < 2) {
            const city2 = link.team2City || link.homeCity || '';
            const name2 = link.team2Name || '';
            team2Name = `${city2} ${name2}`.trim();
          }

          // PRIORITY 5: Use team IDs as last resort (better than "Away Team")
          if (!team1Name || team1Name.length < 2) {
            team1Name = link.team1ID || link.awayTeam || `Team ${link.gameID}A`;
          }
          if (!team2Name || team2Name.length < 2) {
            team2Name = link.team2ID || link.homeTeam || `Team ${link.gameID}H`;
          }

          // Clean up team names
          team1Name = String(team1Name).trim().replace(/\s+/g, ' ');
          team2Name = String(team2Name).trim().replace(/\s+/g, ' ');

          // Filter out games with missing team names (non-major league games)
          if (team1Name.includes('Team ') || team2Name.includes('Team ')) {
            console.log(`⚠️ [FILTERED OUT] Game ${link.gameID}: ${team1Name} vs ${team2Name} - No team name data available (non-major league)`);
            return; // Skip this game
          }

          // Decide RAW league code with strict priority: link.sport/league → provider URLs → headline (last)
          let rawLeagueCode = (link.leagueCode || link.league || '').toString().trim().toUpperCase();

          // ⚠️ CRITICAL: If the raw code from API is "SOS" (La Liga) but teams/headline suggest USL, override it
          if (rawLeagueCode === 'SOS') {
            const h = (link.headline || '').toLowerCase();
            const combinedText = `${h} ${team1Name} ${team2Name}`.toLowerCase();
            if (/\busl\b/.test(h) || /\busl\b/.test(combinedText)) {
              console.log(`🔧 Overriding SOS (La Liga) → SOUSL (USL) for: ${team1Name} vs ${team2Name}`);
              rawLeagueCode = 'SOUSL';
            }
          }

          if (!rawLeagueCode) {
            // Try to infer from provider URLs (more reliable than headlines)
            const srcs = Array.isArray(link.links) ? link.links : [];
            const urlText = srcs.map((l:any) => (l?.url || '')).join(' ').toLowerCase();
            if (urlText.includes('/mlb/')) rawLeagueCode = 'BBM';
            else if (urlText.includes('/nfl/')) rawLeagueCode = 'FBP';
            else if (urlText.includes('/nba/')) rawLeagueCode = 'BKP';
            else if (urlText.includes('/nhl/')) rawLeagueCode = 'HCP';
            else if (urlText.includes('usl') || urlText.includes('championship-usl')) rawLeagueCode = 'SOUSL';
            else if (urlText.includes('mls')) rawLeagueCode = 'SOMLS';
            else if (urlText.includes('/epl/') || urlText.includes('premier-league')) rawLeagueCode = 'SOE';
            else if (urlText.includes('/bundesliga/')) rawLeagueCode = 'SOG';
            else if (urlText.includes('/serie-a/')) rawLeagueCode = 'SOI';
            else if (urlText.includes('/la-liga/') || urlText.includes('/laliga/')) rawLeagueCode = 'SOS';
            else if (urlText.includes('/ligue-1/')) rawLeagueCode = 'SOF';
          }

          // Final fallback, headline hints ONLY for broad sport (never hard-map to a specific league)
          if (!rawLeagueCode) {
            const h = (link.headline || '').toLowerCase();
            const combinedText = `${h} ${team1Name} ${team2Name}`.toLowerCase();

            // US Major Leagues
            if (/\bmlb\b|\bbaseball\b/.test(h)) rawLeagueCode = 'BBM';
            else if (/\bnfl\b/.test(h)) rawLeagueCode = 'FBP';
            else if (/\bnba\b/.test(h)) rawLeagueCode = 'BKP';
            else if (/\bnhl\b/.test(h)) rawLeagueCode = 'HCP';
            else if (/\bwnba\b/.test(h)) rawLeagueCode = 'WNBA';

            // Soccer leagues - check both headline and team names
            else if (/\busl\b/.test(h) || /\busl\b/.test(combinedText)) rawLeagueCode = 'SOUSL';
            else if (/\bmls\b/.test(h) || /\bfc\b/.test(combinedText) && /\bunited\b|\bcity sc\b/.test(combinedText)) rawLeagueCode = 'SOMLS';

            // College sports - check for college team names
            else if ((/\bncaa\b|\bcollege\b/.test(h) && /\bfootball\b/.test(h)) ||
                     (/state\b|university\b|tech\b|college\b/.test(combinedText) && !/\bcity\b/.test(combinedText))) {
              rawLeagueCode = 'FBC';
            }
            else if (/\bncaa\b|\bcollege\b/.test(h) && /\bbasketball\b/.test(h)) rawLeagueCode = 'BKC';

            // Generic soccer indicators (FC, United, City SC, etc.) - leave empty to default to SOCCER
            else if (/\bfc\b|\bunited fc\b|\bcity sc\b|\breal\b|\batletico\b|\bsporting\b/.test(combinedText)) rawLeagueCode = '';
            else if (/\bsoccer\b|\bmatch\b|\bderby\b/.test(h)) rawLeagueCode = '';
          }

          // Map RAW code to a generic sport for downstream logic
          const sportFromLeague =
            rawLeagueCode && rawLeagueCode.startsWith('SO') ? 'soccer'
          : rawLeagueCode && rawLeagueCode.startsWith('BB') ? 'mlb'
          : rawLeagueCode && rawLeagueCode.startsWith('FB') ? 'nfl'
          : rawLeagueCode && rawLeagueCode.startsWith('BK') ? 'nba'
          : rawLeagueCode && (rawLeagueCode.startsWith('HO') || rawLeagueCode.startsWith('HC')) ? 'nhl'
          : (link.sport || (rawLeagueCode ? 'soccer' : 'soccer')); // nudge toward soccer if ambiguous

          gameMap.set(link.gameID, {
            gameID: link.gameID,
            sport: sportFromLeague,
            team1ID: link.team1ID || `team1_${link.gameID}`,
            team1City: link.team1City || '',
            team1Name, team2ID: link.team2ID || `team2_${link.gameID}`,
            team2City: link.team2City || '',
            team2Name,
            leagueCode: rawLeagueCode,   // keep RAW code
            time: link.startTime || Date.now(),
            timeLeft: '0:00'
          } as SharpShotGame);
        }
      });

      const upcomingGames = Array.from(gameMap.values());
      console.log(`🔗 [LINKS API] Found ${upcomingGames.length} upcoming games`);

      // Debug: Log first few games
      upcomingGames.slice(0, 3).forEach((game, index) => {
        console.log(`🔍 DEBUG: Game ${index + 1}: ${game.team1Name} vs ${game.team2Name} (ID: ${game.gameID}, League: ${game.leagueCode})`);
      });

      return upcomingGames;
    } catch (error) {
      console.error('❌ [LINKS API] Error fetching upcoming games:', error);
      return [];
    }
  }

  // Combine and deduplicate games from multiple sources
  private combineAndDeduplicateGames(gamesFromGamesApi: SharpShotGame[], upcomingGamesFromLinks: SharpShotGame[]): SharpShotGame[] {
    const gameMap = new Map<string, SharpShotGame>();

    // Add games from Games API first (these have more complete data)
    gamesFromGamesApi.forEach(game => {
      gameMap.set(game.gameID, game);
    });

    // Add upcoming games from Links API (only if not already present)
    upcomingGamesFromLinks.forEach(game => {
      if (!gameMap.has(game.gameID)) {
        gameMap.set(game.gameID, game);
      }
    });

    const combinedGames = Array.from(gameMap.values());
    console.log(`🔄 Combined ${gamesFromGamesApi.length} + ${upcomingGamesFromLinks.length} = ${combinedGames.length} unique games`);

    return combinedGames;
  }

  // Fetch odds and player props for specific games
  private async fetchOddsForGames(games: SharpShotGame[]): Promise<{[gameID: string]: SharpShotOdds & {playerProps?: any[]}}> {
    const oddsData: {[gameID: string]: SharpShotOdds & {playerProps?: any[]}} = {};

    // Only include live and upcoming games (skip final games)
    const relevantGames = games.filter(game => {
      const status = this.determineGameStatus(game);
      return status === 'live' || status === 'upcoming';
    });

    // Sort games by priority: live games first, then upcoming games
    const sortedGames = relevantGames.sort((a, b) => {
      const statusA = this.determineGameStatus(a);
      const statusB = this.determineGameStatus(b);

      if (statusA === 'live' && statusB !== 'live') return -1;
      if (statusA !== 'live' && statusB === 'live') return 1;
      return 0;
    });

    console.log(`🎯 Fetching odds for ${sortedGames.length} games (live: ${games.filter(g => this.determineGameStatus(g) === 'live').length}, upcoming: ${games.filter(g => this.determineGameStatus(g) === 'upcoming').length})`);

    // Process many more games for better coverage - increased from 15 to 100
    // This ensures we show all live games and many upcoming games
    const gamesToProcess = sortedGames.slice(0, 100);
    console.log(`⚡ Processing ${gamesToProcess.length} games (prioritizing live games)`);

    // Concurrency for odds fetches (limit to ~8 at a time)
    for (const batch of this.chunks(gamesToProcess, 8)) {
      await Promise.all(batch.map(async (game) => {
      try {
        const url = new URL(`${this.baseUrl}/odds.json`);
        url.searchParams.append('apiKey', this.apiKey);
        url.searchParams.append('gameID', game.gameID);

        console.log(`🎲 Fetching odds for game ${game.gameID}: ${game.team1Name} vs ${game.team2Name}`);

        const response = await fetch(url.toString(), {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SharpShot/1.0'
          },
          signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
          console.log(`⚠️ Odds API error for game ${game.gameID}: ${response.status}`);
          return; // Skip this game in the Promise.all
        }

        const oddsResponse = await response.json();
        console.log(`📊 Odds response structure for game ${game.gameID}:`, Object.keys(oddsResponse));

        // Extract odds from response - API returns {"meta": {...}, "results": [{"odds": [...]}]}
        const gameResult = oddsResponse.results && oddsResponse.results[0];
        const odds = gameResult ? gameResult.odds || [] : [];
        console.log(`🔍 DEBUG: odds.length = ${odds.length} for game ${game.gameID}`);
        console.log(`🔍 DEBUG: gameResult =`, gameResult ? 'exists' : 'null');
        console.log(`🔍 DEBUG: oddsResponse.results =`, oddsResponse.results ? oddsResponse.results.length : 'null');

        if (odds.length > 0) {
          oddsData[game.gameID] = {
            ...game,
            odds: odds
          };
          console.log(`✅ Found ${odds.length} odds providers for game ${game.gameID} (${game.team1Name} vs ${game.team2Name})`);

          // Log sample odds data for debugging
          if (odds.length > 0) {
            const sampleOdds = odds[0];
            console.log(`📊 Sample odds data:`, {
              provider: sampleOdds.provider,
              moneyLine1: sampleOdds.moneyLine1,
              moneyLine2: sampleOdds.moneyLine2,
              spreadLine1: sampleOdds.spreadLine1,
              spreadLine2: sampleOdds.spreadLine2,
              overUnderLineOver: sampleOdds.overUnderLineOver,
              overUnderLineUnder: sampleOdds.overUnderLineUnder
            });
          }

          // Fetch player props for both live and upcoming games (but prioritize live games)
          const gameStatus = this.determineGameStatus(game);
          if (gameStatus === 'live' || gameStatus === 'upcoming') {
            try {
              const playerProps = await this.fetchPlayerPropsForGame(game);
              if (playerProps.length > 0) {
                oddsData[game.gameID].playerProps = playerProps;
                console.log(`🎯 Found ${playerProps.length} player props for ${gameStatus} game ${game.gameID}`);
              }
            } catch (propError) {
              console.log(`⚠️ Error fetching player props for game ${game.gameID}:`, propError instanceof Error ? propError.message : 'Unknown error');
            }
          }
        } else {
          console.log(`⚠️ No odds data for game ${game.gameID} (${game.team1Name} vs ${game.team2Name})`);
        }
      } catch (error) {
        console.log(`❌ Error fetching odds for game ${game.gameID}:`, error instanceof Error ? error.message : 'Unknown error');
      }
      })); // Close Promise.all and map
    } // Close for loop over batches

    return oddsData;
  }

  // Fetch player props for a specific game
  private async fetchPlayerPropsForGame(game: SharpShotGame): Promise<any[]> {
      try {
        const url = new URL(`${this.baseUrl}/sideodds.json`);
        url.searchParams.append('apiKey', this.apiKey);
        url.searchParams.append('gameID', game.gameID);

      console.log(`🎯 Fetching player props for game ${game.gameID}`);

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SharpShot/1.0'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        console.log(`⚠️ Player props API error for game ${game.gameID}: ${response.status}`);
        return [];
      }

      const propsResponse = await response.json();
      console.log(`📊 Player props response structure for game ${game.gameID}:`, Object.keys(propsResponse));

      // SideOdds API returns {"players": [...], "results": [...]}
      // Results reference player IDs, players array has the actual player data
      const players = propsResponse.players || [];
      const results = propsResponse.results || [];

      console.log(`📊 Found ${players.length} players and ${results.length} prop results`);

      // Map results to include player names from the players array
      const enrichedProps = results.map((result: any) => {
        const player = players.find((p: any) => p.id === result.playerID);
        return {
          ...result,
          playerName: player ? player.name : 'Unknown Player',
          playerTeam: player ? player.team : 'Unknown Team'
        };
      });

      if (enrichedProps.length > 0) {
        console.log(`✅ Found ${enrichedProps.length} player props for game ${game.gameID}`);
        return enrichedProps;
      }

      return [];
    } catch (error) {
      console.log(`❌ Error fetching player props for game ${game.gameID}:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  // Fetch odds splits (betting percentages) for games
  private async fetchOddsSplitsForGames(games: SharpShotGame[]): Promise<{[gameID: string]: OddsSplits}> {
    const splitsData: {[gameID: string]: OddsSplits} = {};

    // Only include live and upcoming games
    const relevantGames = games.filter(game => {
      const status = this.determineGameStatus(game);
      return status === 'live' || status === 'upcoming';
    });

    console.log(`📊 Fetching odds splits for ${relevantGames.length} games`);

    // Limit concurrent requests to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < relevantGames.length; i += batchSize) {
      const batch = relevantGames.slice(i, i + batchSize);

      const batchPromises = batch.map(async (game) => {
        try {
          const url = new URL(`${this.baseUrl}/odds-splits.json`);
          url.searchParams.append('apiKey', this.apiKey);
          url.searchParams.append('gameID', game.gameID);

          console.log(`📊 Fetching splits for game ${game.gameID}: ${game.team1Name} vs ${game.team2Name}`);

          const response = await fetch(url.toString(), {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'SharpShot/1.0'
            },
            signal: AbortSignal.timeout(10000)
          });

          if (!response.ok) {
            console.log(`⚠️ Odds splits API error for game ${game.gameID}: ${response.status}`);
            return;
          }

          const data = await response.json();

          if (data && data.results && data.results.length > 0) {
            const splits = data.results[0]; // Take first result
            splitsData[game.gameID] = {
              gameID: game.gameID,
              sport: game.sport,
              moneyline: splits.moneyline,
              spread: splits.spread,
              total: splits.total
            };
            console.log(`✅ Splits data for ${game.gameID}:`, splits);
          }
        } catch (error) {
          console.log(`❌ Error fetching splits for game ${game.gameID}:`, error instanceof Error ? error.message : 'Unknown error');
        }
      });

      await Promise.all(batchPromises);

      // Small delay between batches to be respectful to the API
      if (i + batchSize < relevantGames.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`📊 Fetched odds splits for ${Object.keys(splitsData).length} games`);
    return splitsData;
  }

  // Helper to extract betting splits for a specific market and side
  private getBettingSplits(gameSplits: OddsSplits | undefined, market: string, side: string): { betsPercentage?: number; handlePercentage?: number } {
    if (!gameSplits) return {};

    try {
      let splitData;

      if (market === 'Moneyline') {
        splitData = side === 'home' ? gameSplits.moneyline?.team2 : gameSplits.moneyline?.team1;
      } else if (market === 'Spread') {
        splitData = side === 'home' ? gameSplits.spread?.team2 : gameSplits.spread?.team1;
      } else if (market === 'Total') {
        splitData = side === 'over' ? gameSplits.total?.over : gameSplits.total?.under;
      }

      return {
        betsPercentage: splitData?.bets,
        handlePercentage: splitData?.handle
      };
    } catch (error) {
      console.log('Error extracting betting splits:', error);
      return {};
    }
  }

  // Create trading opportunities from games and odds
  private createTradingOpportunities(games: SharpShotGame[], oddsData: {[gameID: string]: SharpShotOdds & {playerProps?: any[]}}, oddsSplitsData: {[gameID: string]: OddsSplits} = {}): TradingTerminalEvent[] {
    const opportunities: TradingTerminalEvent[] = [];

    let filteredCount = 0;
    let majorLeagueCount = 0;

    games.forEach(game => {
      const status = this.determineGameStatus(game);

      // Skip final games - only show live and upcoming
      if (status === 'final') {
        return;
      }

      // ✅ FILTER: Only show major leagues (NFL, NBA, MLB, NHL, EPL, La Liga, etc.)
      if (!this.isMajorLeague(game.sport, game.leagueCode)) {
        filteredCount++;
        return;
      }

      majorLeagueCount++;

      const gameOdds = oddsData[game.gameID];
      const gameSplits = oddsSplitsData[game.gameID];

      if (gameOdds && gameOdds.odds && gameOdds.odds.length > 0) {
        // Create multiple opportunities from real odds data
        const opportunitiesFromOdds = this.createOpportunitiesFromRealOdds(game, gameOdds, status, gameSplits);
        opportunities.push(...opportunitiesFromOdds);
      } else {
        // No odds data available - skip this game
      }
    });

    console.log(`🎯 MAJOR LEAGUES FILTER: ${majorLeagueCount} major league games, ${filteredCount} minor league games filtered out`);

    return opportunities;
  }

  // Determine game status from API data
  private determineGameStatus(game: SharpShotGame): 'live' | 'upcoming' | 'final' {
    const now = new Date().getTime();
    const gameTime = game.time ? parseInt(game.time.toString()) : now;


    // Check if game is final - look for explicit final indicators
    if (game.timeLeft && (
      game.timeLeft.toLowerCase().includes('final') ||
      game.timeLeft.toLowerCase().includes('ended') ||
      game.timeLeft.toLowerCase().includes('finished') ||
      game.timeLeft.toLowerCase().includes('complete') ||
      game.timeLeft.toLowerCase().includes('ft') || // Full time
      game.timeLeft.toLowerCase().includes('ot') // Overtime completed
    )) {
      return 'final';
    }

    // Check if game is live - look for active game indicators
    if (game.timeLeft && game.timeLeft !== '0:00' && (
      game.timeLeft.includes("'") || // Soccer (e.g., "45'")
      game.timeLeft.includes("Out") || // Baseball (e.g., "3 Outs")
      game.timeLeft.includes("Inning") || // Baseball (e.g., "7th Inning")
      game.timeLeft.includes("Quarter") || // Basketball (e.g., "4th Quarter")
      game.timeLeft.includes("Period") || // Hockey (e.g., "3rd Period")
      game.timeLeft.includes("Round") || // Golf (e.g., "Round 2")
      game.timeLeft.includes("Set") || // Tennis (e.g., "Set 2")
      game.timeLeft.includes("Half") || // Soccer (e.g., "2nd Half")
      game.timeLeft.includes("OT") || // Overtime
      game.timeLeft.includes("ET") || // Extra time
      /^\d+:\d+$/.test(game.timeLeft) || // Time format like "12:34" (clock time)
      /^\d+$/.test(game.timeLeft) // Just numbers like "45" (minutes)
    )) {
      return 'live';
    }

    // Determine status based on game time vs current time
    if (gameTime > now) {
      // Game is in the future
      const timeDiff = gameTime - now;
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        // More than 24 hours away, likely upcoming
      return 'upcoming';
      } else {
        // Within 24 hours, could be live or upcoming
        return 'upcoming';
      }
    } else if (gameTime < now) {
      // Game is in the past
      const timeDiff = now - gameTime;
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff > 6) {
        // More than 6 hours ago, likely final
        return 'final';
      } else {
        // Within 6 hours, could be live or final
        // Check if there are any live indicators
        if (game.timeLeft && game.timeLeft !== '0:00') {
        return 'live';
        } else {
          // For games within 2 hours, consider them upcoming to allow player props
          if (hoursDiff <= 2) {
            return 'upcoming';
          } else {
            return 'final';
          }
        }
      }
    }

    // Default to upcoming for any other cases
    return 'upcoming';
  }

  // Normalize game start into ISO timestamp for reliable client-side time math
  private formatGameTime(time?: string, timeLeft?: string, status?: string): string {
    try {
      if (time != null) {
        const asNumber = Number(time);
        if (!Number.isNaN(asNumber) && asNumber > 0) {
          // If epoch seconds, convert to ms; if already ms, keep
          const ms = asNumber < 1e12 ? asNumber * 1000 : asNumber;
          const dt = new Date(ms);
          if (!isNaN(dt.getTime())) return dt.toISOString();
        }
        const parsed = Date.parse(String(time));
        if (!Number.isNaN(parsed)) {
          return new Date(parsed).toISOString();
        }
      }
    } catch {}
    // Fallback: return empty string instead of now to avoid making past games look "upcoming"
    return '';
  }

  // Map sport/league codes to display league name
  private mapSportToLeague(sport: string, leagueCode?: string): string {
    const code = (leagueCode || '').toUpperCase();

    // Known raw codes → human labels
    const codeMap: Record<string,string> = {
      BBM:'MLB', FBP:'NFL', BKP:'NBA', HOP:'NHL', HCP:'NHL',
      BKC:'NCAA BK', FBC:'NCAA FB',
      SOE:'EPL', SOG:'Bundesliga', SOI:'Serie A', SOS:'La Liga', SOS2:'LaLiga 2',
      SOF:'Ligue 1', SOF2:'Ligue 2',
      SOZ:'Brasileirão A', SOZ2:'Brasileirão B',
      SOMLS:'MLS', SOUSL:'USL'
    };

    if (code && codeMap[code]) return codeMap[code];

    // 🛡️ If we get an unknown soccer-ish code (starts with "SO"), default to SOCCER
    if (code && code.startsWith('SO')) return 'SOCCER';

    // Fallbacks by sport string
    const s = (sport || '').toLowerCase();

    // Soccer variations
    if (['soccer','futbol'].includes(s)) return 'SOCCER';

    // US Sports
    if (s === 'nba' || s.includes('basketball')) return 'NBA';
    if (s === 'nfl' || s.includes('football') && !s.includes('soccer')) return 'NFL';
    if (s === 'mlb' || s.includes('baseball')) return 'MLB';
    if (s === 'nhl' || s.includes('hockey')) return 'NHL';
    if (s === 'wnba') return 'WNBA';

    // College sports
    if (s.includes('ncaa') && s.includes('basketball')) return 'NCAA BK';
    if (s.includes('ncaa') && s.includes('football')) return 'NCAA FB';
    if (s.includes('college') && s.includes('basketball')) return 'NCAA BK';
    if (s.includes('college') && s.includes('football')) return 'NCAA FB';

    // Other sports
    if (s.includes('tennis') || s === 'atp' || s === 'wta') return 'TENNIS';
    if (s.includes('golf') || s === 'glf') return 'GOLF';
    if (s.includes('mma') || s.includes('ufc')) return 'MMA';
    if (s.includes('boxing')) return 'BOXING';

    // Soccer-like patterns (catch-all for soccer)
    if (s.startsWith('so') || s.includes('premier') || s.includes('liga') || s.includes('fc') || s.includes('united') || s.includes('city')) return 'SOCCER';

    // If completely unknown and empty, default to SOCCER (most ambiguous cases are soccer)
    if (!s || s === 'unknown') return 'SOCCER';

    return sport.toString().toUpperCase();
  }

  // Map API provider names to frontend sportsbook names
  private mapProviderToSportsbook(provider: string): string {
    if (!provider) {
      console.log(`⚠️ Empty provider name provided to mapping function`);
      return 'Unknown';
    }

    const providerMap: { [key: string]: string } = {
      'FANDUEL': 'FanDuel',
      'DRAFTKINGS': 'DraftKings',
      'BET_MGM': 'BetMGM',
      'MGM': 'BetMGM',
      'CAESARS': 'Caesars',
      'CAESARS_SPORTSBOOK': 'Caesars',
      'POINTSBET': 'PointsBet',
      'POINTS_BET': 'PointsBet',
      'BET_RIVERS_PA': 'BetRivers',
      'BET_RIVERS_AZ': 'BetRivers',
      'BET_RIVERS_CO': 'BetRivers',
      'BET_RIVERS_IA': 'BetRivers',
      'BET_RIVERS_IL': 'BetRivers',
      'BET_RIVERS_IN': 'BetRivers',
      'BET_RIVERS_LA': 'BetRivers',
      'BET_RIVERS_MD': 'BetRivers',
      'BET_RIVERS_MI': 'BetRivers',
      'BET_RIVERS_NY': 'BetRivers',
      'BET_RIVERS_OH': 'BetRivers',
      'BET_RIVERS_VA': 'BetRivers',
      'BET_RIVERS_WV': 'BetRivers',
      'BET_RIVERS_CA_ON': 'BetRivers',
      'BETRIVERS': 'BetRivers',
      'HARD_ROCK': 'Hard Rock',
      'HARDROCK': 'Hard Rock',
      'HARD_ROCK_SPORTSBOOK': 'Hard Rock',
      'ESPNBET': 'ESPN Bet',
      'ESPN_BET': 'ESPN Bet',
      'FANATICS': 'Fanatics',
      'FANATICS_SPORTSBOOK': 'Fanatics',
      'UNIBET': 'Unibet',
      'WILLIAM_HILL': 'William Hill',
      'WILLIAMHILL': 'William Hill',
      'BET365': 'Bet365',
      'BET_365': 'Bet365',
      'BOVADA': 'Bovada',
      'BET_ONLINE': 'BetOnline',
      'BETONLINE': 'BetOnline',
      'SUGAR_HOUSE_NJ': 'SugarHouse',
      'SUGARHOUSE': 'SugarHouse',
      'SPORTINGBET': 'SportingBet',
      'SPORTING_BET': 'SportingBet',
      'SPORTS_INTERACTION': 'Sports Interaction',
      'BARSTOOL': 'Barstool',
      'BARSTOOL_SPORTSBOOK': 'Barstool',
      'WYNNBET': 'WynnBET',
      'WYNN_BET': 'WynnBET',
      'FOXBET': 'FOX Bet',
      'FOX_BET': 'FOX Bet',
      'TWINSPIRES': 'TwinSpires',
      'TWIN_SPIRES': 'TwinSpires',
      'BETWAY': 'Betway',
      'BETFRED': 'Betfred',
      'SUPERBOOK': 'SuperBook',
      'SUPER_BOOK': 'SuperBook',
      'MYBOOKIE': 'MyBookie',
      'MY_BOOKIE': 'MyBookie',
      'SPORTSBETTING': 'SportsBetting.ag',
      'SPORTS_BETTING': 'SportsBetting.ag',
      'HERITAGE': 'Heritage Sports',
      'BOOKMAKER': 'BookMaker',
      'JAZZ_SPORTS': 'JazzSports',
      'BETWILD': 'BetWild',
      'XBET': 'XBet'
    };

    const mappedName = providerMap[provider] || provider;

    // Log unmapped providers to help identify missing sportsbooks
    if (!providerMap[provider]) {
      console.log(`⚠️ UNMAPPED PROVIDER: ${provider} - Consider adding to provider mapping`);
    }

    console.log(`🔍 DEBUG: Mapping ${provider} -> ${mappedName}`);
    return mappedName;
  }

  // Convert odds to both American and European formats
  private convertOddsFormats(inputOdds: number): { american: number | null, european: number | null } {
    console.log(`🔍 CONVERSION DEBUG: Input odds: ${inputOdds}`);

    // Handle disabled wagers
    if ((inputOdds == null) || (inputOdds == 1)) {
      console.log(`🔍 CONVERSION DEBUG: Disabled wager (null or 1)`);
      return { american: null, european: null };
    }

    // Check if input is already American odds
    // American odds must be >= 100 or <= -100 (not in the 2-99 range which is decimal odds)
    if (Number.isInteger(inputOdds) && (inputOdds >= 100 || inputOdds <= -100)) {
      console.log(`🔍 CONVERSION DEBUG: Already American odds: ${inputOdds}`);
      const american = Math.round(inputOdds * 10) / 10;  // 1 decimal
      const european = this.americanToEuropean(american);
      return { american, european };
    }

    // Check for unrealistic decimal odds
    if (inputOdds < 1.01 || inputOdds > 1000) {
      console.log(`⚠️ Decimal odds out of realistic range: ${inputOdds}, treating as invalid`);
      return { american: null, european: null };
    }

    // Convert from European (decimal) to American
    let americanOdds: number;
    if (inputOdds < 2) {
      americanOdds = Math.round(-1 * (1 / (inputOdds - 1)) * 100 * 10) / 10;  // 1 decimal
      console.log(`🔍 CONVERSION DEBUG: Favorite conversion: ${inputOdds} -> ${americanOdds}`);

      // Cap extreme negative odds
      if (americanOdds < -1000) {
        console.log(`⚠️ American odds too extreme (negative): ${americanOdds}, capping at -1000`);
        americanOdds = -1000;
      }
    } else {
      americanOdds = Math.round((inputOdds - 1) * 100 * 10) / 10;  // 1 decimal
      console.log(`🔍 CONVERSION DEBUG: Underdog conversion: ${inputOdds} -> ${americanOdds}`);

      // Cap extreme positive odds
      if (americanOdds > 1000) {
        console.log(`⚠️ American odds too extreme (positive): ${americanOdds}, capping at +1000`);
        americanOdds = 1000;
      }
    }

    return { american: americanOdds, european: inputOdds };
  }

  // Convert American odds to European (decimal) odds
  private americanToEuropean(americanOdds: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1;
    } else {
      return (100 / Math.abs(americanOdds)) + 1;
    }
  }

  // Calculate win probability from American odds
  // NOW USES CONSOLIDATED LIBRARY: shared/lib/bettingCalculations.ts
  private calculateWinProbability(americanOdds: number): number {
    return calcWinProb(americanOdds);
  }

  // ---- ODDS HELPERS ----
  private americanToDecimalStrict(american: number): number {
    return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
  }

  private decimalToAmericanStrict(decimal: number): number {
    return decimal >= 2 ? Math.round((decimal - 1) * 100)
                        : Math.round(-100 / (decimal - 1));
  }

  private impliedProbFromAmerican(american: number): number {
    return american > 0 ? 100 / (american + 100)
                        : Math.abs(american) / (Math.abs(american) + 100);
  }

  // Outlier filter: remove prices that are clearly wrong
  private filterOutliers(side: Array<{american?: number, odds?: number}>): Array<{american?: number, odds?: number}> {
    if (!side || side.length === 0) return [];

    const americanOdds = side.map(s => s.american || s.odds || 0);

    // Filter 1: Remove extreme outliers (beyond ±1000 American)
    const filtered1 = side.filter((_, i) => Math.abs(americanOdds[i]) <= 1000);

    if (filtered1.length === 0) return [];

    // Filter 2: Remove prices 75% away from median decimal
    const filteredDecimals = filtered1.map(s => this.americanToDecimalStrict(s.american || s.odds || 0));
    const sortedDecimals = [...filteredDecimals].sort((a, b) => a - b);
    const median = sortedDecimals[Math.floor(sortedDecimals.length / 2)];

    const filtered2 = filtered1.filter((_, i) => {
      const decimal = filteredDecimals[i];
      const deviation = Math.abs(decimal - median) / median;
      return deviation <= 0.75; // Within 75% of median
    });

    return filtered2.length > 0 ? filtered2 : filtered1; // Fallback to first filter if second is too aggressive
  }

  // best back price = max decimal (not max |american|) from filtered same-side odds
  private pickBestPrice(side: Array<{american?: number, odds?: number}>):
    { idx: number, american: number, decimal: number } | null {
    if (!side || side.length === 0) return null;

    // Filter outliers first
    const filteredSide = this.filterOutliers(side);
    if (filteredSide.length === 0) return null;

    // Convert odds to american format if needed
    const americanOdds = filteredSide.map(s => s.american || s.odds || 0);

    let bestIdx = 0, bestDec = this.americanToDecimalStrict(americanOdds[0]);
    for (let i = 1; i < americanOdds.length; i++) {
      const d = this.americanToDecimalStrict(americanOdds[i]);
      if (d > bestDec) { bestDec = d; bestIdx = i; }
    }
    const american = americanOdds[bestIdx];
    return { idx: bestIdx, american, decimal: bestDec };
  }

  // EV% using fair probability p (0..1) and a single book price (american)
  private evPercentFromFairAndAmerican(american: number, fairProb: number): number {
    const p = fairProb > 1 ? fairProb / 100 : fairProb;      // accept % too
    const D = this.americanToDecimalStrict(american);
    return p * (D - 1) - (1 - p);                            // fraction (e.g., 0.071)
  }

  // display rule: keep internal precision; round only on output
  private formatEVPercent(evFraction: number): number {
    const pct = evFraction * 100;
    if (Math.abs(pct) < 0.05) return 0.0;                    // show 0.0% if tiny
    return Math.round(pct * 10) / 10;                        // 1 dp
  }

  // Devig for a two-way market using one price from each side (decimal odds)
  private devigTwoWayFairProb(decA: number, decB: number): number {
    const pA = 1 / decA, pB = 1 / decB;
    const sum = pA + pB;
    if (sum <= 0) return 0.5;
    return pA / sum; // fair prob for side A
  }


  // CONSOLIDATED: calculateEVFromFieldOdds
  // NOW USES: shared/lib/bettingCalculations.ts
  // Returns: { evPercent, fairLine, bestOdds, bestBook, fairProb }
  // ✅ FIX: Now returns the ACTUAL odds used for EV calculation
  private calculateEVFromFieldOdds(
    sideOdds: Array<{book: string, odds?: number, american?: number}>,
    oppositeSideOdds?: Array<{book: string, odds?: number, american?: number}>,
    modelFairProb?: number, // OPTIONAL: pass your Sharp Shot projection here (0..1 or 0..100)
    marketType: 'spread' | 'total' | 'moneyline' = 'moneyline',
    line?: number
  ): { evPercent: number; fairLine: string; bestOdds: number; bestBook: string; fairProb: number } {
    if (!sideOdds || sideOdds.length === 0) {
      return { evPercent: 0, fairLine: 'N/A', bestOdds: 0, bestBook: 'Unknown', fairProb: 0.5 };
    }

    const best = this.pickBestPrice(sideOdds);
    if (!best) {
      return { evPercent: 0, fairLine: 'N/A', bestOdds: 0, bestBook: 'Unknown', fairProb: 0.5 };
    }

    // Get the book name for the best odds
    const bestBook = sideOdds[best.idx]?.book || 'Unknown';

    // Convert sideOdds to format expected by calculateFairLine
    const formattedSideOdds = sideOdds.map(o => ({
      american: o.american || o.odds,
      decimal: o.american ? americanToDecimal(o.american) : (o.odds ? americanToDecimal(o.odds) : undefined)
    }));

    const formattedOppOdds = oppositeSideOdds?.map(o => ({
      american: o.american || o.odds,
      decimal: o.american ? americanToDecimal(o.american) : (o.odds ? americanToDecimal(o.odds) : undefined)
    }));

    // Calculate fair line using consolidated library
    const fairLineResult = calculateFairLine(
      formattedSideOdds,
      formattedOppOdds,
      modelFairProb,
      marketType,
      line
    );

    // Calculate EV using fair probability
    const fairProb = fairLineResult.fairProbability;
    const evResult = calculateEV(best.american, fairProb, 100);

    console.log(`📊 EV CALC: Best odds ${best.american} from ${bestBook}, Fair prob ${(fairProb * 100).toFixed(1)}%, EV ${evResult.evPercent.toFixed(1)}%`);

    return {
      evPercent: Math.round(evResult.evPercent * 10) / 10,  // 1 decimal: 5.8%
      fairLine: fairLineResult.fairLine,
      bestOdds: Math.round(best.american * 10) / 10,  // ✅ 1 decimal: -105.5, +172.3
      bestBook,                  // ✅ Return the book name
      fairProb                   // ✅ Return fair probability (0-1)
    };
  }

  // Use this for internal calculations (no rounding)
  private rawWinProbabilityFromAmerican(american: number): number {
    return this.impliedProbFromAmerican(american) * 100; // if you need %
  }

  // ARB ROI calculation
  private arbRoiFromAmerican(americanA: number, americanB: number): number {
    const dA = this.americanToDecimalStrict(americanA);
    const dB = this.americanToDecimalStrict(americanB);
    const roi = 1 / (1/dA + 1/dB) - 1;      // fraction
    return Math.round(roi * 1000) / 10;     // % to 1 dp
  }

  // Consensus robustness: median of implied probs is stabler after outlier filter
  private consensusFromAmerican(odds: number[]): number {
    if (!odds || odds.length === 0) return 0;
    const probs = odds.map(o => this.impliedProbFromAmerican(o));
    const sorted = probs.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return this.decimalToAmericanStrict(1 / median);
  }

  // Player props EV: if you get price1 and price2, build an opposite side so devig works
  private makeOpposite(p1?: number, p2?: number): Array<{book: string, american: number}> | undefined {
    if (p1 && p2 && p1 !== 1 && p2 !== 1) {
      const converted = this.convertOddsFormats(p2);
      if (converted.american !== undefined && converted.american !== null) {
        return [{book: 'Synthetic', american: converted.american}];
      }
    }
    return undefined;
  }

  // Concurrency helper: chunk array for batch processing
  private chunks<T>(arr: T[], n: number): T[][] {
    return arr.length ? [arr.slice(0, n), ...this.chunks(arr.slice(n), n)] : [];
  }

  // Median helper for robust line calculations
  private median(nums: number[]): number | undefined {
    const arr = nums.filter(n => Number.isFinite(n));
    if (!arr.length) return undefined;
    arr.sort((a,b)=>a-b);
    return arr[Math.floor(arr.length/2)];
  }

  // Use median line for spreads/totals (don't rely on gameOdds.odds[0])
  private getMedianSpreadLine(oddsProviders: any[]): number | undefined {
    return this.median(oddsProviders.map(o => o.spread).filter((n: any) => typeof n === 'number'));
  }

  private getMedianTotalLine(oddsProviders: any[]): number | undefined {
    return this.median(oddsProviders.map(o => o.overUnder).filter((n: any) => typeof n === 'number'));
  }

  // Simple, readable line formatting (e.g., 3.33333 -> "3.33", keep plus sign for positives)
  private formatLine(x: number): string {
    const s = (Math.round(x * 100) / 100).toFixed(2);          // 2 dp
    const trimmed = s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return (x > 0 ? `+${trimmed}` : trimmed);
  }

  // Snap to nearest 0.01 and format, keeps + sign for positives
  private prettyLine(x: number): string {
    if (!Number.isFinite(x)) return '';
    const snapped = Math.round(x * 100) / 100; // 2 dp
    return this.formatLine(snapped);
  }

  private snapToStep(x: number, step: number): number {
    if (!isFinite(x) || !isFinite(step) || step <= 0) return x;
    return Math.round(x / step) * step;
  }

  private leagueForSnap(game: SharpShotGame): string {
    return this.mapSportToLeague(game.sport, game.leagueCode);
  }

  private spreadStepFor(game: SharpShotGame): number {
    const lg = this.leagueForSnap(game);
    // Soccer handicaps often in quarters
    if (lg === 'SOCCER' || lg === 'EPL' || lg.startsWith('Ligue') || lg.includes('LaLiga') || lg.includes('Serie') || lg.includes('Bundesliga') || lg === 'MLS' || lg === 'USL') {
      return 0.25;
    }
    // Most US sports spreads at 0.5
    return 0.5;
  }

  private totalStepFor(game: SharpShotGame): number {
    const lg = this.leagueForSnap(game);
    // Soccer totals often in quarters too
    if (lg === 'SOCCER' || lg === 'EPL' || lg.includes('LaLiga') || lg.includes('Serie') || lg.includes('Bundesliga') || lg === 'MLS' || lg === 'USL') {
      return 0.25;
    }
    return 0.5;
  }

  // Don't mix live + pregame for ARB flags (prevents absurd "+1000 vs -1000")
  // TIGHTENED: More strict for live data quality
  private isSaneArbPair(a: number, b: number, isSoccerML: boolean = false): boolean {
    // Soccer 3-way ML should never show ARB without draw leg
    if (isSoccerML) return false;

    // Opposite sides should have opposite signs
    if ((a >= 0 && b >= 0) || (a <= 0 && b <= 0)) return false;
    // Reasonable bounds
    if (Math.abs(a) > 1000 || Math.abs(b) > 1000) return false;
    const dA = this.americanToDecimalStrict(a);
    const dB = this.americanToDecimalStrict(b);

    // TIGHTENED: was 1.5, now 1.25 to catch more mismatches
    const ratio = dA > dB ? dA / dB : dB / dA;
    if (ratio >= 1.25) return false;

    // TIGHTENED: Implied probability sum should be very close to 100% (±5% instead of ±12%)
    const sum = (1/dA) + (1/dB);
    return sum > 0.95 && sum < 1.05;
  }

  // Check if sport is soccer (3-way moneyline)
  private isSoccerSport(sport: string, leagueCode?: string): boolean {
    const league = this.mapSportToLeague(sport, leagueCode);
    return league === 'SOCCER' ||
           league === 'MLS' ||
           league === 'EPL' ||
           league === 'La Liga' ||
           league === 'Serie A' ||
           league === 'Bundesliga' ||
           league === 'Ligue 1' ||
           league === 'Brasileirão A' ||
           league === 'USL' ||
           sport.toLowerCase() === 'soccer';
  }

  // Check if league is a major league (filter out minor leagues)
  private isMajorLeague(sport: string, leagueCode?: string): boolean {
    const league = this.mapSportToLeague(sport, leagueCode);

    // Major US Sports
    const majorUSLeagues = ['NFL', 'NBA', 'MLB', 'NHL', 'WNBA'];

    // Major College Sports
    const majorCollegeLeagues = ['NCAA FB', 'NCAA BK'];

    // Major Soccer Leagues
    const majorSoccerLeagues = [
      'EPL',           // English Premier League
      'La Liga',       // Spanish La Liga
      'Serie A',       // Italian Serie A
      'Bundesliga',    // German Bundesliga
      'Ligue 1',       // French Ligue 1
      'MLS',           // Major League Soccer (US)
      'UCL',           // UEFA Champions League
      'UEL',           // UEFA Europa League
      'Brasileirão A'  // Brazilian Serie A
    ];

    // Major Other Sports
    const majorOtherLeagues = [
      'UFC',           // UFC MMA
      'PGA',           // PGA Golf
      'ATP',           // ATP Tennis
      'WTA'            // WTA Tennis
    ];

    // Combine all major leagues
    const allMajorLeagues = [
      ...majorUSLeagues,
      ...majorCollegeLeagues,
      ...majorSoccerLeagues,
      ...majorOtherLeagues
    ];

    return allMajorLeagues.includes(league);
  }

  private bestAmerican(side: Array<{american?: number, odds?: number}>): number | undefined {
    const best = this.pickBestPrice(side);
    return best ? best.american : undefined;
  }

  // Get trading terminal stats
  async getTradingTerminalStats(sport?: string): Promise<{
    totalEvents: number;
    liveEvents: number;
    upcomingEvents: number;
    finalEvents: number;
    positiveEVEvents: number;
    leagues: string[];
    markets: string[];
    avgEV: number;
    maxEV: number;
  }> {
    try {
      const events = await this.getTradingTerminalData(sport);

      const liveEvents = events.filter(e => e.gameStatus === 'live').length;
      const upcomingEvents = events.filter(e => e.gameStatus === 'upcoming').length;
      const finalEvents = events.filter(e => e.gameStatus === 'final').length;
      const positiveEVEvents = events.filter(e => e.evPercentage > 0).length;

      const leagues = Array.from(new Set(events.map(e => e.league)));
      const markets = Array.from(new Set(events.map(e => e.market)));

      const avgEV = events.length > 0
        ? Math.round(events.reduce((sum, e) => sum + e.evPercentage, 0) / events.length * 10) / 10
        : 0;
      const maxEV = events.length > 0
        ? Math.round(Math.max(...events.map(e => e.evPercentage)) * 10) / 10
        : 0;

      return {
        totalEvents: events.length,
        liveEvents,
        upcomingEvents,
        finalEvents,
        positiveEVEvents,
        leagues,
        markets,
        avgEV,
        maxEV,
      };
    } catch (error) {
      console.error('❌ [TRADING TERMINAL STATS] Error:', error);
      throw error;
    }
  }

  // Deduplicate providers with the same book name and odds
  // This handles cases where BET_RIVERS_PA, BET_RIVERS_NY, etc. all map to "BetRivers" with identical odds
  private deduplicateProviderOdds(odds: Array<{ book: string; american: number; european: number; odds: number; url: string }>): Array<{ book: string; american: number; european: number; odds: number; url: string }> {
    const seen = new Map<string, { book: string; american: number; european: number; odds: number; url: string }>();

    odds.forEach(odd => {
      // Create a unique key based on book name and odds value
      const key = `${odd.book}-${odd.american}`;

      // Only keep the first occurrence of each book+odds combination
      if (!seen.has(key)) {
        seen.set(key, odd);
      }
    });

    return Array.from(seen.values());
  }

  // Create comprehensive opportunities from real odds data
  private createOpportunitiesFromRealOdds(game: SharpShotGame, gameOdds: SharpShotOdds, status: 'live' | 'upcoming' | 'final', gameSplits?: OddsSplits): TradingTerminalEvent[] {
    const opportunities: TradingTerminalEvent[] = [];

    // Extract odds from API response - get ALL providers, not just first 12
    const oddsProviders = gameOdds.odds
      .filter(odds => odds.provider && odds.provider !== 'CONSENSUS')
      .filter(odds => {
        // Filter out invalid odds - check for valid decimal odds (API format)
        const isValidOdds = (oddsValue: number) => {
          // API returns decimal odds, so check for valid decimal range
          return oddsValue && oddsValue > 1 && oddsValue !== 1; // 1 = disabled wager
        };

        const hasValidMoneyline = (odds.moneyLine1 && isValidOdds(odds.moneyLine1)) ||
                                 (odds.moneyLine2 && isValidOdds(odds.moneyLine2));
        const hasValidSpread = (odds.spreadLine1 && isValidOdds(odds.spreadLine1)) ||
                              (odds.spreadLine2 && isValidOdds(odds.spreadLine2));
        const hasValidTotal = (odds.overUnderLineOver && isValidOdds(odds.overUnderLineOver)) ||
                             (odds.overUnderLineUnder && isValidOdds(odds.overUnderLineUnder));

        return hasValidMoneyline || hasValidSpread || hasValidTotal;
      });

    console.log(`🔍 DEBUG: Valid providers found (${oddsProviders.length}):`, oddsProviders.map(o => o.provider));
    console.log(`🔍 DEBUG: FANDUEL found:`, oddsProviders.find(o => o.provider === 'FANDUEL'));
    console.log(`🔍 DEBUG: DRAFTKINGS found:`, oddsProviders.find(o => o.provider === 'DRAFTKINGS'));

    // 1. Moneyline opportunities for both teams
    console.log(`🔍 DEBUG: Creating home moneyline odds from ${oddsProviders.length} providers`);
    const homeMoneylineOdds = oddsProviders
      .filter(odds => {
        const hasOdds = odds.moneyLine2;
        console.log(`🔍 DEBUG: Provider ${odds.provider} has moneyLine2: ${hasOdds}`);
        return hasOdds;
      })
      .map(odds => {
        const mappedBook = this.mapProviderToSportsbook(odds.provider);
        console.log(`🔍 API DATA DEBUG: Provider ${odds.provider} (${mappedBook}) - moneyLine2: ${odds.moneyLine2}, type: ${typeof odds.moneyLine2}`);
        const oddsFormats = this.convertOddsFormats(odds.moneyLine2!);
        console.log(`🔍 DEBUG: Created home odds for ${mappedBook}: ${odds.moneyLine2} -> American: ${oddsFormats.american}, European: ${oddsFormats.european}`);

        // Skip if odds are disabled (null)
        if (oddsFormats.american === null) {
          return null;
        }

        return {
          book: mappedBook,
          american: oddsFormats.american,
          european: oddsFormats.european,
          odds: oddsFormats.american, // Legacy field for compatibility
          url: odds.url || '#'
        };
      })
      .filter((odds): odds is { book: string; american: number; european: number; odds: number; url: string } => odds !== null);

    // Deduplicate providers (e.g., BET_RIVERS_PA, BET_RIVERS_NY -> BetRivers)
    const deduplicatedHomeMoneylineOdds = this.deduplicateProviderOdds(homeMoneylineOdds);
    console.log(`🔍 DEBUG: Created ${homeMoneylineOdds.length} home moneyline odds, deduplicated to ${deduplicatedHomeMoneylineOdds.length}`);

    const awayMoneylineOdds = oddsProviders
      .filter(odds => odds.moneyLine1) // Only include providers with moneyLine1
      .map(odds => {
        const oddsFormats = this.convertOddsFormats(odds.moneyLine1!);
        if (oddsFormats.american === null) return null;

        return {
        book: this.mapProviderToSportsbook(odds.provider),
          american: oddsFormats.american,
          european: oddsFormats.european,
          odds: oddsFormats.american, // Legacy field for compatibility
        url: odds.url || '#'
        };
      })
      .filter((odds): odds is { book: string; american: number; european: number; odds: number; url: string } => odds !== null);

    // Deduplicate providers (e.g., BET_RIVERS_PA, BET_RIVERS_NY -> BetRivers)
    const deduplicatedAwayMoneylineOdds = this.deduplicateProviderOdds(awayMoneylineOdds);
    console.log(`🔍 DEBUG: Created ${awayMoneylineOdds.length} away moneyline odds, deduplicated to ${deduplicatedAwayMoneylineOdds.length}`);

    // Home team moneyline
    if (deduplicatedHomeMoneylineOdds.length > 0) {
      const isSoccer = this.isSoccerSport(game.sport, game.leagueCode);
      const bestHome = this.bestAmerican(deduplicatedHomeMoneylineOdds);
      const bestAway = this.bestAmerican(deduplicatedAwayMoneylineOdds);

      // ARB check: pass isSoccer flag to prevent 3-way ML ARB
      const arbPct =
        (bestHome !== undefined && bestAway !== undefined && this.isSaneArbPair(bestHome, bestAway, isSoccer))
          ? Math.max(0, this.arbRoiFromAmerican(bestHome, bestAway))
          : 0;

      // EV calculation: For soccer 3-way ML, only use model projection (no 2-way devig)
      const homeMLResult = isSoccer
        ? this.calculateEVFromFieldOdds(
            deduplicatedHomeMoneylineOdds,
            undefined, // Don't use opposite side for 3-way market
            /* modelFairProbForHome */ undefined,
            'moneyline'
          )
        : this.calculateEVFromFieldOdds(
            deduplicatedHomeMoneylineOdds,
            deduplicatedAwayMoneylineOdds,
            /* modelFairProbForHome */ undefined,
            'moneyline'
          );

      // ✅ FIX: Use the BEST odds (what EV was calculated from), not consensus
      opportunities.push({
        id: `${game.gameID}-moneyline-home`,
        event: `${game.team1Name} vs ${game.team2Name}`,
        league: this.mapSportToLeague(game.sport, game.leagueCode),
        prop: `${game.team2Name} ML`,
        market: 'Moneyline',
        myOdds: homeMLResult.bestOdds,  // ✅ FIX: Use best odds (matches EV calc)
        myOddsEuropean: this.americanToEuropean(homeMLResult.bestOdds),
        winProbability: homeMLResult.fairProb * 100,  // ✅ FIX: Use fair prob from calc (0-1 → 0-100)
        evPercentage: homeMLResult.evPercent,
        fairLine: homeMLResult.fairLine,
        arbPercentage: arbPct > 0 ? arbPct : undefined,
        fieldOdds: deduplicatedHomeMoneylineOdds,
        gameTime: this.formatGameTime(game.time, game.timeLeft, status),
        isLive: status === 'live',
        gameStatus: status,
        points: game.points,
        highPoints: game.highPoints,
        pointsLevel: game.pointsLevel,
        rationale: game.rationale,
        headline: game.headline,
        ...this.getBettingSplits(gameSplits, 'Moneyline', 'home')
      });
    }

    // Away team moneyline
    if (deduplicatedAwayMoneylineOdds.length > 0) {
      const isSoccer = this.isSoccerSport(game.sport, game.leagueCode);
      const bestAway = this.bestAmerican(deduplicatedAwayMoneylineOdds);
      const bestHome = this.bestAmerican(deduplicatedHomeMoneylineOdds);

      // ARB check: pass isSoccer flag to prevent 3-way ML ARB
      const arbPct =
        (bestHome !== undefined && bestAway !== undefined && this.isSaneArbPair(bestHome, bestAway, isSoccer))
          ? Math.max(0, this.arbRoiFromAmerican(bestHome, bestAway))
          : 0;

      // EV calculation: For soccer 3-way ML, only use model projection (no 2-way devig)
      const awayMLResult = isSoccer
        ? this.calculateEVFromFieldOdds(
            deduplicatedAwayMoneylineOdds,
            undefined, // Don't use opposite side for 3-way market
            /* modelFairProbForAway */ undefined,
            'moneyline'
          )
        : this.calculateEVFromFieldOdds(
            deduplicatedAwayMoneylineOdds,
            deduplicatedHomeMoneylineOdds,
            /* modelFairProbForAway */ undefined,
            'moneyline'
          );

      // ✅ FIX: Use the BEST odds (what EV was calculated from), not consensus
      opportunities.push({
        id: `${game.gameID}-moneyline-away`,
        event: `${game.team1Name} vs ${game.team2Name}`,
        league: this.mapSportToLeague(game.sport, game.leagueCode),
        prop: `${game.team1Name} ML`,
        market: 'Moneyline',
        myOdds: awayMLResult.bestOdds,  // ✅ FIX: Use best odds (matches EV calc)
        myOddsEuropean: this.americanToEuropean(awayMLResult.bestOdds),
        winProbability: awayMLResult.fairProb * 100,  // ✅ FIX: Use fair prob from calc (0-1 → 0-100)
        evPercentage: awayMLResult.evPercent,
        fairLine: awayMLResult.fairLine,
        arbPercentage: arbPct > 0 ? arbPct : undefined,
        fieldOdds: deduplicatedAwayMoneylineOdds,
        gameTime: this.formatGameTime(game.time, game.timeLeft, status),
        isLive: status === 'live',
        gameStatus: status,
        points: game.points,
        highPoints: game.highPoints,
        pointsLevel: game.pointsLevel,
        rationale: game.rationale,
        headline: game.headline,
        ...this.getBettingSplits(gameSplits, 'Moneyline', 'away')
      });
    }

    // 2. Spread opportunities
    const homeSpreadOdds = oddsProviders
      .filter(odds => odds.spreadLine2) // Only include providers with spreadLine2
      .map(odds => {
        const oddsFormats = this.convertOddsFormats(odds.spreadLine2!);
        const americanOdds = oddsFormats.american;
        if (americanOdds === null) return null;

        return {
        book: this.mapProviderToSportsbook(odds.provider),
          american: americanOdds,
          european: oddsFormats.european,
          odds: americanOdds, // Legacy field
        url: odds.url || '#'
        };
      })
      .filter((odds): odds is { book: string; american: number; european: number; odds: number; url: string } => odds !== null);

    const awaySpreadOdds = oddsProviders
      .filter(odds => odds.spreadLine1) // Only include providers with spreadLine1
      .map(odds => {
        const oddsFormats = this.convertOddsFormats(odds.spreadLine1!);
        const americanOdds = oddsFormats.american;
        if (americanOdds === null) return null;

        return {
        book: this.mapProviderToSportsbook(odds.provider),
          american: americanOdds,
          european: oddsFormats.european,
          odds: americanOdds, // Legacy field
        url: odds.url || '#'
        };
      })
      .filter((odds): odds is { book: string; american: number; european: number; odds: number; url: string } => odds !== null);

    // Deduplicate spread odds
    const deduplicatedHomeSpreadOdds = this.deduplicateProviderOdds(homeSpreadOdds);
    const deduplicatedAwaySpreadOdds = this.deduplicateProviderOdds(awaySpreadOdds);
    console.log(`🔍 DEBUG: Spread odds - Home: ${homeSpreadOdds.length} -> ${deduplicatedHomeSpreadOdds.length}, Away: ${awaySpreadOdds.length} -> ${deduplicatedAwaySpreadOdds.length}`);

    // Use median spread line for display
    let spreadLine = this.getMedianSpreadLine(oddsProviders);
    if (spreadLine !== undefined) {
      spreadLine = this.snapToStep(spreadLine, this.spreadStepFor(game));
    }

    // Home team spread
    if (deduplicatedHomeSpreadOdds.length > 0 && spreadLine !== undefined) {
      const homeSpreadResult = this.calculateEVFromFieldOdds(
        deduplicatedHomeSpreadOdds,
        deduplicatedAwaySpreadOdds,
        /* model p for this side if available */ undefined,
        'spread',
        spreadLine
      );

      // ✅ FIX: Use the BEST odds (what EV was calculated from), not consensus
      opportunities.push({
        id: `${game.gameID}-spread-home`,
        event: `${game.team1Name} vs ${game.team2Name}`,
        league: this.mapSportToLeague(game.sport, game.leagueCode),
        prop: `${game.team2Name} ${this.prettyLine(spreadLine)}`,
        market: 'Spread',
        myOdds: homeSpreadResult.bestOdds,  // ✅ FIX: Use best odds (matches EV calc)
        myOddsEuropean: this.americanToEuropean(homeSpreadResult.bestOdds),
        winProbability: homeSpreadResult.fairProb * 100,  // ✅ FIX: Use fair prob from calc (0-1 → 0-100)
        evPercentage: homeSpreadResult.evPercent,
        fairLine: homeSpreadResult.fairLine,
        fieldOdds: deduplicatedHomeSpreadOdds,
        gameTime: this.formatGameTime(game.time, game.timeLeft, status),
        isLive: status === 'live',
        gameStatus: status,
        points: game.points,
        highPoints: game.highPoints,
        pointsLevel: game.pointsLevel,
        rationale: game.rationale,
        headline: game.headline,
        ...this.getBettingSplits(gameSplits, 'Spread', 'home')
      });
    }

    // Away team spread
    if (deduplicatedAwaySpreadOdds.length > 0 && spreadLine !== undefined) {
      const awaySpread = -spreadLine; // Flip the spread for away team
      const awaySpreadResult = this.calculateEVFromFieldOdds(
        deduplicatedAwaySpreadOdds,
        deduplicatedHomeSpreadOdds,
        /* model p for this side if available */ undefined,
        'spread',
        awaySpread
      );

      // ✅ FIX: Use the BEST odds (what EV was calculated from), not consensus
      opportunities.push({
        id: `${game.gameID}-spread-away`,
        event: `${game.team1Name} vs ${game.team2Name}`,
        league: this.mapSportToLeague(game.sport, game.leagueCode),
        prop: `${game.team1Name} ${this.prettyLine(awaySpread)}`,
        market: 'Spread',
        myOdds: awaySpreadResult.bestOdds,  // ✅ FIX: Use best odds (matches EV calc)
        myOddsEuropean: this.americanToEuropean(awaySpreadResult.bestOdds),
        winProbability: awaySpreadResult.fairProb * 100,  // ✅ FIX: Use fair prob from calc (0-1 → 0-100)
        evPercentage: awaySpreadResult.evPercent,
        fairLine: awaySpreadResult.fairLine,
        fieldOdds: deduplicatedAwaySpreadOdds,
        gameTime: this.formatGameTime(game.time, game.timeLeft, status),
        isLive: status === 'live',
        gameStatus: status,
        points: game.points,
        highPoints: game.highPoints,
        pointsLevel: game.pointsLevel,
        rationale: game.rationale,
        headline: game.headline,
        ...this.getBettingSplits(gameSplits, 'Spread', 'away')
      });
    }

      // 3. Over/Under opportunities
      const overOdds = oddsProviders
        .filter(odds => odds.overUnderLineOver) // Only include providers with overUnderLineOver
        .map(odds => {
          const oddsFormats = this.convertOddsFormats(odds.overUnderLineOver!);
          const americanOdds = oddsFormats.american;
          if (americanOdds === null) return null;

          return {
          book: this.mapProviderToSportsbook(odds.provider),
            american: americanOdds,
            european: oddsFormats.european,
            odds: americanOdds, // Legacy field
          url: odds.url || '#'
          };
        })
        .filter((odds): odds is { book: string; american: number; european: number; odds: number; url: string } => odds !== null);

      const underOdds = oddsProviders
        .filter(odds => odds.overUnderLineUnder) // Only include providers with overUnderLineUnder
        .map(odds => {
          const oddsFormats = this.convertOddsFormats(odds.overUnderLineUnder!);
          const americanOdds = oddsFormats.american;
          if (americanOdds === null) return null;

          return {
          book: this.mapProviderToSportsbook(odds.provider),
            american: americanOdds,
            european: oddsFormats.european,
            odds: americanOdds, // Legacy field
          url: odds.url || '#'
          };
        })
        .filter((odds): odds is { book: string; american: number; european: number; odds: number; url: string } => odds !== null);

      // Deduplicate total odds
      const deduplicatedOverOdds = this.deduplicateProviderOdds(overOdds);
      const deduplicatedUnderOdds = this.deduplicateProviderOdds(underOdds);
      console.log(`🔍 DEBUG: Total odds - Over: ${overOdds.length} -> ${deduplicatedOverOdds.length}, Under: ${underOdds.length} -> ${deduplicatedUnderOdds.length}`);

      // Use median total line for display
      let totalLine = this.getMedianTotalLine(oddsProviders);
      if (totalLine !== undefined) {
        totalLine = this.snapToStep(totalLine, this.totalStepFor(game));
      }

      // Over
      if (deduplicatedOverOdds.length > 0 && totalLine !== undefined) {
        const overResult = this.calculateEVFromFieldOdds(
          deduplicatedOverOdds,
          deduplicatedUnderOdds,
          /* model p for Over if available */ undefined,
          'total',
          totalLine
        );

        // ✅ FIX: Use the BEST odds (what EV was calculated from), not consensus
        opportunities.push({
          id: `${game.gameID}-over`,
          event: `${game.team1Name} vs ${game.team2Name}`,
          league: this.mapSportToLeague(game.sport, game.leagueCode),
          prop: `Over ${totalLine}`, // FIX: Remove prettyLine to avoid "+" on totals
          market: 'Total',
          myOdds: overResult.bestOdds,  // ✅ FIX: Use best odds (matches EV calc)
          myOddsEuropean: this.americanToEuropean(overResult.bestOdds),
          winProbability: overResult.fairProb * 100,  // ✅ FIX: Use fair prob from calc (0-1 → 0-100)
          evPercentage: overResult.evPercent,
          fairLine: overResult.fairLine,
          fieldOdds: deduplicatedOverOdds,
          gameTime: this.formatGameTime(game.time, game.timeLeft, status),
          isLive: status === 'live',
          gameStatus: status,
          points: game.points,
          highPoints: game.highPoints,
          pointsLevel: game.pointsLevel,
          rationale: game.rationale,
          headline: game.headline,
          ...this.getBettingSplits(gameSplits, 'Total', 'over')
        });
      }

      // Under
      if (deduplicatedUnderOdds.length > 0 && totalLine !== undefined) {
        const underResult = this.calculateEVFromFieldOdds(
          deduplicatedUnderOdds,
          deduplicatedOverOdds,
          /* model p for Under if available */ undefined,
          'total',
          totalLine
        );

        // ✅ FIX: Use the BEST odds (what EV was calculated from), not consensus
        opportunities.push({
          id: `${game.gameID}-under`,
          event: `${game.team1Name} vs ${game.team2Name}`,
          league: this.mapSportToLeague(game.sport, game.leagueCode),
          prop: `Under ${totalLine}`, // FIX: Remove prettyLine to avoid "+" on totals
          market: 'Total',
          myOdds: underResult.bestOdds,  // ✅ FIX: Use best odds (matches EV calc)
          myOddsEuropean: this.americanToEuropean(underResult.bestOdds),
          winProbability: underResult.fairProb * 100,  // ✅ FIX: Use fair prob from calc (0-1 → 0-100)
          evPercentage: underResult.evPercent,
          fairLine: underResult.fairLine,
          fieldOdds: deduplicatedUnderOdds,
          gameTime: this.formatGameTime(game.time, game.timeLeft, status),
          isLive: status === 'live',
          gameStatus: status,
          points: game.points,
          highPoints: game.highPoints,
          pointsLevel: game.pointsLevel,
          rationale: game.rationale,
          headline: game.headline,
          ...this.getBettingSplits(gameSplits, 'Total', 'under')
        });
      }

      // 4. Player Props opportunities
      if (gameOdds.playerProps && gameOdds.playerProps.length > 0) {
        console.log(`🎯 Creating ${gameOdds.playerProps.length} player prop opportunities for game ${game.gameID}`);
        const playerPropOpportunities = this.createPlayerPropOpportunities(game, gameOdds.playerProps, status);
        console.log(`🎯 Created ${playerPropOpportunities.length} player prop opportunities`);
        opportunities.push(...playerPropOpportunities);
      } else {
        console.log(`🎯 No player props found for game ${game.gameID} (${game.team1Name} vs ${game.team2Name})`);
      }

      return opportunities;
  }

  // Create player prop opportunities from SideOdds API data
  private createPlayerPropOpportunities(game: SharpShotGame, playerProps: any[], status: 'live' | 'upcoming' | 'final'): TradingTerminalEvent[] {
    const opportunities: TradingTerminalEvent[] = [];

    // Show many more player props - increased from 10/5 to 50/25
    // This ensures users see all available player props
    const maxProps = status === 'live' ? 50 : 25;
    const topProps = playerProps.slice(0, maxProps);

    topProps.forEach((prop, index) => {
      // Extract prop details from enriched SideOdds response structure
      const propName = prop.description || prop.title || `Player Prop ${index + 1}`;
      const playerName = prop.playerName || 'Unknown Player';
      const playerTeam = prop.playerTeam || 'Unknown Team';
      const playerID = prop.playerID || null; // Store the permanent player ID
      const market = prop.market || 'Player Prop';
      const value = prop.value || '';

      // Handle different prop types according to API docs:
      // - price: single option outright bet (e.g., team to win Super Bowl)
      // - price1/price2: two-option Yes/No bet (price1=Yes/Over, price2=No/Under)
      // - value: numerical line for Over/Under bets
      let oddsValue: number | null = null;

      if (prop.price && prop.price !== 1) {
        // Single option outright bet
        oddsValue = prop.price;
      } else if (prop.price1 && prop.price2 && prop.price1 !== 1 && prop.price2 !== 1) {
        // Two-option bet - use price1 (Yes/Over) as default
        oddsValue = prop.price1;
      }

      // Only create opportunities for valid odds (not disabled wagers where price = 1)
      if (oddsValue === null) {
        console.log(`⚠️ Skipping disabled player prop: ${playerName} - ${propName}`);
        return;
      }

      const fieldOdds = prop.odds ? prop.odds.map((odd: any) => {
        // Handle the same pricing structure for individual odds
        let oddValue: number | null = null;
        if (odd.price && odd.price !== 1) {
          oddValue = odd.price;
        } else if (odd.price1 && odd.price1 !== 1) {
          oddValue = odd.price1;
        }

        if (oddValue === null) return null; // Skip disabled wagers

        const oddsFormats = this.convertOddsFormats(oddValue);
        if (oddsFormats.american === null) return null;

        return {
        book: this.mapProviderToSportsbook(odd.provider || 'Sportsbook'),
          american: oddsFormats.american,
          european: oddsFormats.european,
          odds: oddsFormats.american, // Legacy field for compatibility
        url: odd.url || `https://go.metabet.io/bet/${game.gameID}/${odd.provider}`
        };
      }).filter((odds: any): odds is { book: string; american: number; european: number; odds: number; url: string } => odds !== null) :
      (() => {
        const oddsFormats = this.convertOddsFormats(oddsValue!);
        if (oddsFormats.american === null) return [];

        return [{
        book: this.mapProviderToSportsbook(prop.provider || 'Sportsbook'),
          american: oddsFormats.american,
          european: oddsFormats.european,
          odds: oddsFormats.american, // Legacy field for compatibility
        url: prop.url || `https://go.metabet.io/bet/${game.gameID}`
      }];
      })();

      // Skip if no valid odds available
      if (fieldOdds.length === 0) {
        return;
      }

      // Deduplicate player prop odds
      const deduplicatedFieldOdds = this.deduplicateProviderOdds(fieldOdds);
      console.log(`🔍 DEBUG: Player prop odds - ${fieldOdds.length} -> ${deduplicatedFieldOdds.length} for ${playerName} - ${propName}`);

      const consensusOdds = deduplicatedFieldOdds[0].american || deduplicatedFieldOdds[0].odds;
      const propResult = this.calculateEVFromFieldOdds(
        deduplicatedFieldOdds,
        this.makeOpposite(prop.price1, prop.price2), // Build synthetic opposite side for devig
        /* modelFairProb */ undefined,
        'moneyline' // Player props treated as moneyline for fair line calculation
      );

      opportunities.push({
        id: `${game.gameID}-player-prop-${index}`,
        event: `${game.team1Name} vs ${game.team2Name}`,
        league: this.mapSportToLeague(game.sport, game.leagueCode),
        prop: `${playerName} (${playerTeam}) - ${propName}${value ? ` ${value}` : ''}`,
        market: market,
        myOdds: consensusOdds,
        myOddsEuropean: this.americanToEuropean(consensusOdds), // FIX: Always derive from myOdds
        winProbability: this.calculateWinProbability(consensusOdds),
        evPercentage: propResult.evPercent,
        fairLine: propResult.fairLine,
        fieldOdds: deduplicatedFieldOdds,
        gameTime: this.formatGameTime(game.time, game.timeLeft, status),
        isLive: status === 'live',
        gameStatus: status,
        points: game.points,
        highPoints: game.highPoints,
        pointsLevel: game.pointsLevel,
        rationale: game.rationale,
        headline: game.headline,
        playerID: playerID // Include the permanent player ID
      });
    });

    return opportunities;
  }
}