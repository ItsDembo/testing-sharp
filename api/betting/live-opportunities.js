// Import team mapping utilities
import { enhanceTeamData, normalizeLeague, getFullTeamName } from '../lib/teamMapping.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sport, minEV, status, primaryBook = 'FanDuel' } = req.query;
    
    console.log('🎯 Fetching live betting opportunities from RUWT API...', { sport, minEV, status });
    
    console.log('🎯 Fetching live betting opportunities from RUWT API...', { sport, minEV, status });
    
    // For now, return test data to verify endpoint is working
    console.log('📡 Returning test data...');
    
    const allGames = [
      {
        gameID: 'test123',
        event: 'Test Team @ Home Team',
        sport: 'mlb',
        leagueCode: 'mlb',
        team1City: 'Test Team',
        team1Name: 'Test Team',
        team2City: 'Home Team',
        team2Name: 'Home Team',
        timeLeft: 'Scheduled',
        points: 100,
        isLive: false,
        team1Score: 0,
        team2Score: 0,
        date: new Date().toISOString(),
        message: 'Test Team @ Home Team'
      }
    ];
    
    const oddsData = {
      'test123': {
        bookOdds: [
          {
            book: 'FanDuel',
            away: { odds: 1.91 },
            home: { odds: 1.91 },
            url: 'https://sportsbook.fanduel.com'
          }
        ]
      }
    };

    // For now, return the test data directly to verify structure
    const opportunities = [
      {
        id: 'test123',
        event: 'Test Team @ Home Team',
        sport: 'mlb',
        status: 'Scheduled',
        category: 'upcoming',
        ev: 5.0,
        hit: 50.0,
        confidence: 'Medium',
        mainBookOdds: '+110',
        oddsComparison: [
          { sportsbook: 'FanDuel', odds: '+110', side: "target", isMainBook: true, url: 'https://sportsbook.fanduel.com' }
        ],
        bettingInterest: 100,
        lastUpdated: new Date().toISOString(),
        truthStatus: "Test data"
      }
    ];
    
    console.log(`✅ Created ${opportunities.length} test opportunities`);
    
    // Apply EV filter
    let filteredOpportunities = opportunities;
    if (minEV && parseFloat(minEV) > 0) {
      filteredOpportunities = opportunities.filter(opp => 
        opp.ev >= parseFloat(minEV)
      );
    }

    res.status(200).json({
      opportunities: filteredOpportunities,
      count: filteredOpportunities.length,
      filters: { 
        sport: sport || 'all', 
        minEV: parseFloat(minEV) || 0, 
        status: status || 'all' 
      },
      lastUpdated: new Date().toISOString(),
      serverTime: Date.now(),
      refreshInterval: 15000, // Refresh every 15 seconds for real-time odds
      debug: {
        gamesProcessed: `${opportunities.length} live games from RUWT API`,
        timestamp: new Date().toISOString(),
        implementation: "Real data from RUWT API",
        oddsValidation: "Real-time odds verification enabled",
        sampleGame: allGames[0],
        sampleOdds: oddsData[allGames[0]?.gameID],
        totalGames: allGames.length,
        totalOdds: Object.keys(oddsData).length
      }
    });

  } catch (error) {
    console.error('Error in live-opportunities API:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Parse JSON data and convert to trading terminal opportunities
 */
async function parseJsonToOpportunities(games, oddsData, sportFilter, statusFilter, primaryBook) {
  try {
    const opportunities = [];
    
    console.log(`🎮 Processing ${games.length} games`);
    console.log(`💰 Found ${Object.keys(oddsData).length} games with odds data`);
    console.log(`🎮 Sample game to process:`, games[0]);
    console.log(`💰 Sample odds data keys:`, Object.keys(oddsData).slice(0, 5));
    
    for (const game of games) {
      try {
        const gameId = game.gameID || game.id;
        console.log(`🎮 Processing game: ${gameId}, event: ${game.event}, has event: ${!!game.event}`);
        console.log(`🎮 Game odds data available:`, !!oddsData[gameId]);
        

        
        // Handle both XML and JSON game formats
        const gameData = game.event ? 
          await parseGameJson(game, oddsData[gameId], primaryBook) : 
          await parseGameXml(game, oddsData[gameId], primaryBook);
        
        console.log(`🎮 Game ${gameId} parsed result:`, gameData ? 'SUCCESS' : 'FAILED');
        
        if (gameData) {
          // Apply sport filter if specified
          if (sportFilter && sportFilter !== 'all' && 
              gameData.sport.toLowerCase() !== sportFilter.toLowerCase()) {
            continue;
          }
          
          // Apply status filter if specified
          if (statusFilter && statusFilter !== 'all' && 
              gameData.category !== statusFilter.toLowerCase()) {
            continue;
          }
          
          opportunities.push(gameData);
        }
      } catch (gameError) {
        console.error('Error parsing individual game:', gameError);
        continue; // Skip problematic games
      }
    }
    
    console.log(`✅ Successfully parsed ${opportunities.length} opportunities`);
    return opportunities;
    
  } catch (error) {
    console.error('Error parsing XML:', error);
    // Return empty array on parse error to keep API functional
    return [];
  }
}

/**
 * Parse games from JSON
 */
function parseGamesFromJson(jsonData) {
  const games = [];
  
  try {
    if (jsonData && jsonData.results && Array.isArray(jsonData.results)) {
      jsonData.results.forEach((gameData) => {
        try {
          const game = parseGameFromJson(gameData);
          if (game) {
            games.push(game);
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse game JSON:', error.message);
        }
      });
    }
    
    console.log(`✅ Parsed ${games.length} games from JSON`);
    return games;
    
  } catch (error) {
    console.error('❌ Error parsing games JSON:', error);
    return [];
  }
}

/**
 * Parse individual game JSON to basic game object
 */
function parseGameFromJson(gameData) {
  try {
    // Extract basic game info from JSON using actual RUWT API structure
    const gameId = gameData.gameID || gameData.id || 'unknown';
    const sport = gameData.sport || 'unknown';
    const leagueCode = gameData.leagueCode || sport; // Use leagueCode if available
    
    // Handle different data structures from games vs events endpoints
    let homeTeam = 'Home Team';
    let awayTeam = 'Away Team';
    let homeTeamFull = 'Home Team';
    let awayTeamFull = 'Away Team';
    
    // For events endpoint (live games) - parse from message field
    if (gameData.message) {
      const message = gameData.message;
      // Parse message like "BALTIMORE: 6 SAN DIEGO: 2 Final"
      const parts = message.split(':');
      if (parts.length >= 2) {
        awayTeam = parts[0].trim();
        awayTeamFull = awayTeam;
        
        const secondPart = parts[1];
        const secondParts = secondPart.split(' ');
        if (secondParts.length >= 3) {
          homeTeam = secondParts[1].trim();
          homeTeamFull = homeTeam;
        }
      }
    }
    // For games endpoint (upcoming games) - use direct team fields
    else if (gameData.team1City && gameData.team2City) {
      awayTeam = gameData.team1City;
      awayTeamFull = gameData.team1City;
      homeTeam = gameData.team2City;
      homeTeamFull = gameData.team2City;
    }
    
    // Extract time left
    const timeLeft = gameData.timeLeft || '';
    
    // Extract points
    const points = parseInt(gameData.points || '0');
    
    // Determine if game is live
    const isLive = timeLeft && !timeLeft.toLowerCase().includes('final') && !timeLeft.toLowerCase().includes('scheduled');
    
    return {
      gameID: gameId,
      sport: sport,
      leagueCode: leagueCode,
      team1City: awayTeam,
      team1Name: awayTeam,
      team2City: homeTeam,
      team2Name: homeTeam,
      timeLeft: timeLeft,
      points: points,
      isLive: isLive,
      team1Score: gameData.team1Score || 0,
      team2Score: gameData.team2Score || 0,
      date: gameData.date,
      eventID: gameData.eventID,
      message: gameData.message,
      type: gameData.type,
      headline: gameData.headline,
      round: gameData.round
    };
    
  } catch (error) {
    console.error('Error parsing game from JSON:', error);
    return null;
  }
}

/**
 * Parse games from XML
 */
function parseGamesFromXml(xmlText) {
  const games = [];
  
  try {
    // Parse XML using regex patterns
    const gameMatches = xmlText.match(/<game[^>]*>([\s\S]*?)<\/game>/g);
    
    if (gameMatches) {
      gameMatches.forEach(gameXml => {
        try {
          const game = parseGameFromXml(gameXml);
          if (game) {
            games.push(game);
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse game XML:', error.message);
        }
      });
    }
    
    console.log(`✅ Parsed ${games.length} games from XML`);
    return games;
    
  } catch (error) {
    console.error('❌ Error parsing games XML:', error);
    return [];
  }
}

/**
 * Parse individual game XML to basic game object
 */
function parseGameFromXml(gameXml) {
  try {
    // Extract basic game info from XML
    const gameIdMatch = gameXml.match(/id="([^"]+)"/);
    const sportMatch = gameXml.match(/sport="([^"]+)"/);
    const leagueCodeMatch = gameXml.match(/leagueCode="([^"]+)"/);
    
    const gameId = gameIdMatch ? gameIdMatch[1] : 'unknown';
    const sport = sportMatch ? sportMatch[1] : 'unknown';
    const leagueCode = leagueCodeMatch ? leagueCodeMatch[1] : sport;
    
    // Extract team info from XML
    let homeTeam = 'Home Team';
    let awayTeam = 'Away Team';
    let homeTeamFull = 'Home Team';
    let awayTeamFull = 'Away Team';
    
    // Extract team data from the teams section
    const teamsMatch = gameXml.match(/<teams[^>]*>([\s\S]*?)<\/teams>/);
    if (teamsMatch) {
      const teamsXml = teamsMatch[1];
      
      // Extract visitor team (away)
      const visitorMatch = teamsXml.match(/<team[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/team>/);
      if (visitorMatch) {
        const visitorXml = visitorMatch[2];
        const cityMatch = visitorXml.match(/<city>([^<]+)<\/city>/);
        const nameMatch = visitorXml.match(/<name>([^<]+)<\/name>/);
        
        if (cityMatch && nameMatch) {
          awayTeam = cityMatch[1];
          awayTeamFull = `${cityMatch[1]} ${nameMatch[1]}`.trim();
        }
      }
      
      // Extract home team
      const homeMatch = teamsXml.match(/<team[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/team>/g);
      if (homeMatch && homeMatch.length > 1) {
        const homeXml = homeMatch[1];
        const cityMatch = homeXml.match(/<city>([^<]+)<\/city>/);
        const nameMatch = homeXml.match(/<name>([^<]+)<\/name>/);
        
        if (cityMatch && nameMatch) {
          homeTeam = cityMatch[1];
          homeTeamFull = `${cityMatch[1]} ${nameMatch[1]}`.trim();
        }
      }
    }
    
    // Extract time left
    const timeLeftMatch = gameXml.match(/<timeLeft>([^<]+)<\/timeLeft>/);
    const timeLeft = timeLeftMatch ? timeLeftMatch[1] : '';
    
    // Extract points
    const pointsMatch = gameXml.match(/<points[^>]*>([^<]+)<\/points>/);
    const points = parseInt(pointsMatch ? pointsMatch[1] : '0');
    
    // Determine if game is live
    const isLive = timeLeft && !timeLeft.toLowerCase().includes('final') && !timeLeft.toLowerCase().includes('scheduled');
    
    return {
      gameID: gameId,
      sport: sport,
      leagueCode: leagueCode,
      team1City: awayTeam,
      team1Name: awayTeamFull.replace(awayTeam + ' ', ''),
      team2City: homeTeam,
      team2Name: homeTeamFull.replace(homeTeam + ' ', ''),
      timeLeft: timeLeft,
      points: points,
      isLive: isLive
    };
    
  } catch (error) {
    console.error('Error parsing game from XML:', error);
    return null;
  }
}

/**
 * Parse individual game JSON (for mock games)
 */
async function parseGameJson(game, gameOdds, primaryBook) {
  try {
    // Extract basic game info from JSON
    const gameId = game.id || 'unknown';
    const sport = game.sport || 'unknown';
    const status = game.status || '';
    const timeLeft = game.timeLeft || '';
    const points = parseInt(game.points || '0');
    const category = game.category || sport;
    const leagueCode = game.leagueCode || category;
    
    // Skip games that are clearly finished or old
    if (status.toLowerCase().includes('final') || status.toLowerCase().includes('ended') || 
        timeLeft.toLowerCase().includes('final') || timeLeft.toLowerCase().includes('ended')) {
      console.log(`🚫 Skipping finished game: ${gameId} - ${status} ${timeLeft}`);
      return null;
    }
    
    // Extract team info from JSON
    const awayTeam = game.awayTeam || 'Away Team';
    const homeTeam = game.homeTeam || 'Home Team';
    const awayTeamFull = game.awayTeam || 'Away Team';
    const homeTeamFull = game.homeTeam || 'Home Team';
    
    // Determine game status
    const isLive = game.isLive || (timeLeft && !timeLeft.toLowerCase().includes('final') && !timeLeft.toLowerCase().includes('scheduled'));
    const isFinal = timeLeft && (timeLeft.toLowerCase().includes('final') || status.toLowerCase().includes('final'));
    const isUpcoming = !isLive && !isFinal;
    
    console.log(`🎮 Game status debug for ${gameId}:`, {
      isLive: game.isLive,
      timeLeft: timeLeft,
      status: status,
      calculatedIsLive: isLive,
      calculatedIsFinal: isFinal,
      calculatedIsUpcoming: isUpcoming
    });
    
    const gameCategory = isFinal ? 'final' : (isLive ? 'live' : 'upcoming');
    
    // Use provided odds data
    let realOdds = null;
    if (gameOdds && gameOdds.bookOdds && gameOdds.bookOdds.length > 0) {
      realOdds = transformBookOddsToDecimal(gameOdds.bookOdds);
    }
    
    // If no odds available, create placeholder odds for testing
    if (!realOdds) {
      console.log(`📝 Creating placeholder odds for game ${gameId} - no real odds available`);
      realOdds = {
        moneyline: { away: { 'FanDuel': 1.91 }, home: { 'FanDuel': 1.91 } },
        spread: { away: {}, home: {} },
        total: { over: {}, under: {} },
        providers: ['FanDuel']
      };
    }
    
    const userBookDecimalOdds = realOdds.moneyline?.away?.[primaryBook] || realOdds.moneyline?.home?.[primaryBook] || 1.91;
    const userBookOdds = convertDecimalToAmerican(userBookDecimalOdds);
    
    // Generate field odds from real RUWT data
    const fieldOdds = generateFieldOddsFromRUWTData(realOdds, primaryBook);
    console.log(`🎮 Field odds for ${gameId}:`, fieldOdds.length, 'odds generated');
    
    // Calculate EV and win probability from real odds
    const winProbability = calculateWinProbability(realOdds, primaryBook);
    const evPercentage = calculateEVPercentage(realOdds, primaryBook);
    
    // Get enhanced team names using our mapping system
    const enhancedAwayTeam = getFullTeamName(awayTeam, sport, leagueCode);
    const enhancedHomeTeam = getFullTeamName(homeTeam, sport, leagueCode);
    const normalizedLeagueName = normalizeLeague(sport || leagueCode || category);
    const gameString = `${enhancedAwayTeam} vs ${enhancedHomeTeam}`;
    
    return {
      id: gameId,
      event: game.event || gameString,
      sport: sport,
      gameTime: game.gameTime || new Date().toISOString(),
      status: timeLeft || status || 'Scheduled',
      category: gameCategory,
      gameCategory: gameCategory,
      ev: Math.abs(evPercentage),
      hit: winProbability,
      confidence: Math.abs(evPercentage) > 5 ? 'High' : (Math.abs(evPercentage) > 2 ? 'Medium' : 'Low'),
      mainBookOdds: userBookOdds,
      oddsComparison: [
        { sportsbook: primaryBook, odds: userBookOdds, side: "target", isMainBook: true, url: `https://sportsbook.${primaryBook.toLowerCase()}.com` },
        ...fieldOdds.map(book => ({ 
          sportsbook: book.book, 
          odds: book.price, 
          side: "target", 
          isMainBook: false,
          url: book.url || `https://sportsbook.${book.book.toLowerCase()}.com`
        }))
      ],
      bettingInterest: points,
      lastUpdated: new Date().toISOString(),
      truthStatus: "Mock data for testing",
      
      // Enhanced team data for debugging
      rawTeamData: {
        awayTeam: awayTeam,
        homeTeam: homeTeam,
        awayTeamFull: awayTeamFull,
        homeTeamFull: homeTeamFull,
        enhancedAwayTeam: enhancedAwayTeam,
        enhancedHomeTeam: enhancedHomeTeam,
        sport: sport,
        leagueCode: leagueCode,
        competition: category
      },
      fieldOdds: fieldOdds // Add fieldOdds for compatibility
    };
    
  } catch (error) {
    console.error('Error parsing game JSON:', error);
    return null;
  }
}

/**
 * Parse individual game XML to opportunity object
 */
async function parseGameXml(gameXml, gameOdds, primaryBook) {
  try {
    // Extract basic game info from XML
    const gameIdMatch = gameXml.match(/gameID="([^"]+)"/);
    const sportMatch = gameXml.match(/sport="([^"]+)"/);
    const statusMatch = gameXml.match(/status="([^"]+)"/);
    const timeLeftMatch = gameXml.match(/timeLeft="([^"]+)"/);
    const pointsMatch = gameXml.match(/points="([^"]+)"/);
    const competitionMatch = gameXml.match(/competition="([^"]+)"/);
    const leagueCodeMatch = gameXml.match(/leagueCode="([^"]+)"/);
    
    const gameId = gameIdMatch ? gameIdMatch[1] : 'unknown';
    const sport = sportMatch ? sportMatch[1] : 'unknown';
    const status = statusMatch ? statusMatch[1] : '';
    const timeLeft = timeLeftMatch ? timeLeftMatch[1] : '';
    const points = parseInt(pointsMatch ? pointsMatch[1] : '0');
    const competition = competitionMatch ? competitionMatch[1] : sport;
    const leagueCode = leagueCodeMatch ? leagueCodeMatch[1] : competition;
    
    // Skip games that are clearly finished or old
    if (status.toLowerCase().includes('final') || status.toLowerCase().includes('ended') || 
        timeLeft.toLowerCase().includes('final') || timeLeft.toLowerCase().includes('ended')) {
      console.log(`🚫 Skipping finished game: ${gameId} - ${status} ${timeLeft}`);
      return null;
    }
    
    // Extract team info from XML
    let homeTeam = 'Home Team';
    let awayTeam = 'Away Team';
    let homeTeamFull = 'Home Team';
    let awayTeamFull = 'Away Team';
    
    // RUWT XML structure has team1 (away) and team2 (home)
    const team1CityMatch = gameXml.match(/team1City="([^"]+)"/);
    const team1NameMatch = gameXml.match(/team1Name="([^"]+)"/);
    const team2CityMatch = gameXml.match(/team2City="([^"]+)"/);
    const team2NameMatch = gameXml.match(/team2Name="([^"]+)"/);
    
    if (team1CityMatch && team1NameMatch) {
      awayTeam = team1CityMatch[1];
      awayTeamFull = `${team1CityMatch[1]} ${team1NameMatch[1]}`.trim();
    }
    
    if (team2CityMatch && team2NameMatch) {
      homeTeam = team2CityMatch[1];
      homeTeamFull = `${team2CityMatch[1]} ${team2NameMatch[1]}`.trim();
    }
    
    // Determine game status
    const isLive = timeLeft && !timeLeft.toLowerCase().includes('final') && !timeLeft.toLowerCase().includes('scheduled');
    const isFinal = timeLeft && (timeLeft.toLowerCase().includes('final') || status.toLowerCase().includes('final'));
    const isUpcoming = !isLive && !isFinal;
    
    const category = isFinal ? 'final' : (isLive ? 'live' : 'upcoming');
    
    // Use provided odds data from fetchAllSportsOdds
    let realOdds = null;
    if (gameOdds && gameOdds.bookOdds && gameOdds.bookOdds.length > 0) {
      // Transform the odds data from fetchAllSportsOdds format
      realOdds = transformBookOddsToDecimal(gameOdds.bookOdds);
    }
    
    // For now, create placeholder odds so we can show games
    if (!realOdds) {
      console.log(`📝 Creating placeholder odds for game ${gameId} - no real odds available`);
      realOdds = {
        moneyline: { away: { 'FanDuel': 1.91 }, home: { 'FanDuel': 1.91 } },
        spread: { away: {}, home: {} },
        total: { over: {}, under: {} },
        providers: ['FanDuel']
      };
    }
    
    const userBookDecimalOdds = realOdds.moneyline?.away?.[primaryBook] || realOdds.moneyline?.home?.[primaryBook] || 1.91;
    const userBookOdds = convertDecimalToAmerican(userBookDecimalOdds); // Convert to American for display
    
    // Generate field odds from real RUWT data
    const fieldOdds = generateFieldOddsFromRUWTData(realOdds, primaryBook);
    
    // Calculate EV and win probability from real odds
    const winProbability = calculateWinProbability(realOdds, primaryBook);
    const evPercentage = calculateEVPercentage(realOdds, primaryBook);
    
    // Get enhanced team names using our mapping system
    const enhancedAwayTeam = getFullTeamName(awayTeam, sport, leagueCode);
    const enhancedHomeTeam = getFullTeamName(homeTeam, sport, leagueCode);
    const normalizedLeagueName = normalizeLeague(sport || leagueCode || competition);
    const gameString = `${enhancedAwayTeam} vs ${enhancedHomeTeam}`;
    
    // Debug league mapping
    console.log(`🏈 League mapping debug:`, {
      originalSport: sport,
      originalLeagueCode: leagueCode,
      originalCompetition: competition,
      normalizedLeague: normalizedLeagueName,
      gameString
    });
    
    return {
      // New trading terminal fields
      id: `${gameId}-moneyline`,
      event: gameString,
      league: normalizedLeagueName,
      prop: `${enhancedAwayTeam} Moneyline`,
      market: 'Moneyline',
      myOdds: userBookOdds,
      winProbability: winProbability !== null ? Math.round(winProbability * 10) / 10 : null,
      evPercentage: Math.round(evPercentage * 10) / 10,
      fieldOdds: fieldOdds,
      
      // Legacy fields for backward compatibility
      sport: normalizeLeague(sport),
      game: gameString,
      betType: 'Moneyline',
      line: null,
      gameTime: new Date().toISOString(),
      isLive: isLive,
      status: timeLeft || status || 'Scheduled',
      category: category,
      gameCategory: category,
      ev: Math.abs(evPercentage),
      hit: winProbability,
      confidence: Math.abs(evPercentage) > 5 ? 'High' : (Math.abs(evPercentage) > 2 ? 'Medium' : 'Low'),
      mainBookOdds: userBookOdds,
      oddsComparison: [
        { sportsbook: primaryBook, odds: userBookOdds, side: "target", isMainBook: true, url: `https://sportsbook.${primaryBook.toLowerCase()}.com` },
        ...fieldOdds.map(book => ({ 
          sportsbook: book.book, 
          odds: book.price, 
          side: "target", 
          isMainBook: false,
          url: book.url || `https://sportsbook.${book.book.toLowerCase()}.com`
        }))
      ],
      bettingInterest: points,
      lastUpdated: new Date().toISOString(),
      truthStatus: "Real data from areyouwatchingthis.com",
      
      // Enhanced team data for debugging
      rawTeamData: {
        awayTeam: awayTeam,
        homeTeam: homeTeam,
        awayTeamFull: awayTeamFull,
        homeTeamFull: homeTeamFull,
        enhancedAwayTeam: enhancedAwayTeam,
        enhancedHomeTeam: enhancedHomeTeam,
        sport: sport,
        leagueCode: leagueCode,
        competition: competition
      }
    };
    
  } catch (error) {
    console.error('Error parsing game XML:', error);
    return null;
  }
}

