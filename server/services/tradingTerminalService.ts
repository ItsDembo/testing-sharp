import { API_KEY, API_BASE_URL } from '../sportsDataService';

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
        team1Name = team1Name.trim().replace(/\s+/g, ' ');
        team2Name = team2Name.trim().replace(/\s+/g, ' ');

        // If team names are empty or just numbers, try to extract from other fields
        if (!team1Name || team1Name.length < 2) {
          team1Name = game.team1City || game.awayCity || 'Away Team';
        }
        if (!team2Name || team2Name.length < 2) {
          team2Name = game.team2City || game.homeCity || 'Home Team';
        }

        // Extract league code with better fallback
        let leagueCode = game.leagueCode || game.league || game.sport || '';
        leagueCode = leagueCode.trim().toUpperCase();

        // Map common league codes to proper names
        const leagueCodeMap: {[key: string]: string} = {
          'BBM': 'MLB',
          'FBP': 'NFL',
          'BKP': 'NBA',
          'HOP': 'NHL',
          'HCP': 'NHL',
          'BKC': 'NCAA BK',
          'FBC': 'NCAA FB',
          'SOE': 'EPL',
          'SOG': 'Bundesliga',
          'SOI': 'Serie A',
          'SOS': 'La Liga',
          'SOF': 'Ligue 1',
          'SOF2': 'Ligue 2',
          'SOZ': 'Brasileirão A',
          'SOZ2': 'Brasileirão B',
          'SOS2': 'LaLiga 2'
        };

        leagueCode = leagueCodeMap[leagueCode] || leagueCode || 'Unknown League';

        return {
          ...game,
          team1Name: team1Name,
          team2Name: team2Name,
          leagueCode: leagueCode,
          // preserve original sport from API; use leagueCode only as supplemental info
          sport: game.sport || leagueCode
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
          // Extract team names from SiriusXM links (most reliable)
          let team1Name = '';
          let team2Name = '';
          let leagueCode = 'UNKNOWN';

          if (link.links && Array.isArray(link.links)) {
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

          // Fallback to headline parsing if SiriusXM parsing failed
          if (!team1Name || !team2Name) {
            const headline = link.headline || '';

            // Try to extract team names from headlines like "Royals (Wacha 9-11, 3.45) when they play host to Mariners"
            const hostMatch = headline.match(/([A-Za-z\s]+)\s*\([^)]+\)\s+when they play host to\s+([A-Za-z\s]+)/i);
            if (hostMatch) {
              team2Name = team2Name || hostMatch[1].trim();
              team1Name = team1Name || hostMatch[2].trim();
            }

            // Try other patterns
            const vsMatch = headline.match(/([A-Za-z\s]+)\s+(?:vs|v|at|@)\s+([A-Za-z\s]+)/i);
            if (vsMatch && !team1Name && !team2Name) {
              team1Name = vsMatch[1].trim();
              team2Name = vsMatch[2].trim();
            }

            // Determine league from headline if not set
            if (leagueCode === 'UNKNOWN') {
              if (headline.includes('MLB') || headline.includes('baseball')) leagueCode = 'BBM';
              else if (headline.includes('NFL') || headline.includes('football')) leagueCode = 'FBP';
              else if (headline.includes('NBA') || headline.includes('basketball')) leagueCode = 'BKP';
              else if (headline.includes('NHL') || headline.includes('hockey')) leagueCode = 'HCP';
              else if (headline.includes('Soccer') || headline.includes('La Liga')) leagueCode = 'SOS';
            }
          }

          // Final fallbacks with better team name extraction
          if (!team1Name || team1Name.length < 2) {
            team1Name = link.team1City || link.awayTeam || 'Away Team';
          }
          if (!team2Name || team2Name.length < 2) {
            team2Name = link.team2City || link.homeTeam || 'Home Team';
          }

          // Clean up team names
          team1Name = team1Name.trim().replace(/\s+/g, ' ');
          team2Name = team2Name.trim().replace(/\s+/g, ' ');

          // Map league code to proper name
          const leagueCodeMap: {[key: string]: string} = {
            'BBM': 'MLB',
            'FBP': 'NFL',
            'BKP': 'NBA',
            'HOP': 'NHL',
            'HCP': 'NHL',
            'BKC': 'NCAA BK',
            'FBC': 'NCAA FB',
            'SOE': 'EPL',
            'SOG': 'Bundesliga',
            'SOI': 'Serie A',
            'SOS': 'La Liga',
            'SOF': 'Ligue 1',
            'SOF2': 'Ligue 2',
            'SOZ': 'Brasileirão A',
            'SOZ2': 'Brasileirão B',
            'SOS2': 'LaLiga 2'
          };

          const mappedLeagueCode = leagueCodeMap[leagueCode] || leagueCode || 'Unknown League';

          gameMap.set(link.gameID, {
            gameID: link.gameID,
            sport: mappedLeagueCode,
            team1ID: link.team1ID || `team1_${link.gameID}`,
            team1City: link.team1City || '',
            team1Name: team1Name,
            team2ID: link.team2ID || `team2_${link.gameID}`,
            team2City: link.team2City || '',
            team2Name: team2Name,
            leagueCode: mappedLeagueCode,
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

    // Process more games for better coverage, but prioritize live games
    const gamesToProcess = sortedGames.slice(0, 15);
    console.log(`⚡ Processing ${gamesToProcess.length} games (prioritizing live games)`);

    for (const game of gamesToProcess) {
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
          continue;
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
    }

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


    games.forEach(game => {
      const status = this.determineGameStatus(game);

      // Skip final games - only show live and upcoming
      if (status === 'final') {
        return;
      }

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
    // Fallback: now
    return new Date().toISOString();
  }

  // Map sport/league codes to display league name
  private mapSportToLeague(sport: string, leagueCode?: string): string {
    const code = (leagueCode || '').toUpperCase();
    const sportLower = (sport || '').toLowerCase();

    const leagueCodeMap: {[key: string]: string} = {
      'BBM': 'MLB',
      'FBP': 'NFL',
      'BKP': 'NBA',
      'HOP': 'NHL',
      'HCP': 'NHL',
      'BKC': 'NCAA BK',
      'FBC': 'NCAA FB',
      'SOE': 'EPL',
      'SOG': 'Bundesliga',
      'SOI': 'Serie A',
      'SOS': 'La Liga',
      'SOF': 'Ligue 1',
      'SOF2': 'Ligue 2',
      'SOZ': 'Brasileirão A',
      'SOZ2': 'Brasileirão B',
      'SOS2': 'LaLiga 2'
    };

    if (code && leagueCodeMap[code]) return leagueCodeMap[code];

    const sportMap: {[key: string]: string} = {
      'nba': 'NBA',
      'nfl': 'NFL',
      'mlb': 'MLB',
      'nhl': 'NHL',
      'ncaab': 'NCAA BK',
      'ncaafb': 'NCAA FB',
      'ncaaf': 'NCAA FB',
      'soccer': 'SOCCER',
      'futbol': 'SOCCER',
      'football': 'NFL',
      'tennis': 'TENNIS',
      'atp': 'TENNIS',
      'wta': 'TENNIS',
      'golf': 'GOLF',
      'glf': 'GOLF',
      'mma': 'MMA',
      'ufc': 'MMA',
      'boxing': 'BOXING',
      'wnba': 'WNBA'
    };

    if (sportMap[sportLower]) return sportMap[sportLower];

    // Heuristics to avoid "UNKNOWN"
    if (sportLower.startsWith('so') || sportLower.includes('premier') || sportLower.includes('liga')) return 'SOCCER';
    if (sportLower.includes('tennis')) return 'TENNIS';
    if (sportLower.includes('golf')) return 'GOLF';
    if (sportLower.includes('mma') || sportLower.includes('ufc')) return 'MMA';

    return (sport || 'Unknown').toString().toUpperCase();
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
      'POINTSBET': 'PointsBet',
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
      'HARD_ROCK': 'Hard Rock',
      'ESPNBET': 'ESPN Bet',
      'FANATICS': 'Fanatics',
      'UNIBET': 'Unibet',
      'WILLIAM_HILL': 'William Hill',
      'BET365': 'Bet365',
      'BET_365': 'Bet365',
      'BOVADA': 'Bovada',
      'BET_ONLINE': 'BetOnline',
      'SUGAR_HOUSE_NJ': 'SugarHouse',
      'SPORTINGBET': 'SportingBet',
      'SPORTS_INTERACTION': 'Sports Interaction'
    };

    const mappedName = providerMap[provider] || provider;
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
      const american = Math.round(inputOdds);
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
      americanOdds = Math.round(-1 * (1 / (inputOdds - 1)) * 100);
      console.log(`🔍 CONVERSION DEBUG: Underdog conversion: ${inputOdds} -> ${americanOdds}`);

      // Cap extreme negative odds
      if (americanOdds < -1000) {
        console.log(`⚠️ American odds too extreme (negative): ${americanOdds}, capping at -1000`);
        americanOdds = -1000;
      }
    } else {
      americanOdds = Math.round((inputOdds - 1) * 100);
      console.log(`🔍 CONVERSION DEBUG: Favorite conversion: ${inputOdds} -> ${americanOdds}`);

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
  private calculateWinProbability(americanOdds: number): number {
    if (!americanOdds) return 50;

    if (americanOdds > 0) {
      return Math.round((100 / (americanOdds + 100)) * 100 * 10) / 10;
    } else {
      return Math.round((Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)) * 100 * 10) / 10;
    }
  }

  // Calculate consensus odds from field odds
  private calculateConsensusOdds(allOdds: number[]): number {
    if (allOdds.length === 0) return -110;

    // Convert to implied probabilities, average, then convert back
    const impliedProbs = allOdds
      .filter(odds => odds !== null)
      .map(odds => {
        if (odds > 0) {
          return 100 / (odds + 100);
        } else {
          return Math.abs(odds) / (Math.abs(odds) + 100);
        }
      });

    if (impliedProbs.length === 0) return -110;

    const avgProb = impliedProbs.reduce((sum, prob) => sum + prob, 0) / impliedProbs.length;

    // Convert back to American odds
    if (avgProb >= 0.5) {
      return Math.round(-100 * avgProb / (1 - avgProb));
    } else {
      return Math.round(100 * (1 - avgProb) / avgProb);
    }
  }

  // Calculate EV from field odds (find best value)
  // Uses canonical EV calculation: EV% = ((Fair_Prob × Profit_If_Win) - ((1 - Fair_Prob) × Stake)) / Stake × 100
  private calculateEVFromFieldOdds(bookOdds: Array<{book: string, odds: number}>): number {
    if (bookOdds.length === 0) return 0;

    // Step 1: Calculate fair probability by devigging all book odds
    const validOdds = bookOdds.filter(b => b.odds && Number.isFinite(b.odds));
    if (validOdds.length === 0) return 0;

    // Convert all odds to implied probabilities
    const impliedProbs = validOdds.map(b => {
      const odds = b.odds;
      // Implied probability from American odds
      if (odds > 0) {
        return 100 / (odds + 100);
      } else {
        return Math.abs(odds) / (Math.abs(odds) + 100);
      }
    });

    // Devig by averaging (simple method - could use more sophisticated devigging)
    const avgImpliedProb = impliedProbs.reduce((sum, p) => sum + p, 0) / impliedProbs.length;
    const totalVig = impliedProbs.reduce((sum, p) => sum + p, 0);

    // Fair probability = remove vig proportionally
    const fairProb = totalVig > 1 ? avgImpliedProb / totalVig : avgImpliedProb;

    // Step 2: Calculate EV for each book using fair probability and find the best
    let bestEV = -Infinity;

    validOdds.forEach(bookOdd => {
      const bookOddsValue = bookOdd.odds;

      // Convert American odds to decimal
      const decimal = bookOddsValue > 0
        ? 1 + (bookOddsValue / 100)
        : 1 + (100 / Math.abs(bookOddsValue));

      // Calculate profit if win (for $100 stake)
      const stake = 100;
      const profitIfWin = stake * (decimal - 1);

      // Canonical EV formula: EV$ = (Fair_Prob × Profit_If_Win) - ((1 - Fair_Prob) × Stake)
      const evDollars = (fairProb * profitIfWin) - ((1 - fairProb) * stake);
      const evPercent = (evDollars / stake) * 100;

      if (evPercent > bestEV) {
        bestEV = evPercent;
      }
    });

    return bestEV === -Infinity ? 0 : Math.round(bestEV * 10) / 10;
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

    console.log(`🔍 DEBUG: Created ${homeMoneylineOdds.length} home moneyline odds`);

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

    // Home team moneyline
    if (homeMoneylineOdds.length > 0) {
      const consensusOdds = this.calculateConsensusOdds(homeMoneylineOdds.map(o => o.american));
      opportunities.push({
        id: `${game.gameID}-moneyline-home`,
        event: `${game.team1Name} vs ${game.team2Name}`,
        league: this.mapSportToLeague(game.sport, game.leagueCode),
        prop: `${game.team2Name} ML`,
        market: 'Moneyline',
        myOdds: consensusOdds,
        myOddsEuropean: homeMoneylineOdds[0]?.european || this.americanToEuropean(consensusOdds),
        winProbability: this.calculateWinProbability(consensusOdds),
        evPercentage: this.calculateEVFromFieldOdds(homeMoneylineOdds),
        fieldOdds: homeMoneylineOdds,
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
    if (awayMoneylineOdds.length > 0) {
      const consensusOdds = this.calculateConsensusOdds(awayMoneylineOdds.map(o => o.american || o.odds).filter(o => o !== null));
      opportunities.push({
        id: `${game.gameID}-moneyline-away`,
        event: `${game.team1Name} vs ${game.team2Name}`,
        league: this.mapSportToLeague(game.sport, game.leagueCode),
        prop: `${game.team1Name} ML`,
        market: 'Moneyline',
        myOdds: consensusOdds,
        winProbability: this.calculateWinProbability(consensusOdds),
        evPercentage: this.calculateEVFromFieldOdds(awayMoneylineOdds),
        fieldOdds: awayMoneylineOdds,
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

    // Home team spread
    if (homeSpreadOdds.length > 0 && gameOdds.odds[0]?.spread) {
      const consensusOdds = this.calculateConsensusOdds(homeSpreadOdds.map(o => o.american || o.odds).filter(o => o !== null));
      opportunities.push({
        id: `${game.gameID}-spread-home`,
        event: `${game.team1Name} vs ${game.team2Name}`,
        league: this.mapSportToLeague(game.sport, game.leagueCode),
        prop: `${game.team2Name} ${gameOdds.odds[0].spread > 0 ? '+' : ''}${gameOdds.odds[0].spread}`,
        market: 'Spread',
        myOdds: consensusOdds,
        winProbability: this.calculateWinProbability(consensusOdds),
        evPercentage: this.calculateEVFromFieldOdds(homeSpreadOdds),
        fieldOdds: homeSpreadOdds,
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
    if (awaySpreadOdds.length > 0 && gameOdds.odds[0]?.spread) {
      const consensusOdds = this.calculateConsensusOdds(awaySpreadOdds.map(o => o.american || o.odds).filter(o => o !== null));
      const awaySpread = -gameOdds.odds[0].spread; // Flip the spread for away team
      opportunities.push({
        id: `${game.gameID}-spread-away`,
        event: `${game.team1Name} vs ${game.team2Name}`,
        league: this.mapSportToLeague(game.sport, game.leagueCode),
        prop: `${game.team1Name} ${awaySpread > 0 ? '+' : ''}${awaySpread}`,
        market: 'Spread',
        myOdds: consensusOdds,
        winProbability: this.calculateWinProbability(consensusOdds),
        evPercentage: this.calculateEVFromFieldOdds(awaySpreadOdds),
        fieldOdds: awaySpreadOdds,
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

      // Over
      if (overOdds.length > 0 && gameOdds.odds[0]?.overUnder) {
        const consensusOdds = this.calculateConsensusOdds(overOdds.map(o => o.american || o.odds).filter(o => o !== null));
        opportunities.push({
          id: `${game.gameID}-over`,
          event: `${game.team1Name} vs ${game.team2Name}`,
          league: this.mapSportToLeague(game.sport, game.leagueCode),
          prop: `Over ${gameOdds.odds[0].overUnder}`,
          market: 'Total',
          myOdds: consensusOdds,
          winProbability: this.calculateWinProbability(consensusOdds),
          evPercentage: this.calculateEVFromFieldOdds(overOdds),
          fieldOdds: overOdds,
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
      if (underOdds.length > 0 && gameOdds.odds[0]?.overUnder) {
        const consensusOdds = this.calculateConsensusOdds(underOdds.map(o => o.american || o.odds).filter(o => o !== null));
        opportunities.push({
          id: `${game.gameID}-under`,
          event: `${game.team1Name} vs ${game.team2Name}`,
          league: this.mapSportToLeague(game.sport, game.leagueCode),
          prop: `Under ${gameOdds.odds[0].overUnder}`,
          market: 'Total',
          myOdds: consensusOdds,
          winProbability: this.calculateWinProbability(consensusOdds),
          evPercentage: this.calculateEVFromFieldOdds(underOdds),
          fieldOdds: underOdds,
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

    // Show more player props for live games, fewer for upcoming
    const maxProps = status === 'live' ? 10 : 5;
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
      let propType = 'single';

      if (prop.price && prop.price !== 1) {
        // Single option outright bet
        oddsValue = prop.price;
        propType = 'outright';
      } else if (prop.price1 && prop.price2 && prop.price1 !== 1 && prop.price2 !== 1) {
        // Two-option bet - use price1 (Yes/Over) as default
        oddsValue = prop.price1;
        propType = 'over_under';
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

      const consensusOdds = fieldOdds[0].american || fieldOdds[0].odds;

      opportunities.push({
        id: `${game.gameID}-player-prop-${index}`,
        event: `${game.team1Name} vs ${game.team2Name}`,
        league: this.mapSportToLeague(game.sport, game.leagueCode),
        prop: `${playerName} (${playerTeam}) - ${propName}${value ? ` ${value}` : ''}`,
        market: market,
        myOdds: consensusOdds,
        myOddsEuropean: fieldOdds[0].european || null,
        winProbability: this.calculateWinProbability(consensusOdds),
        evPercentage: this.calculateEVFromFieldOdds(fieldOdds),
        fieldOdds: fieldOdds,
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