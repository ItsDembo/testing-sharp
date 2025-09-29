// Vercel serverless function for odds API - Using real "Are You Watching This" API
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Get REAL current time from external API to ensure accuracy
  let currentTime;
  try {
    const timeResponse = await fetch('https://worldtimeapi.org/api/ip');
    const timeData = await timeResponse.json();
    currentTime = new Date(timeData.datetime);
    console.log(`🕐 REAL current time from API: ${currentTime.toISOString()}`);
    console.log(`🕐 REAL current time local: ${currentTime.toString()}`);
  } catch (error) {
    console.warn('⚠️ Could not fetch external time, using server time:', error.message);
    currentTime = new Date();
    console.log(`🕐 Fallback server time: ${currentTime.toISOString()}`);
  }
  
  console.log(`🕐 Using current time: ${currentTime.toISOString()}`);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const API_KEY = '3e8b23fdd1b6030714b9320484d7367b';
    const BASE_URL = 'https://areyouwatchingthis.com';
    
    console.log('🎯 Fetching LIVE games and real odds data...');
    
    // Step 1: Fetch games data from the enhanced API endpoint (XML)
    console.log(`🔍 Fetching games from: ${BASE_URL}/api/games?key=${API_KEY}`);
    console.log(`🔑 API Key (first 10 chars): ${API_KEY ? API_KEY.substring(0, 10) + '...' : 'MISSING'}`);
    
    const gamesResponse = await fetch(`${BASE_URL}/api/games?key=${API_KEY}`, {
      headers: {
        'Accept': 'application/xml, */*',
        'User-Agent': 'SharpShot/1.0'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    console.log(`📡 Games API response status: ${gamesResponse.status} ${gamesResponse.statusText}`);
    console.log(`📡 Games API response headers:`, Object.fromEntries(gamesResponse.headers.entries()));
    
    if (!gamesResponse.ok) {
      const errorText = await gamesResponse.text();
      console.error(`❌ Games API error response: ${errorText}`);
      throw new Error(`Games API error: ${gamesResponse.status} ${gamesResponse.statusText} - ${errorText}`);
    }

    let gamesData;
    try {
      // Parse XML response from Are You Watching This API
      const xmlText = await gamesResponse.text();
      console.log(`📄 Raw XML response (first 500 chars):`, xmlText.substring(0, 500));
      
      // Parse XML to extract game data
      gamesData = parseGamesFromXml(xmlText);
      console.log(`📄 Parsed games data:`, gamesData);
    } catch (parseError) {
      console.error('❌ Error parsing XML response:', parseError);
      throw new Error(`Failed to parse XML response: ${parseError.message}`);
    }
    
    // Step 2: Extract games from the response (handle different data structures)
    const games = extractGamesFromResponse(gamesData);
    console.log(`🎮 Found ${games.length} games`);
    
    // Step 3: Fetch odds for ALL sports (not just NFL)
    const oddsData = await fetchAllSportsOdds(games, API_KEY);
    console.log(`📊 Successfully fetched odds for ${Object.keys(oddsData).length} games`);
    
    // Step 4: Transform games to opportunities with proper status detection
    const allOpportunities = transformGamesToOpportunities(games, oddsData, currentTime);
    console.log(`📊 Transformation complete: ${allOpportunities.length} opportunities created`);
    
    // Log live game detection
    const liveGames = games.filter(g => g.isLive);
    const upcomingGames = games.filter(g => !g.isLive);
    console.log(`🎮 Live games detected: ${liveGames.length}`);
    console.log(`🎮 Upcoming games detected: ${upcomingGames.length}`);
    if (liveGames.length > 0) {
      console.log(`🎮 Sample live games:`, liveGames.slice(0, 3).map(g => ({
        teams: `${g.team1Name} vs ${g.team2Name}`,
        timeLeft: g.timeLeft,
        sport: g.sport
      })));
    }

    // DEDUPLICATE OPPORTUNITIES - Use team matchup as the primary key, keep most recent game
    const matchupMap = new Map();
    const uniqueOpportunities = [];
    
    for (const opp of allOpportunities) {
      const key = `${opp.event.home}-${opp.event.away}-${opp.market.type}`;
      if (!matchupMap.has(key) || new Date(opp.updatedAt) > new Date(matchupMap.get(key).updatedAt)) {
        matchupMap.set(key, opp);
      }
    }
    
    uniqueOpportunities.push(...matchupMap.values());
    console.log(`📊 Deduplication complete: ${allOpportunities.length} → ${uniqueOpportunities.length} opportunities`);

    // Calculate category counts from actual opportunities (focus on EV only)
    const liveCount = uniqueOpportunities.filter(opp => opp.event?.status === 'live').length;
    const upcomingCount = uniqueOpportunities.filter(opp => 
      opp.event?.status === 'scheduled' || opp.event?.status === 'starting_soon'
    ).length;
    const endedCount = uniqueOpportunities.filter(opp => opp.event?.status === 'ended').length;
    
    // Calculate category counts from actual opportunities (focus on EV only)
    const evCount = uniqueOpportunities.filter(opp => opp.category === 'ev').length;
    const uniqueBooks = new Set();
    uniqueOpportunities.forEach(opp => {
      if (opp.myPrice?.book) uniqueBooks.add(opp.myPrice.book);
      if (opp.fieldPrices) {
        opp.fieldPrices.forEach(price => {
          if (price.book) uniqueBooks.add(price.book);
        });
      }
    });

    const counts = {
      total: uniqueOpportunities.length,
      live: liveCount,
      upcoming: upcomingCount,
      ended: endedCount, // Added ended count to match frontend expectations
      books: uniqueBooks.size,
      ev: evCount,
      playerProps: 0 // TODO: Implement player props
    };

    res.status(200).json({
      opportunities: uniqueOpportunities,
      counts,
      lastUpdated: new Date().toISOString(),
      filters: {
        leagues: [...new Set(uniqueOpportunities.map(opp => opp.event?.league).filter(Boolean))].sort(),
        marketTypes: [...new Set(uniqueOpportunities.map(opp => opp.market?.type).filter(Boolean))].sort(),
        books: [...uniqueBooks].sort()
      },
      dataSource: 'Are You Watching This API - Enhanced Endpoint',
      note: uniqueOpportunities.length === 0 ? 
        'No live or upcoming games found. All current games are final and moved to scores section.' : 
        'Using enhanced API endpoint with proper game status detection.'
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // No fallbacks - real data or nothing
    console.log('❌ External API failed - no fallback data provided');
    
    res.status(500).json({ 
      error: 'Failed to fetch odds data',
      message: error.message 
    });
  }
}

// Parse XML games response from Are You Watching This API - SIMPLIFIED VERSION
function parseGamesFromXml(xmlText) {
  console.log('🔍 Parsing XML games response...');
  
  try {
    const games = [];
    
    // Use a much simpler approach - just find game IDs and basic info
    const gameIdMatches = xmlText.match(/id="([^"]*)"/g);
    
    if (gameIdMatches) {
      console.log(`✅ Found ${gameIdMatches.length} game IDs in XML`);
      
      // Limit to first 50 games to prevent timeouts
      const limitedMatches = gameIdMatches.slice(0, 50);
      
      limitedMatches.forEach((idMatch, index) => {
        try {
          const gameID = idMatch.replace('id="', '').replace('"', '');
          
          // Find the game section for this ID
          const gameStart = xmlText.indexOf(`<game id="${gameID}"`);
          if (gameStart === -1) return;
          
          const gameEnd = xmlText.indexOf('</game>', gameStart);
          if (gameEnd === -1) return;
          
          const gameXml = xmlText.substring(gameStart, gameEnd + 7);
          
          // Extract basic info with simple regex
          const timeLeftMatch = gameXml.match(/<timeLeft>([^<]*)<\/timeLeft>/);
          const timeLeft = timeLeftMatch ? timeLeftMatch[1] : null;
          
          const sportMatch = gameXml.match(/<sport[^>]*>([^<]*)<\/sport>/);
          const sport = sportMatch ? sportMatch[1].trim() : 'Unknown';
          
          // Simple team name extraction
          const cityMatches = gameXml.match(/<city>([^<]*)<\/city>/g);
          let team1Name = `Team ${index}-1`;
          let team2Name = `Team ${index}-2`;
          
          if (cityMatches && cityMatches.length >= 2) {
            team1Name = cityMatches[0].replace('<city>', '').replace('</city>', '').trim();
            team2Name = cityMatches[1].replace('<city>', '').replace('</city>', '').trim();
          }
          
          // Determine if game is live
          const isLive = timeLeft && (
            timeLeft.includes("'") || // Soccer
            timeLeft.includes("Out") || // Baseball
            timeLeft.includes("Inning") || // Baseball
            timeLeft.includes("Quarter") || // Basketball
            timeLeft.includes("Period") || // Hockey
            timeLeft.includes("Round") || // Golf
            timeLeft.includes("Set") // Tennis
          );
          
          const game = {
            gameID,
            team1Name,
            team2Name,
            timeLeft,
            sport,
            league: sport.toUpperCase(),
            isLive
          };
          
          games.push(game);
          
          // Only log first few
          if (index < 3) {
            console.log(`✅ Parsed game ${index + 1}:`, { gameID, team1Name, team2Name, isLive, timeLeft });
          }
        } catch (parseError) {
          console.log(`⚠️ Error parsing game ${index + 1}:`, parseError.message);
        }
      });
      
      console.log(`✅ Successfully parsed ${games.length} games`);
    } else {
      console.log('⚠️ No game IDs found in XML');
    }
    
    return games;
  } catch (error) {
    console.error('❌ Error parsing XML:', error);
    return [];
  }
}

// Extract games from API response (handle different data structures)
function extractGamesFromResponse(gamesData) {
  console.log('🔍 Extracting games from response structure:', Object.keys(gamesData || {}));
  
  if (!gamesData) {
    console.log('⚠️ No games data received');
    return [];
  }
  
  // Handle different response structures
  if (gamesData.results && Array.isArray(gamesData.results)) {
    console.log(`✅ Found games in data.results: ${gamesData.results.length}`);
    return gamesData.results;
  }
  
  if (gamesData.games && Array.isArray(gamesData.games)) {
    console.log(`✅ Found games in data.games: ${gamesData.games.length}`);
    return gamesData.games;
  }
  
  if (gamesData.data && Array.isArray(gamesData.data)) {
    console.log(`✅ Found games in data.data: ${gamesData.data.length}`);
    return gamesData.data;
  }
  
  if (Array.isArray(gamesData)) {
    console.log(`✅ Data is direct array: ${gamesData.length}`);
    return gamesData;
  }
  
  console.log('⚠️ No recognizable games structure found');
  return [];
}

// Fetch odds for ALL sports (not just NFL)
async function fetchAllSportsOdds(games, apiKey) {
  const oddsData = {};
  
  console.log('🔍 Debug: Checking game structure for first few games:');
  games.slice(0, 3).forEach((game, index) => {
    console.log(`Game ${index + 1}:`, {
      gameID: game.gameID,
      sport: game.sport,
      league: game.league,
      leagueCode: game.leagueCode,
      team1Name: game.team1Name,
      team2Name: game.team2Name,
      timeLeft: game.timeLeft,
      keys: Object.keys(game)
    });
  });
  
  // Get all upcoming and live games (no timeLeft field means upcoming, others could be live)
  const relevantGames = games.filter(game => {
    // Skip games with completely invalid data
    if (!game.gameID) {
      console.log(`⚠️ Skipping game with no gameID`);
      return false;
    }
    
    // For upcoming games (no timeLeft), allow null team names as they might be placeholder games
    if (!game.timeLeft) {
      console.log(`✅ Including upcoming game: ${game.gameID} (${game.sport})`);
      return true;
    }
    
    // For live games, require valid team names
    if (['1H', '2H', 'HT', 'Q1', 'Q2', 'Q3', 'Q4', 'OT'].some(period => 
      game.timeLeft.includes(period)
    )) {
      if (!(game.team1City || game.team1Name) || !(game.team2City || game.team2Name)) {
        console.log(`⚠️ Skipping live game with invalid team names: ${game.gameID}`);
        return false;
      }
      console.log(`✅ Including live game: ${game.team1City || game.team1Name} vs ${game.team2City || game.team2Name} (${game.sport})`);
      return true;
    }
    
    // Skip completed games
    if (game.timeLeft.startsWith('Final')) {
      console.log(`⏭️ Skipping completed game: ${game.gameID}`);
      return false;
    }
    
    return false;
  });
  
  console.log(`🎯 Found ${relevantGames.length} relevant games (upcoming/live) across all sports, fetching odds for each...`);
  
  for (const game of relevantGames) {
    try {
      console.log(`🎯 Fetching odds for upcoming ${game.sport || 'Unknown'} game: ${game.team1City || game.team1Name || 'Unknown'} vs ${game.team2City || game.team2Name || 'Unknown'} (${game.league || game.leagueCode})`);
      
      const oddsResponse = await fetch(`${BASE_URL}/api/odds?key=${apiKey}&game_id=${game.gameID}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SharpShot/1.0'
        }
      });
      
      console.log(`📡 Odds API response for game ${game.gameID}: ${oddsResponse.status} ${oddsResponse.statusText}`);
      
      if (oddsResponse.ok) {
        const oddsJson = await oddsResponse.json();
        console.log(`📊 Odds response structure:`, Object.keys(oddsJson || {}));
        
        if (oddsJson && oddsJson.results && oddsJson.results.length > 0) {
          // Extract odds from the actual API structure
          const bookOdds = [];
          
          oddsJson.results.forEach((oddsEntry, oddsIndex) => {
            // The odds are in an array within oddsEntry.odds
            if (oddsEntry.odds && Array.isArray(oddsEntry.odds)) {
              oddsEntry.odds.forEach((oddsData) => {
                // Skip CONSENSUS provider
                if (oddsData.provider === 'CONSENSUS') {
                  console.log(`⏭️ Skipping CONSENSUS provider`);
                  return;
                }
                
                // Debug logging to see what we're actually getting
                console.log(`🔍 Raw odds data for ${game.gameID}:`, {
                  moneyLine1: oddsData.moneyLine1,
                  moneyLine2: oddsData.moneyLine2,
                  provider: oddsData.provider,
                  spread: oddsData.spread,
                  overUnder: oddsData.overUnder
                });
                
                // Convert decimal odds to American odds
                let homeAmericanOdds, awayAmericanOdds;
                
                // moneyLine1 is away team, moneyLine2 is home team
                if (typeof oddsData.moneyLine1 === 'number' && oddsData.moneyLine1 > 1) {
                  awayAmericanOdds = convertEuropeanToAmerican(oddsData.moneyLine1);
                  console.log(`🔄 Converted away odds ${oddsData.moneyLine1} to American: ${awayAmericanOdds}`);
                  
                  // Handle disabled wagers (null return)
                  if (awayAmericanOdds === null) {
                    console.log(`⚠️ Away odds disabled, skipping`);
                    return; // Skip this odds entry
                  }
                } else {
                  awayAmericanOdds = -110;
                }
                
                if (typeof oddsData.moneyLine2 === 'number' && oddsData.moneyLine2 > 1) {
                  homeAmericanOdds = convertEuropeanToAmerican(oddsData.moneyLine2);
                  console.log(`🔄 Converted home odds ${oddsData.moneyLine2} to American: ${homeAmericanOdds}`);
                  
                  // Handle disabled wagers (null return)
                  if (homeAmericanOdds === null) {
                    console.log(`⚠️ Home odds disabled, skipping`);
                    return; // Skip this odds entry
                  }
                } else {
                  homeAmericanOdds = -110;
                }
                
                // Final validation - ensure odds are reasonable
                if (Math.abs(homeAmericanOdds) > 10000 || Math.abs(awayAmericanOdds) > 10000) {
                  console.log(`❌ Extreme odds detected, using fallbacks: home=${homeAmericanOdds}, away=${awayAmericanOdds}`);
                  homeAmericanOdds = -110;
                  awayAmericanOdds = -110;
                }
                
                // Additional validation for very small odds (edge cases from European conversion)
                if (Math.abs(homeAmericanOdds) < 1) {
                  console.log(`⚠️ Very small home odds detected: ${homeAmericanOdds}, using fallback`);
                  homeAmericanOdds = -110;
                }
                if (Math.abs(awayAmericanOdds) < 1) {
                  console.log(`⚠️ Very small away odds detected: ${awayAmericanOdds}, using fallback`);
                  awayAmericanOdds = -110;
                }
                
                // Calculate EV for each book's odds
                const homeImpliedProb = americanToImpliedProbability(homeAmericanOdds);
                const homeEV = calculateEV(homeImpliedProb, 0.5);
                const awayImpliedProb = americanToImpliedProbability(awayAmericanOdds);
                const awayEV = calculateEV(awayImpliedProb, 0.5);
                
                bookOdds.push({
                  book: oddsData.provider || 'Unknown Book',
                  url: oddsData.url || '#',
                  home: {
                    odds: homeAmericanOdds,
                    evPercent: homeEV
                  },
                  away: {
                    odds: awayAmericanOdds,
                    evPercent: awayEV
                  }
                });
              });
            }
          });
          
          oddsData[game.gameID] = {
            gameInfo: game,
            bookOdds: bookOdds
          };
          console.log(`✅ Found odds for game ${game.gameID}: ${bookOdds.length} sportsbooks`);
        } else {
          console.log(`⚠️ No odds data for game ${game.gameID} - response:`, oddsJson);
        }
      } else {
        console.log(`⚠️ Odds API error for game ${game.gameID}: ${oddsResponse.status}`);
        const errorText = await oddsResponse.text();
        console.log(`⚠️ Error details:`, errorText);
      }
    } catch (error) {
      console.log(`❌ Error fetching odds for game ${game.gameID}:`, error.message);
    }
  }
  
  console.log(`📊 Final odds data: Found odds for ${Object.keys(oddsData).length} games`);
  return oddsData;
}

// Transform games to opportunities with proper status detection
function transformGamesToOpportunities(games, oddsData, currentTime) {
  const opportunities = [];
  
  games.forEach(game => {
    // Determine game status based on XML parsing isLive field
    let status = 'upcoming';
    if (game.isLive) {
        status = 'live';
    } else if (game.timeLeft && game.timeLeft.startsWith('Final')) {
      status = 'ended';
      } else if (game.timeLeft === 'POSTPONED') {
        status = 'postponed';
      }
    
    console.log(`🎮 Game ${game.gameID}: ${game.team1Name} vs ${game.team2Name} - Status: ${status} (isLive: ${game.isLive}, timeLeft: ${game.timeLeft})`);
    
    // For now, include all games to see what data we can get
    // TODO: Filter to only upcoming/live games once we confirm the API is working
    // if (status === 'final') {
    //   return;
    // }
    
    // Create base event object with correct field names from the API
    const event = {
      home: game.team1City || game.team1Name || `Team ${game.gameID}-1` || 'Unknown',
      away: game.team2City || game.team2Name || `Team ${game.gameID}-2` || 'Unknown',
      league: game.league || game.leagueCode || 'Unknown',
      sport: game.sport || 'Unknown',
      startTime: game.time && game.time > 1000000000000 ? new Date(game.time).toISOString() : new Date().toISOString(),
      status: status,
      homeScore: game.team1Score || 0,
      awayScore: game.team2Score || 0,
      headline: `${game.team2City || game.team2Name || `Team ${game.gameID}-2` || 'Away'} vs ${game.team1City || game.team1Name || `Team ${game.gameID}-1` || 'Home'} - ${game.league || 'League'}`,
      homeInitials: (game.team1City || game.team1Name || `T${game.gameID}-1` || 'H').substring(0, 2).toUpperCase(),
      awayInitials: (game.team2City || game.team2Name || `T${game.gameID}-2` || 'A').substring(0, 2).toUpperCase()
    };
    
    // Get odds for this game
    const gameOdds = oddsData[game.gameID];
    
    if (gameOdds && gameOdds.bookOdds && gameOdds.bookOdds.length > 0) {
      // Create opportunities with real odds
      gameOdds.bookOdds.forEach((bookOddsEntry, bookIndex) => {
        // Skip "CONSENSUS" entries - we only want real sportsbooks
        if (bookOddsEntry.book === 'CONSENSUS' || bookOddsEntry.book === 'Unknown Book') {
          console.log(`⏭️ Skipping non-sportsbook entry: ${bookOddsEntry.book}`);
          return;
        }
        
        // Extract the first odds entry (usually the most recent)
        const firstOdds = bookOddsEntry.home;
        
        // Debug logging
        console.log(`🔍 Processing game ${game.gameID}, book ${bookOddsEntry.book}:`, {
          home: firstOdds,
          away: bookOddsEntry.away
        });
        
        // Validate odds are reasonable before proceeding
        if (!firstOdds || !firstOdds.odds || Math.abs(firstOdds.odds) < 10 || Math.abs(firstOdds.odds) > 10000) {
          console.log(`❌ Skipping invalid home odds for game ${game.gameID}:`, firstOdds);
          return;
        }
        
        if (!bookOddsEntry.away || !bookOddsEntry.away.odds || Math.abs(bookOddsEntry.away.odds) < 10 || Math.abs(bookOddsEntry.away.odds) > 10000) {
          console.log(`❌ Skipping invalid away odds for game ${game.gameID}:`, bookOddsEntry.away);
          return;
        }
        
        // Double-check odds are numbers
        if (typeof firstOdds.odds !== 'number' || typeof bookOddsEntry.away.odds !== 'number') {
          console.log(`❌ Skipping non-numeric odds for game ${game.gameID}:`, {
            home: typeof firstOdds.odds, away: typeof bookOddsEntry.away.odds
          });
          return;
        }
        
        // Calculate EV for home team
        const homeImpliedProb = americanToImpliedProbability(firstOdds.odds);
        const homeEV = calculateEV(homeImpliedProb, 0.5);
        
        // Calculate EV for away team  
        const awayImpliedProb = americanToImpliedProbability(bookOddsEntry.away.odds);
        const awayEV = calculateEV(awayImpliedProb, 0.5);
        
        // Create fieldPrices array for home team with validation - EXCLUDE CONSENSUS

        // CRITICAL FIX: Only include odds for the SAME selection (home team)
        let homeFieldPrices = gameOdds.bookOdds
          .filter(book => {
            if (!book.home || !book.home.odds || typeof book.home.odds !== 'number') return false;
            if (book.book === 'CONSENSUS' || book.book === 'Unknown Book') return false;
            const odds = book.home.odds;
            return Math.abs(odds) >= 10 && Math.abs(odds) <= 10000;
          })
          .map(book => ({
            odds: book.home.odds,
            book: book.book,
            evPercent: book.home.evPercent,
            url: book.url,
            selectionId: `home-${game.gameID}` // Add selection ID for home team
          }));
        
        // Create fieldPrices array for away team with validation - EXCLUDE CONSENSUS
        // CRITICAL FIX: Only include odds for the SAME selection (away team)
        let awayFieldPrices = gameOdds.bookOdds
          .filter(book => {
            if (!book.away || !book.away.odds || typeof book.away.odds !== 'number') return false;
            if (book.book === 'CONSENSUS' || book.book === 'Unknown Book') return false;
            const odds = book.away.odds;
            return Math.abs(odds) >= 10 && Math.abs(odds) <= 10000;
          })
          .map(book => ({
            odds: book.away.odds,
            book: book.book,
            evPercent: book.away.evPercent,
            url: book.url,
            selectionId: `away-${game.gameID}` // Add selection ID for away team
          }));
        
        // CRITICAL FIX: Validate side consistency - no mixed signs in field prices
        const homeSigns = homeFieldPrices.map(p => Math.sign(p.odds));
        const awaySigns = awayFieldPrices.map(p => Math.sign(p.odds));
        
        const homeSignConsistent = homeSigns.every(s => s === homeSigns[0]);
        const awaySignConsistent = awaySigns.every(s => s === awaySigns[0]);
        
        if (!homeSignConsistent || !awaySignConsistent) {
          console.log(`⚠️ Side mixing detected for game ${game.gameID}:`, {
            home: { signs: homeSigns, consistent: homeSignConsistent },
            away: { signs: awaySigns, consistent: awaySignConsistent }
          });
          
          // Filter out mixed signs - keep only majority sign
          if (!homeSignConsistent) {
            const homeMajoritySign = homeSigns.filter(s => s === 1).length >= homeSigns.filter(s => s === -1).length ? 1 : -1;
            homeFieldPrices = homeFieldPrices.filter(p => Math.sign(p.odds) === homeMajoritySign);
            console.log(`🔧 Filtered home field prices to ${homeMajoritySign > 0 ? 'positive' : 'negative'} signs only`);
          }
          
          if (!awaySignConsistent) {
            const awayMajoritySign = awaySigns.filter(s => s === 1).length >= awaySigns.filter(s => s === -1).length ? 1 : -1;
            awayFieldPrices = awayFieldPrices.filter(p => Math.sign(p.odds) === awayMajoritySign);
            console.log(`🔧 Filtered away field prices to ${awayMajoritySign > 0 ? 'positive' : 'negative'} signs only`);
          }
        }
        
        // Only create opportunities if we have valid field prices from REAL sportsbooks
        if (homeFieldPrices.length === 0 || awayFieldPrices.length === 0) {
          console.log(`❌ Skipping game ${game.gameID} - no valid field prices from real sportsbooks (home: ${homeFieldPrices.length}, away: ${awayFieldPrices.length})`);
          return;
        }
        
        console.log(`✅ Creating opportunities for game ${game.gameID} with real sportsbook odds:`, {
          book: bookOddsEntry.book,
          home: firstOdds.odds,
          away: bookOddsEntry.away.odds,
          homeFieldCount: homeFieldPrices.length,
          awayFieldCount: awayFieldPrices.length,
          homeSigns: homeFieldPrices.map(p => Math.sign(p.odds)),
          awaySigns: awayFieldPrices.map(p => Math.sign(p.odds))
        });
        
        // Home team opportunity
        opportunities.push({
          id: `${game.gameID}-odds-${bookIndex}`,
          event,
          market: { 
            type: 'Moneyline', 
            side: event.home, 
            line: undefined, 
            player: undefined 
          },
          outcomeSelectionId: `home-${game.gameID}`, // CRITICAL: Add selection ID
          fairOdds: firstOdds.odds,
          fairProbability: 0.5, // Fair probability for EV calculation
          evPercent: homeEV,
          myPrice: { 
            odds: firstOdds.odds, 
            book: bookOddsEntry.book, 
            url: bookOddsEntry.url 
          },
          fieldPrices: homeFieldPrices,
          consensus: (() => {
            // Defensive check for homeFieldPrices
            if (!homeFieldPrices || !Array.isArray(homeFieldPrices)) {
              console.log(`⚠️ homeFieldPrices is invalid for game ${game.gameID}:`, homeFieldPrices);
              return {
                prob: undefined,
                american: undefined,
                decimal: undefined,
                samples: 0,
                reason: "invalid_field_prices"
              };
            }
            
            // Only calculate consensus if we have ≥3 unique books
            if (homeFieldPrices.length < 3) {
              return {
                prob: undefined,
                american: undefined,
                decimal: undefined,
                samples: homeFieldPrices.length,
                reason: "insufficient_samples"
              };
            }
            
            try {
              // Simple approach: use the existing homeFieldPrices that we know work
              const validProbs = homeFieldPrices
                .filter(price => price.odds && Math.abs(price.odds) >= 10 && Math.abs(price.odds) <= 10000)
                .map(price => {
                  const odds = price.odds;
                  if (odds > 0) {
                    return 100 / (odds + 100);
                } else {
                    return Math.abs(odds) / (Math.abs(odds) + 100);
                  }
                })
                .filter(prob => prob > 0 && prob < 1 && isFinite(prob));
              
              if (validProbs.length < 3) {
                return {
                  prob: undefined,
                  american: undefined,
                  decimal: undefined,
                  samples: validProbs.length,
                  reason: "insufficient_valid_probs"
                };
              }
              
              // Simple average (no outlier filtering for now)
              const consensusProb = validProbs.reduce((sum, p) => sum + p, 0) / validProbs.length;
              
              // Sanity gates
              if (consensusProb < 0.002 || consensusProb > 0.998) {
                return {
                  prob: undefined,
                  american: undefined,
                  decimal: undefined,
                  samples: validProbs.length,
                  reason: "implausible_probs"
                };
              }
              
              // Calculate derived values
              const consensusDecimal = 1 / consensusProb;
              let consensusAmerican;
              if (consensusDecimal >= 2) {
                consensusAmerican = Math.round((consensusDecimal - 1) * 100);
              } else {
                consensusAmerican = Math.round(-100 / (consensusDecimal - 1));
              }
              
              // Final bounds check
              if (Math.abs(consensusAmerican) > 10000) {
                return {
                  prob: undefined,
                  american: undefined,
                  decimal: undefined,
                  samples: validProbs.length,
                  reason: "extreme_american_odds"
                };
              }
              
              console.log(`✅ Simple consensus calculated: prob=${consensusProb.toFixed(4)}, american=${consensusAmerican}, samples=${validProbs.length}`);
              
              return {
                prob: consensusProb,
                american: consensusAmerican,
                decimal: consensusDecimal,
                samples: validProbs.length
              };
              
            } catch (error) {
              console.error(`❌ Error calculating consensus for game ${game.gameID}:`, error);
              return {
                prob: undefined,
                american: undefined,
                decimal: undefined,
                samples: homeFieldPrices.length,
                reason: "calculation_error"
              };
            }
          })(),
          updatedAt: new Date().toISOString(),
          category: homeEV > 0 ? 'ev' : 'neutral', // Categorize based on EV
          allBookOdds: gameOdds.bookOdds // Include all book odds for side-by-side display
        });
        
        // Away team opportunity
        opportunities.push({
          id: `${game.gameID}-odds-away-${bookIndex}`,
          event,
          market: { 
            type: 'Moneyline', 
            side: event.away, 
            line: undefined, 
            player: undefined 
          },
          outcomeSelectionId: `away-${game.gameID}`, // CRITICAL: Add selection ID
          fairOdds: bookOddsEntry.away.odds,
          fairProbability: 0.5, // Fair probability for EV calculation
          evPercent: awayEV,
          myPrice: { 
            odds: bookOddsEntry.away.odds, 
            book: bookOddsEntry.book, 
            url: bookOddsEntry.url 
          },
          fieldPrices: awayFieldPrices,
                     consensus: (() => {
             // Defensive check for awayFieldPrices
             if (!awayFieldPrices || !Array.isArray(awayFieldPrices)) {
               console.log(`⚠️ awayFieldPrices is invalid for game ${game.gameID}:`, awayFieldPrices);
               return {
                 prob: undefined,
                 american: undefined,
                 decimal: undefined,
                 samples: 0,
                 reason: "invalid_field_prices"
               };
             }
             
             // Only calculate consensus if we have ≥3 unique books
             if (awayFieldPrices.length < 3) {
               return {
                 prob: undefined,
                 american: undefined,
                 decimal: undefined,
                 samples: awayFieldPrices.length,
                 reason: "insufficient_samples"
               };
             }
             
             try {
               // Simple approach: use the existing awayFieldPrices that we know work
               const validProbs = awayFieldPrices
                 .filter(price => price.odds && Math.abs(price.odds) >= 10 && Math.abs(price.odds) <= 10000)
                 .map(price => {
                   const odds = price.odds;
                   if (odds > 0) {
                     return 100 / (odds + 100);
                } else {
                     return Math.abs(odds) / (Math.abs(odds) + 100);
                   }
                 })
                 .filter(prob => prob > 0 && prob < 1 && isFinite(prob));
               
               if (validProbs.length < 3) {
                 return {
                   prob: undefined,
                   american: undefined,
                   decimal: undefined,
                   samples: validProbs.length,
                   reason: "insufficient_valid_probs"
                 };
               }
               
               // Simple average (no outlier filtering for now)
               const consensusProb = validProbs.reduce((sum, p) => sum + p, 0) / validProbs.length;
               
               // Sanity gates
               if (consensusProb < 0.002 || consensusProb > 0.998) {
                 return {
                   prob: undefined,
                   american: undefined,
                   decimal: undefined,
                   samples: validProbs.length,
                   reason: "implausible_probs"
                 };
               }
               
               // Calculate derived values
               const consensusDecimal = 1 / consensusProb;
               let consensusAmerican;
               if (consensusDecimal >= 2) {
                 consensusAmerican = Math.round((consensusDecimal - 1) * 100);
              } else {
                 consensusAmerican = Math.round(-100 / (consensusDecimal - 1));
               }
               
               // Final bounds check
               if (Math.abs(consensusAmerican) > 10000) {
                 return {
                   prob: undefined,
                   american: undefined,
                   decimal: undefined,
                   samples: validProbs.length,
                   reason: "extreme_american_odds"
                 };
               }
               
               console.log(`✅ Simple consensus calculated: prob=${consensusProb.toFixed(4)}, american=${consensusAmerican}, samples=${validProbs.length}`);
               
               return {
                 prob: consensusProb,
                 american: consensusAmerican,
                 decimal: consensusDecimal,
                 samples: validProbs.length
               };
               
             } catch (error) {
               console.error(`❌ Error calculating consensus for game ${game.gameID}:`, error);
               return {
                 prob: undefined,
                 american: undefined,
                 decimal: undefined,
                 samples: awayFieldPrices.length,
                 reason: "calculation_error"
               };
             }
                       })(),
          updatedAt: new Date().toISOString(),
          category: awayEV > 0 ? 'ev' : 'neutral', // Categorize based on EV
          allBookOdds: gameOdds.bookOdds // Include all book odds for side-by-side display
        });
      });
    }
    // Removed fallback opportunities - only create opportunities with valid odds
  });
  
  console.log(`📊 Created ${opportunities.length} opportunities with valid odds`);
  return opportunities;
}

// Convert decimal odds to American odds (official API conversion)
function convertEuropeanToAmerican(decimalOdds) {
  console.log(`🔍 CONVERSION DEBUG: Input odds: ${decimalOdds}`);
  
  // Official API conversion logic from documentation
  if ((decimalOdds == null) || (decimalOdds == 1)) {
    console.log(`🔍 CONVERSION DEBUG: Disabled wager (null or 1)`);
    return null; // Disabled wager
  }
  
  // Check if the input is already American odds (common range: -1000 to +1000)
  if (decimalOdds >= -1000 && decimalOdds <= 1000 && decimalOdds !== 0) {
    console.log(`🔍 CONVERSION DEBUG: Already American odds: ${decimalOdds}`);
    return Math.round(decimalOdds);
  }
  
  // Check for unrealistic decimal odds that would produce extreme American odds
  if (decimalOdds < 1.01 || decimalOdds > 1000) {
    console.log(`⚠️ Decimal odds out of realistic range: ${decimalOdds}, treating as invalid`);
    return null; // Treat as disabled wager
  }
  
  if (decimalOdds < 2) {
    const americanOdds = Math.round(-1 * (1 / (decimalOdds - 1)) * 100);
    console.log(`🔍 CONVERSION DEBUG: Underdog conversion: ${decimalOdds} -> ${americanOdds}`);
    
    // Cap extreme negative odds to reasonable range
    if (americanOdds < -1000) {
      console.log(`⚠️ American odds too extreme (negative): ${americanOdds}, capping at -1000`);
      return -1000;
    }
    
    return americanOdds;
  } else {
    const americanOdds = Math.round((decimalOdds - 1) * 100);
    console.log(`🔍 CONVERSION DEBUG: Favorite conversion: ${decimalOdds} -> ${americanOdds}`);
    
    // Cap extreme positive odds to reasonable range
    if (americanOdds > 1000) {
      console.log(`⚠️ American odds too extreme (positive): ${americanOdds}, capping at +1000`);
      return 1000;
    }
    
    return americanOdds;
  }
}

// Convert American odds to implied probability
function americanToImpliedProbability(americanOdds) {
  if (!americanOdds || isNaN(americanOdds)) {
    return 0.5; // Default fallback
  }
  
  if (americanOdds > 0) {
    // Positive odds: probability = 100 / (odds + 100)
    return 100 / (americanOdds + 100);
  } else {
    // Negative odds: probability = |odds| / (|odds| + 100)
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

// Calculate Expected Value (EV) - CANONICAL VERSION
function calculateEV(impliedProbability, fairProbability) {
  if (!impliedProbability || !fairProbability || isNaN(impliedProbability) || isNaN(fairProbability)) {
    return 0;
  }

  // Convert implied probability to American odds
  const americanOdds = impliedProbability < 0.5
    ? Math.round(100 * (1 - impliedProbability) / impliedProbability)
    : Math.round(-100 * impliedProbability / (1 - impliedProbability));

  // Use canonical EV calculation formula
  const stake = 100;
  const decimal = americanOdds > 0 ? 1 + americanOdds/100 : 1 + 100/Math.abs(americanOdds);
  const profitIfWin = stake * (decimal - 1);
  const ev = fairProbability * profitIfWin - (1 - fairProbability) * stake;

  // Convert to percentage and round to 2 decimal places
  return Math.round((ev / stake) * 10000) / 100; // Returns percentage like 2.45 for 2.45%
}

// XML parsing function removed - now using JSON API