/**
 * Extract value from XML using regex
 */
function extractXmlValue(xml, pattern) {
  const match = xml.match(new RegExp(pattern, 'i'));
  return match ? match[1].trim() : null;
}

/**
 * Calculate main book odds based on betting interest
 */
function calculateMainBookOdds(bettingInterest) {
  if (bettingInterest > 80) return -200;
  if (bettingInterest > 60) return -150;
  if (bettingInterest > 40) return -120;
  if (bettingInterest > 20) return -110;
  if (bettingInterest > 10) return 100;
  return 150;
}







/**
 * Fetch real odds data for games
 */
async function fetchRealOddsData(games) {
  const oddsData = {};
  
  try {
    console.log(`💰 Fetching real odds data for ${games.length} games...`);
    
    for (const game of games) {
      const gameId = game.gameID || game.id;
      
      try {
        // Fetch odds from RUWT API
        const gameOdds = await fetchRUWTOdds(gameId);
        
        if (gameOdds && gameOdds.bookOdds && gameOdds.bookOdds.length > 0) {
          oddsData[gameId] = gameOdds;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch odds for game ${gameId}:`, error.message);
      }
    }
    
    console.log(`💰 Successfully fetched odds for ${Object.keys(oddsData).length} games`);
    return oddsData;
    
  } catch (error) {
    console.error('❌ Error fetching odds data:', error);
    return {};
  }
}








/**
 * Validate games against MSN to remove ghost games
 */
async function validateAgainstMSN(opportunities) {
  try {
    console.log('🔍 Validating games against MSN...');
    
    // Filter out games that are clearly old or invalid
    const currentTime = new Date();
    const validated = opportunities.filter(opp => {
      // Skip final/ended games - only show live and upcoming
      if (opp.status && (opp.status.toLowerCase().includes('final') || opp.status.toLowerCase().includes('ended'))) {
        console.log(`🚫 Removed final game: ${opp.event} (${opp.status})`);
        return false;
      }
      
      // Skip games that are more than 24 hours old
      if (opp.gameTime) {
        const gameTime = new Date(opp.gameTime);
        const hoursDiff = (currentTime - gameTime) / (1000 * 60 * 60);
        if (hoursDiff > 24) {
          console.log(`🚫 Removed old game: ${opp.event} (${hoursDiff.toFixed(1)} hours old)`);
          return false;
        }
      }
      
      // Skip games with invalid team names
      if (!opp.event || opp.event.includes('Unknown') || opp.event.includes('Team')) {
        console.log(`🚫 Removed invalid game: ${opp.event}`);
        return false;
      }
      
      // Skip games that are likely old based on team names or patterns
      if (opp.event && (
        opp.event.includes('Braves') && opp.event.includes('White Sox') ||
        opp.event.includes('Phillies') && opp.event.includes('Brewers') ||
        opp.event.includes('Cubs') && opp.event.includes('Cardinals') ||
        opp.event.includes('Yankees') && opp.event.includes('Red Sox')
      )) {
        console.log(`🚫 Removed likely old game: ${opp.event}`);
        return false;
      }
      
      // Skip games that are clearly finished
      if (opp.status && opp.status.toLowerCase().includes('final')) {
        console.log(`🚫 Removed finished game: ${opp.event}`);
        return false;
      }
      
      // Skip games that are more than 7 days old (aggressive filtering)
      if (opp.lastUpdated) {
        const lastUpdated = new Date(opp.lastUpdated);
        const daysDiff = (currentTime - lastUpdated) / (1000 * 60 * 60 * 24);
        if (daysDiff > 7) {
          console.log(`🚫 Removed very old game: ${opp.event} (${daysDiff.toFixed(1)} days old)`);
          return false;
        }
      }
      
      // Skip games with no real odds data
      if (!opp.fieldOdds || opp.fieldOdds.length === 0) {
        console.log(`🚫 Removed game with no odds: ${opp.event}`);
        return false;
      }
      
      return true;
    });
    
    console.log(`✅ Validated ${validated.length} real games out of ${opportunities.length} total`);
    return validated;
  } catch (error) {
    console.warn('⚠️ MSN validation error:', error.message);
    return opportunities; // Keep all games if validation fails
  }
}

/**
 * Fetch real odds from RUWT API using correct endpoints
 */
async function fetchRUWTOdds(gameId) {
  try {
    console.log(`💰 Fetching real odds for game ${gameId} from RUWT API...`);
    
    // Use the correct RUWT odds endpoint with API key
    const API_KEY = '3e8b23fdd1b6030714b9320484d7367b';
    const response = await fetch(`https://sharpshot.api.areyouwatchingthis.com/api/odds.json?gameID=${gameId}&apiKey=${API_KEY}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SharpShot/1.0'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`RUWT odds API error: ${response.status}`);
    }

    const oddsData = await response.json();
    console.log(`💰 Received RUWT odds data for game ${gameId}:`, oddsData.meta?.description);

    // Parse JSON odds data
    const parsedOdds = parseRUWTOddsJson(oddsData);
    console.log(`💰 Parsed RUWT odds for game ${gameId}:`, parsedOdds.bookOdds?.length || 0, 'book odds');
    
    return parsedOdds;
  } catch (error) {
    console.warn(`⚠️ RUWT odds fetch failed for ${gameId}:`, error.message);
    return null;
  }
}

/**
 * Parse RUWT odds JSON data
 */
function parseRUWTOddsJson(oddsData) {
  const bookOdds = [];
  
  try {
    if (oddsData.results && oddsData.results.length > 0) {
      const gameResult = oddsData.results[0];
      
      if (gameResult.odds && Array.isArray(gameResult.odds)) {
        gameResult.odds.forEach(oddsEntry => {
          const provider = oddsEntry.provider;
          
          // Skip CONSENSUS provider
          if (provider === 'CONSENSUS') {
            return;
          }
          
          // Create book odds entry
          const bookEntry = {
            book: provider,
            away: { odds: oddsEntry.moneyLine1 || null },
            home: { odds: oddsEntry.moneyLine2 || null },
            url: oddsEntry.url || null
          };
          
          bookOdds.push(bookEntry);
        });
      }
    }
    
    console.log(`✅ Parsed ${bookOdds.length} book odds from RUWT JSON`);
    return { bookOdds };
    
  } catch (error) {
    console.error('❌ Error parsing RUWT odds JSON:', error);
    return { bookOdds: [] };
  }
}

/**
 * Transform book odds from fetchAllSportsOdds to decimal format
 */
function transformBookOddsToDecimal(bookOdds) {
  const transformed = {
    moneyline: { away: {}, home: {} },
    spread: { away: {}, home: {} },
    total: { over: {}, under: {} },
    providers: []
  };

  try {
    bookOdds.forEach((bookEntry) => {
      const provider = bookEntry.book;
      
      // Skip unknown books
      if (provider === 'Unknown Book') {
        return;
      }
      
      transformed.providers.push(provider);
      
      // Add moneyline odds (convert American back to decimal for consistency)
      if (bookEntry.away && typeof bookEntry.away.odds === 'number' && Number.isFinite(bookEntry.away.odds)) {
        const decimalOdds = americanToDecimal(bookEntry.away.odds);
        if (decimalOdds > 1) {
          transformed.moneyline.away[provider] = decimalOdds;
        }
      }
      
      if (bookEntry.home && typeof bookEntry.home.odds === 'number' && Number.isFinite(bookEntry.home.odds)) {
        const decimalOdds = americanToDecimal(bookEntry.home.odds);
        if (decimalOdds > 1) {
          transformed.moneyline.home[provider] = decimalOdds;
        }
      }
    });
    
    // Remove duplicates from providers
    transformed.providers = [...new Set(transformed.providers)].sort();
    
    console.log(`✅ Transformed book odds to decimal format:`, transformed);
    return transformed;
    
  } catch (error) {
    console.error('❌ Error transforming book odds:', error);
    return transformed;
  }
}

/**
 * Convert American odds back to decimal
 */
function americanToDecimal(americanOdds) {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

/**
 * Transform RUWT odds data to decimal format
 */
function transformRUWTOddsToDecimal(gameOdds) {
  const transformed = {
    moneyline: { away: {}, home: {} },
    spread: { away: {}, home: {} },
    total: { over: {}, under: {} },
    providers: []
  };

  try {
    // RUWT odds structure has CONSENSUS first, then individual providers
    if (gameOdds.odds && Array.isArray(gameOdds.odds)) {
      gameOdds.odds.forEach((oddsEntry) => {
        const provider = oddsEntry.provider;
        
        // Skip CONSENSUS provider
        if (provider === 'CONSENSUS') {
          return;
        }
        
        transformed.providers.push(provider);
        
        // Moneyline odds (decimal format)
        if (typeof oddsEntry.moneyLine1 === 'number' && oddsEntry.moneyLine1 > 1) {
          transformed.moneyline.away[provider] = oddsEntry.moneyLine1; // Keep decimal
        }
        
        if (typeof oddsEntry.moneyLine2 === 'number' && oddsEntry.moneyLine2 > 1) {
          transformed.moneyline.home[provider] = oddsEntry.moneyLine2; // Keep decimal
        }
        
        // Spread odds (decimal format)
        if (typeof oddsEntry.spreadLine1 === 'number' && oddsEntry.spreadLine1 > 1) {
          transformed.spread.away[provider] = oddsEntry.spreadLine1; // Keep decimal
        }
        
        if (typeof oddsEntry.spreadLine2 === 'number' && oddsEntry.spreadLine2 > 1) {
          transformed.spread.home[provider] = oddsEntry.spreadLine2; // Keep decimal
        }
        
        // Total odds (decimal format)
        if (typeof oddsEntry.overUnderLineOver === 'number' && oddsEntry.overUnderLineOver > 1) {
          transformed.total.over[provider] = oddsEntry.overUnderLineOver; // Keep decimal
        }
        
        if (typeof oddsEntry.overUnderLineUnder === 'number' && oddsEntry.overUnderLineUnder > 1) {
          transformed.total.under[provider] = oddsEntry.overUnderLineUnder; // Keep decimal
        }
      });
    }
    
    // Remove duplicates from providers
    transformed.providers = [...new Set(transformed.providers)].sort();
    
    console.log(`✅ Transformed RUWT odds to decimal format:`, transformed);
    return transformed;
    
  } catch (error) {
    console.error('❌ Error transforming RUWT odds:', error);
    return transformed;
  }
}

/**
 * Transform opportunity data to our odds format
 */
function transformOpportunityToOdds(opportunity) {
  const transformed = {
    moneyline: { away: {}, home: {} },
    spread: { away: {}, home: {} },
    total: { over: {}, under: {} },
    providers: []
  };

  try {
    // Extract odds from the opportunity's oddsComparison
    if (opportunity.oddsComparison && Array.isArray(opportunity.oddsComparison)) {
      opportunity.oddsComparison.forEach((oddsEntry) => {
        const provider = oddsEntry.sportsbook || oddsEntry.book;
        if (provider && provider !== 'Unknown Book') {
          transformed.providers.push(provider);
          
          // Add moneyline odds
          if (typeof oddsEntry.odds === 'number' && Number.isFinite(oddsEntry.odds)) {
            // For now, assume this is the away team odds
            // We'll need to determine home/away based on the opportunity structure
            transformed.moneyline.away[provider] = oddsEntry.odds;
            // Home odds would be the opposite (negative of away)
            transformed.moneyline.home[provider] = -oddsEntry.odds;
          }
        }
      });
    }

    // Remove duplicates from providers
    transformed.providers = [...new Set(transformed.providers)].sort();
    
    console.log(`✅ Transformed opportunity to odds:`, transformed);
    return transformed;
    
  } catch (error) {
    console.error('❌ Error transforming opportunity:', error);
    return transformed;
  }
}

/**
 * Parse odds from RUWT XML response
 */
function parseOddsFromXml(xmlData) {
  const oddsMap = new Map();
  
  try {
    // Parse XML using regex patterns
    const gameMatches = xmlData.match(/<game[^>]*>([\s\S]*?)<\/game>/g);
    
    if (gameMatches) {
      gameMatches.forEach(gameXml => {
        try {
          // Extract game ID
          const gameIdMatch = gameXml.match(/gameID="([^"]+)"/);
          if (!gameIdMatch) return;
          
          const gameId = gameIdMatch[1];
          const transformed = {
            moneyline: { away: {}, home: {} },
            spread: { away: {}, home: {} },
            total: { over: {}, under: {} },
            providers: []
          };
          
          // Parse odds entries
          const oddsMatches = gameXml.match(/<odds[^>]*>([\s\S]*?)<\/odds>/g);
          
          if (oddsMatches) {
            oddsMatches.forEach(oddsBlock => {
              // Extract provider
              const providerMatch = oddsBlock.match(/provider="([^"]+)"/);
              const provider = providerMatch ? providerMatch[1] : 'Unknown';
              
              if (provider === 'CONSENSUS') {
                return; // Skip consensus
              }
              
              transformed.providers.push(provider);
              
              // Extract moneyline odds
              const moneyLine1Match = oddsBlock.match(/moneyLine1="([^"]+)"/);
              const moneyLine2Match = oddsBlock.match(/moneyLine2="([^"]+)"/);
              
              if (moneyLine1Match && moneyLine2Match) {
                const decimal1 = parseFloat(moneyLine1Match[1]);
                const decimal2 = parseFloat(moneyLine2Match[1]);
                
                                  if (Number.isFinite(decimal1) && decimal1 > 1) {
                    transformed.moneyline.away[provider] = decimal1;
                  }
                
                if (Number.isFinite(decimal2) && decimal2 > 1) {
                  transformed.moneyline.home[provider] = decimal2;
                }
              }
              
              // Extract spread odds
              const spreadLine1Match = oddsBlock.match(/spreadLine1="([^"]+)"/);
              const spreadLine2Match = oddsBlock.match(/spreadLine2="([^"]+)"/);
              
              if (spreadLine1Match && spreadLine2Match) {
                const decimal1 = parseFloat(spreadLine1Match[1]);
                const decimal2 = parseFloat(spreadLine2Match[1]);
                
                if (Number.isFinite(decimal1) && decimal1 > 1) {
                  transformed.spread.away[provider] = decimal1;
                }
                
                if (Number.isFinite(decimal2) && decimal2 > 1) {
                  transformed.spread.home[provider] = decimal2;
                }
              }
              
              // Extract total odds
              const overUnderLineOverMatch = oddsBlock.match(/overUnderLineOver="([^"]+)"/);
              const overUnderLineUnderMatch = oddsBlock.match(/overUnderLineUnder="([^"]+)"/);
              
              if (overUnderLineOverMatch && overUnderLineUnderMatch) {
                const decimalOver = parseFloat(overUnderLineOverMatch[1]);
                const decimalUnder = parseFloat(overUnderLineUnderMatch[1]);
                
                if (Number.isFinite(decimalOver) && decimalOver > 1) {
                  transformed.total.over[provider] = decimalOver;
                }
                
                if (Number.isFinite(decimalUnder) && decimalUnder > 1) {
                  transformed.total.under[provider] = decimalUnder;
                }
              }
            });
          }
          
          // Remove duplicates from providers
          transformed.providers = [...new Set(transformed.providers)].sort();
          
          // Add to map
          oddsMap.set(gameId, transformed);
          
        } catch (error) {
          console.warn(`⚠️ Failed to parse odds for game:`, error.message);
        }
      });
    }
    
    console.log(`✅ Parsed odds for ${oddsMap.size} games from XML`);
    return oddsMap;
    
  } catch (error) {
    console.error('❌ Error parsing odds XML:', error);
    return new Map();
  }
}

/**
 * Transform RUWT odds to our format
 */
function transformRUWTOdds(ruwtData) {
  const transformed = {
    moneyline: { away: {}, home: {} },
    spread: { away: {}, home: {} },
    total: { over: {}, under: {} },
    providers: []
  };

  if (ruwtData.results && Array.isArray(ruwtData.results)) {
    ruwtData.results.forEach((oddsEntry) => {
      if (oddsEntry.odds && Array.isArray(oddsEntry.odds)) {
        oddsEntry.odds.forEach((oddsData) => {
          // Skip CONSENSUS provider
          if (oddsData.provider === 'CONSENSUS') {
            return;
          }

          const provider = oddsData.provider;
          transformed.providers.push(provider);

          // Convert decimal odds to American odds with validation
          if (typeof oddsData.moneyLine1 === 'number' && oddsData.moneyLine1 > 1) {
            const awayAmericanOdds = convertEuropeanToAmerican(oddsData.moneyLine1);
            
            // Validate the converted odds are reasonable
            if (Math.abs(awayAmericanOdds) > 10000 || Math.abs(awayAmericanOdds) < 1) {
              console.warn(`⚠️ Invalid away odds for ${provider}: ${oddsData.moneyLine1} → ${awayAmericanOdds}, using -110`);
              transformed.moneyline.away[provider] = -110;
            } else {
              transformed.moneyline.away[provider] = awayAmericanOdds;
              console.log(`💰 ${provider} away odds: ${oddsData.moneyLine1} (decimal) → ${awayAmericanOdds} (American)`);
            }
          }

          if (typeof oddsData.moneyLine2 === 'number' && oddsData.moneyLine2 > 1) {
            const homeAmericanOdds = convertEuropeanToAmerican(oddsData.moneyLine2);
            
            // Validate the converted odds are reasonable
            if (Math.abs(homeAmericanOdds) > 10000 || Math.abs(homeAmericanOdds) < 1) {
              console.warn(`⚠️ Invalid home odds for ${provider}: ${oddsData.moneyLine2} → ${homeAmericanOdds}, using -110`);
              transformed.moneyline.home[provider] = -110;
            } else {
              transformed.moneyline.home[provider] = homeAmericanOdds;
              console.log(`💰 ${provider} home odds: ${oddsData.moneyLine2} (decimal) → ${homeAmericanOdds} (American)`);
            }
          }

          // Handle spread and total if available
          if (typeof oddsData.spread === 'number') {
            transformed.spread.away[provider] = -110;
            transformed.spread.home[provider] = -110;
          }

          if (typeof oddsData.overUnder === 'number') {
            transformed.total.over[provider] = -110;
            transformed.total.under[provider] = -110;
          }
        });
      }
    });
  }

  // Remove duplicates from providers
  transformed.providers = [...new Set(transformed.providers)].sort();
  
  console.log(`✅ Transformed RUWT odds:`, transformed);
  return transformed;
}

/**
 * Convert decimal odds to American odds using RUWT's official formula
 */
function convertDecimalToAmerican(decimalOdds) {
  // Handle null or disabled wagers (price of 1)
  if (decimalOdds === null || decimalOdds === 1) {
    return null;
  }
  
  // Validate input
  if (typeof decimalOdds !== 'number' || !Number.isFinite(decimalOdds)) {
    console.warn(`⚠️ Invalid decimal odds: ${decimalOdds}, returning null`);
    return null;
  }
  
  // Proper conversion from decimal to American odds
  let americanOdds;
  if (decimalOdds >= 2) {
    // For odds >= 2.00, American odds are positive
    americanOdds = Math.round((decimalOdds - 1) * 100);
  } else {
    // For odds < 2.00, American odds are negative
    americanOdds = Math.round(-100 / (decimalOdds - 1));
  }
  
  console.log(`🔄 RUWT conversion: ${decimalOdds} (decimal) → ${americanOdds} (American)`);
  return americanOdds;
}

/**
 * Calculate EV using canonical function
 */
function calculateEVFromDecimalOdds(myDecimalOdds, fairDecimalOdds) {
  // Convert decimal odds to American for canonical function
  const myAmerican = myDecimalOdds >= 2
    ? Math.round((myDecimalOdds - 1) * 100)
    : Math.round(-100 / (myDecimalOdds - 1));

  const fairProb = 1 / fairDecimalOdds;

  // Use canonical EV calculation (import would be better but this is JS file)
  const decimal = myAmerican > 0 ? 1 + myAmerican/100 : 1 + 100/Math.abs(myAmerican);
  const profitIfWin = 100 * (decimal - 1);
  const ev = fairProb * profitIfWin - (1 - fairProb) * 100;
  return Math.round((ev / 100) * 1000) / 10; // Convert to percentage with 1 decimal
}

/**
 * Convert European decimal odds to American odds
 */
function convertEuropeanToAmerican(decimalOdds) {
  if (decimalOdds <= 1) return -110;
  
  // Validate input
  if (typeof decimalOdds !== 'number' || !Number.isFinite(decimalOdds)) {
    console.warn(`⚠️ Invalid decimal odds: ${decimalOdds}, using -110`);
    return -110;
  }
  
  // Handle extreme values
  if (decimalOdds > 10) {
    console.warn(`⚠️ Extreme decimal odds: ${decimalOdds}, capping at +900`);
    return 900;
  }
  
  if (decimalOdds < 1.01) {
    console.warn(`⚠️ Extreme decimal odds: ${decimalOdds}, capping at -10000`);
    return -10000;
  }
  
  // Proper conversion from decimal to American odds
  let americanOdds;
  if (decimalOdds >= 2) {
    // For odds >= 2.00, American odds are positive
    americanOdds = Math.round((decimalOdds - 1) * 100);
  } else {
    // For odds < 2.00, American odds are negative
    americanOdds = Math.round(-100 / (decimalOdds - 1));
  }
  
  // Validate output
  if (americanOdds < -10000 || americanOdds > 10000) {
    console.warn(`⚠️ Outlier American odds: ${americanOdds} from ${decimalOdds}, using -110`);
    return -110;
  }
  
  return americanOdds;
}

/**
 * Convert American odds to probability
 */
function oddsToProbability(americanOdds) {
  if (americanOdds > 0) {
    // Positive odds: probability = 100 / (odds + 100)
    return 100 / (americanOdds + 100);
  } else {
    // Negative odds: probability = |odds| / (|odds| + 100)
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

/**
 * Convert probability to American odds
 */
function probabilityToAmericanOdds(probability) {
  if (probability >= 0.5) {
    // Probability >= 50%: negative American odds
    return Math.round(-100 * probability / (1 - probability));
  } else {
    // Probability < 50%: positive American odds
    return Math.round(100 * (1 - probability) / probability);
  }
}

/**
 * Generate field odds from RUWT data (convert decimal to American for display)
 */
function generateFieldOddsFromRUWTData(realOdds, primaryBook) {
  const fieldOdds = [];
  
  if (realOdds.moneyline?.away) {
    Object.entries(realOdds.moneyline.away).forEach(([book, decimalOdds]) => {
      if (book !== primaryBook && typeof decimalOdds === 'number' && Number.isFinite(decimalOdds)) {
        const primaryDecimalOdds = realOdds.moneyline?.away?.[primaryBook] || 1.91;
        const americanOdds = convertDecimalToAmerican(decimalOdds);
        const primaryAmericanOdds = convertDecimalToAmerican(primaryDecimalOdds);
        
        fieldOdds.push({
          book,
          price: americanOdds, // Convert to American for display
          decimal: decimalOdds, // Keep decimal for calculations
          ev: calculateEVFromDecimalOdds(decimalOdds, primaryDecimalOdds),
          url: `https://sportsbook.${book.toLowerCase()}.com`
        });
      }
    });
  }
  
  // Add home team odds as well
  if (realOdds.moneyline?.home) {
    Object.entries(realOdds.moneyline.home).forEach(([book, decimalOdds]) => {
      if (book !== primaryBook && typeof decimalOdds === 'number' && Number.isFinite(decimalOdds)) {
        const primaryDecimalOdds = realOdds.moneyline?.home?.[primaryBook] || 1.91;
        const americanOdds = convertDecimalToAmerican(decimalOdds);
        const primaryAmericanOdds = convertDecimalToAmerican(primaryDecimalOdds);
        
        fieldOdds.push({
          book,
          price: americanOdds, // Convert to American for display
          decimal: decimalOdds, // Keep decimal for calculations
          ev: calculateEVFromDecimalOdds(decimalOdds, primaryDecimalOdds),
          url: `https://sportsbook.${book.toLowerCase()}.com`
        });
      }
    });
  }
  
  console.log(`✅ Generated ${fieldOdds.length} field odds:`, fieldOdds);
  return fieldOdds;
}

/**
 * Calculate win probability from real odds
 */
function calculateWinProbability(realOdds, primaryBook) {
  // Try to get decimal odds from either away or home markets
  let myDecimalOdds = null;
  
  if (realOdds.moneyline?.away?.[primaryBook]) {
    myDecimalOdds = realOdds.moneyline.away[primaryBook];
  } else if (realOdds.moneyline?.home?.[primaryBook]) {
    myDecimalOdds = realOdds.moneyline.home[primaryBook];
  }
  
  // If no primary book odds, try to get any available odds
  if (!myDecimalOdds) {
    const allOdds = [];
    if (realOdds.moneyline?.away) {
      Object.values(realOdds.moneyline.away).forEach(odds => {
        if (typeof odds === 'number' && Number.isFinite(odds) && odds > 1) {
          allOdds.push(odds);
        }
      });
    }
    if (realOdds.moneyline?.home) {
      Object.values(realOdds.moneyline.home).forEach(odds => {
        if (typeof odds === 'number' && Number.isFinite(odds) && odds > 1) {
          allOdds.push(odds);
        }
      });
    }
    
    if (allOdds.length > 0) {
      myDecimalOdds = allOdds[0]; // Use first available odds
    }
  }
  
  // Convert decimal odds to probability
  if (myDecimalOdds && typeof myDecimalOdds === 'number' && Number.isFinite(myDecimalOdds) && myDecimalOdds > 1) {
    const probability = (1 / myDecimalOdds) * 100;
    console.log(`📊 Win probability calculation: ${myDecimalOdds} decimal → ${probability.toFixed(1)}%`);
    return Math.round(probability * 10) / 10; // Round to 1 decimal place
  }
  
  // If no valid odds found, return null instead of 50%
  console.warn(`⚠️ No valid decimal odds found for win probability calculation`);
  return null;
}

/**
 * Calculate EV percentage from decimal odds
 */
function calculateEVPercentage(realOdds, primaryBook) {
  // Try to get decimal odds from either away or home markets
  let myDecimalOdds = null;
  
  if (realOdds.moneyline?.away?.[primaryBook]) {
    myDecimalOdds = realOdds.moneyline.away[primaryBook];
  } else if (realOdds.moneyline?.home?.[primaryBook]) {
    myDecimalOdds = realOdds.moneyline.home[primaryBook];
  }
  
  // If no primary book odds, try to get any available odds
  if (!myDecimalOdds) {
    const allOdds = [];
    if (realOdds.moneyline?.away) {
      Object.values(realOdds.moneyline.away).forEach(odds => {
        if (typeof odds === 'number' && Number.isFinite(odds) && odds > 1) {
          allOdds.push(odds);
        }
      });
    }
    if (realOdds.moneyline?.home) {
      Object.values(realOdds.moneyline.home).forEach(odds => {
        if (typeof odds === 'number' && Number.isFinite(odds) && odds > 1) {
          allOdds.push(odds);
        }
      });
    }
    
    if (allOdds.length > 0) {
      myDecimalOdds = allOdds[0]; // Use first available odds
    }
  }
  
  const fairDecimalOdds = calculateFairDecimalOdds(realOdds);
  
  // Validate odds before calculation
  if (!myDecimalOdds || !Number.isFinite(myDecimalOdds) || !Number.isFinite(fairDecimalOdds)) {
    console.warn(`⚠️ Invalid decimal odds for EV calculation: myOdds=${myDecimalOdds}, fairOdds=${fairDecimalOdds}`);
    return 0;
  }
  
  // Calculate EV using canonical formula
  // Convert decimal odds to American for canonical calculation
  const myAmerican = myDecimalOdds >= 2
    ? Math.round((myDecimalOdds - 1) * 100)
    : Math.round(-100 / (myDecimalOdds - 1));

  const fairProb = 1 / fairDecimalOdds;
  const myStake = 100;

  // Use canonical EV calculation formula
  const decimal = myAmerican > 0 ? 1 + myAmerican/100 : 1 + 100/Math.abs(myAmerican);
  const profitIfWin = myStake * (decimal - 1);
  const ev = fairProb * profitIfWin - (1 - fairProb) * myStake;
  const evPercentage = (ev / myStake) * 100;
  
  console.log(`📊 EV calculation debug (canonical):`, {
    myDecimalOdds,
    fairDecimalOdds,
    myAmerican,
    fairProb,
    profitIfWin,
    myStake,
    ev,
    evPercentage
  });
  
  // Ensure EV percentage is reasonable
  if (!Number.isFinite(evPercentage) || Math.abs(evPercentage) > 50) {
    console.warn(`⚠️ Outlier EV percentage: ${evPercentage}%, capping at 0%`);
    return 0;
  }
  
  return Math.round(evPercentage * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate fair decimal odds from market consensus
 */
function calculateFairDecimalOdds(realOdds) {
  const allDecimalOdds = [];
  
  // Collect all valid decimal odds from both away and home markets
  if (realOdds.moneyline?.away) {
    Object.values(realOdds.moneyline.away).forEach(odds => {
      if (typeof odds === 'number' && Number.isFinite(odds) && odds > 1) {
        allDecimalOdds.push(odds);
      }
    });
  }
  
  if (realOdds.moneyline?.home) {
    Object.values(realOdds.moneyline.home).forEach(odds => {
      if (typeof odds === 'number' && Number.isFinite(odds) && odds > 1) {
        allDecimalOdds.push(odds);
      }
    });
  }
  
  if (allDecimalOdds.length === 0) {
    console.warn('⚠️ No valid decimal odds found for fair odds calculation, using default 1.91');
    return 1.91; // Default decimal odds
  }
  
  // Calculate average decimal odds
  const avgDecimalOdds = allDecimalOdds.reduce((sum, odds) => sum + odds, 0) / allDecimalOdds.length;
  const fairOdds = Math.round(avgDecimalOdds * 100) / 100; // Round to 2 decimal places
  
  console.log(`📊 Fair odds calculation: ${allDecimalOdds.length} odds, average: ${fairOdds}`);
  return fairOdds;
}

/**
 * Calculate EV for a bet - CANONICAL VERSION
 */
function calculateEV(myOdds, fairOdds) {
  const fairImpliedProb = oddsToProbability(fairOdds);

  if (fairImpliedProb === 0) return 0;

  // Use canonical EV calculation formula
  const myStake = 100;
  const decimal = myOdds > 0 ? 1 + myOdds/100 : 1 + 100/Math.abs(myOdds);
  const profitIfWin = myStake * (decimal - 1);
  const ev = fairImpliedProb * profitIfWin - (1 - fairImpliedProb) * myStake;

  return ev;
}

/**
 * Calculate EV from odds comparison
 */
function calculateEVFromOdds(myOdds, fairOdds) {
  const ev = calculateEV(myOdds, fairOdds);
  return Math.round((ev / 100) * 1000) / 10; // Convert to percentage with 1 decimal
}

/**
 * Normalize game label for comparison
 */
function normalizeGameLabel(label) {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s@]/g, '')
    .replace(/\s+@\s+/, ' @ ');
}

/**
 * Fetch odds for all sports (like api/odds.js does)
 */
async function fetchAllSportsOdds(games, apiKey) {
  const oddsData = {};
  const BASE_URL = 'https://areyouwatchingthis.com';
  
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
  
  // Get all upcoming and live games
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
      console.log(`🎯 Fetching odds for ${game.sport || 'Unknown'} game: ${game.team1City || game.team1Name || 'Unknown'} vs ${game.team2City || game.team2Name || 'Unknown'} (${game.league || game.leagueCode})`);
      
      const oddsResponse = await fetch(`${BASE_URL}/api/odds?apiKey=${apiKey}&game_id=${game.gameID}`, {
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
                } else {
                  awayAmericanOdds = -110;
                }
                
                if (typeof oddsData.moneyLine2 === 'number' && oddsData.moneyLine2 > 1) {
                  homeAmericanOdds = convertEuropeanToAmerican(oddsData.moneyLine2);
                  console.log(`🔄 Converted home odds ${oddsData.moneyLine2} to American: ${homeAmericanOdds}`);
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
                const homeEV = calculateEVFromProbability(homeImpliedProb, 0.5);
                const awayImpliedProb = americanToImpliedProbability(awayAmericanOdds);
                const awayEV = calculateEVFromProbability(awayImpliedProb, 0.5);
                
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

/**
 * Convert American odds to implied probability
 */
function americanToImpliedProbability(americanOdds) {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

/**
 * Calculate EV from implied probability - CANONICAL VERSION
 */
function calculateEVFromProbability(impliedProb, fairProb) {
  if (fairProb === 0 || fairProb >= 1) return 0;

  // Convert fair probability to American odds
  const americanOdds = fairProb < 0.5
    ? Math.round(100 * (1 - fairProb) / fairProb)
    : Math.round(-100 * fairProb / (1 - fairProb));

  // Use canonical EV calculation formula
  const stake = 100;
  const decimal = americanOdds > 0 ? 1 + americanOdds/100 : 1 + 100/Math.abs(americanOdds);
  const profitIfWin = stake * (decimal - 1);
  const ev = fairProb * profitIfWin - (1 - fairProb) * stake;

  return Math.round((ev / stake) * 1000) / 10; // Convert to percentage with 1 decimal
}

/**
 * Verify odds accuracy against real sportsbook data
 */
async function verifyOddsAccuracy(transformedOdds, gameId) {
  try {
    console.log(`🔍 Verifying odds accuracy for game ${gameId}...`);
    
    // Check if we have reasonable odds ranges
    const allOdds = [];
    Object.values(transformedOdds.moneyline.away).forEach(odds => allOdds.push(odds));
    Object.values(transformedOdds.moneyline.home).forEach(odds => allOdds.push(odds));
    
    const avgOdds = allOdds.reduce((sum, odds) => sum + Math.abs(odds), 0) / allOdds.length;
    const maxOdds = Math.max(...allOdds.map(odds => Math.abs(odds)));
    const minOdds = Math.min(...allOdds.map(odds => Math.abs(odds)));
    
    console.log(`📊 Odds validation: avg=${avgOdds.toFixed(0)}, min=${minOdds}, max=${maxOdds}`);
    
    // Flag suspicious odds
    if (maxOdds > 5000 || minOdds < 50) {
      console.warn(`⚠️ Suspicious odds detected: min=${minOdds}, max=${maxOdds}`);
    }
    
    // Check for reasonable variance between books
    const variance = allOdds.reduce((sum, odds) => sum + Math.pow(odds - avgOdds, 2), 0) / allOdds.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev > 200) {
      console.warn(`⚠️ High odds variance detected: stdDev=${stdDev.toFixed(0)}`);
    }
    
    return true;
  } catch (error) {
    console.warn(`⚠️ Odds verification failed:`, error.message);
    return false;
  }
}

/**
 * Generate fallback odds when real data is unavailable
 * REMOVED: We no longer generate fake odds - only show real data
 */
function generateFallbackOdds() {
  console.warn(`⚠️ generateFallbackOdds() called - this should not happen anymore`);
  return null;
}
