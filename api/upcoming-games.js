// Import team mapping utilities
import { enhanceTeamData, normalizeLeague, getFullTeamName } from './lib/teamMapping.js';

// Dedicated API endpoint for upcoming games with time indicators
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
    const { sport, league, daysAhead = 7 } = req.query;
    const API_KEY = '3e8b23fdd1b6030714b9320484d7367b';
    const BASE_URL = 'https://areyouwatchingthis.com';
    
    console.log('🎯 Fetching upcoming games from areyouwatchingthis.com...', { sport, league, daysAhead });
    
    // Fetch games data from the real API (XML format)
    const gamesResponse = await fetch(`${BASE_URL}/api/games?key=${API_KEY}`, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'SharpShot-UpcomingGames/1.0'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!gamesResponse.ok) {
      throw new Error(`Games API error: ${gamesResponse.status}`);
    }

    const gamesXml = await gamesResponse.text();
    console.log(`📄 Received XML response (${gamesXml.length} chars)`);
    
    // Parse XML and extract upcoming games with odds
    const upcomingGames = parseUpcomingGamesWithOdds(gamesXml, sport, league, parseInt(daysAhead));
    
    // Calculate time indicators for each game
    const gamesWithTimeIndicators = upcomingGames.map(game => ({
      ...game,
      timeUntilStart: calculateTimeUntilStart(game.gameTime),
      formattedGameTime: formatGameTime(game.gameTime),
      isToday: isToday(game.gameTime),
      isTomorrow: isTomorrow(game.gameTime),
      dayOfWeek: getDayOfWeek(game.gameTime)
    }));

    // Sort by game time (earliest first)
    gamesWithTimeIndicators.sort((a, b) => new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime());

    const response = {
      upcomingGames: gamesWithTimeIndicators,
      totalGames: gamesWithTimeIndicators.length,
      filters: {
        sport: sport || 'all',
        league: league || 'all',
        daysAhead: parseInt(daysAhead)
      },
      stats: {
        today: gamesWithTimeIndicators.filter(g => g.isToday).length,
        tomorrow: gamesWithTimeIndicators.filter(g => g.isTomorrow).length,
        thisWeek: gamesWithTimeIndicators.filter(g => g.timeUntilStart.days <= 7).length,
        leagues: [...new Set(gamesWithTimeIndicators.map(g => g.league))].sort()
      },
      lastUpdated: new Date().toISOString(),
      dataSource: 'Are You Watching This API - Upcoming Games with Odds'
    };

    console.log(`✅ Returning ${gamesWithTimeIndicators.length} upcoming games`);
    res.status(200).json(response);

  } catch (error) {
    console.error('Upcoming Games API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch upcoming games data',
      message: error.message 
    });
  }
}

// Parse XML and extract upcoming games with their odds
function parseUpcomingGamesWithOdds(xmlString, sportFilter, leagueFilter, daysAhead) {
  const upcomingGames = [];

  try {
    const gameMatches = xmlString.match(/<game[^>]*>.*?<\/game>/gs) || [];
    console.log(`Processing ${gameMatches.length} games for upcoming games with odds`);
    
    gameMatches.forEach((gameXml, index) => {
      // Extract game metadata
      const idMatch = gameXml.match(/id="([^"]*)"/) || ['', `upcoming_${index}`];
      const sportMatch = gameXml.match(/sport="([^"]*)"/) || ['', 'unknown'];
      const leagueMatch = gameXml.match(/leagueCode="([^"]*)"/) || ['', 'unknown'];
      
      // Apply sport/league filters
      if (sportFilter && sportFilter !== 'all' && sportMatch[1].toLowerCase() !== sportFilter.toLowerCase()) {
        return;
      }
      if (leagueFilter && leagueFilter !== 'all' && leagueMatch[1].toLowerCase() !== leagueFilter.toLowerCase()) {
        return;
      }
      
      // Extract timing and status
      const dateMatch = gameXml.match(/<date>([^<]*)<\/date>/) || ['', new Date().toISOString()];
      const timeMatch = gameXml.match(/<time>([^<]*)<\/time>/) || dateMatch;
      const statusMatch = gameXml.match(/<timeLeft>([^<]*)<\/timeLeft>/) || ['', 'Unknown'];
      
      // Check if this is an upcoming game (not final, not currently live)
      const isFinalGame = statusMatch[1] && statusMatch[1].toLowerCase().includes('final');
      const isLiveGame = statusMatch[1] && !statusMatch[1].includes('GMT') && statusMatch[1] !== '' && !statusMatch[1].toLowerCase().includes('final');
      const isUpcoming = !isFinalGame && !isLiveGame;
      
      if (isUpcoming) {
        // Extract team info
        const homeTeamMatch = gameXml.match(/<team[^>]*homeID[^>]*>.*?<city>([^<]*)<\/city>.*?<name>([^<]*)<\/name>.*?<initials>([^<]*)<\/initials>/s);
        const awayTeamMatch = gameXml.match(/<team[^>]*visitorID[^>]*>.*?<city>([^<]*)<\/city>.*?<name>([^<]*)<\/name>.*?<initials>([^<]*)<\/initials>/s);
        
        if (homeTeamMatch && awayTeamMatch) {
          const homeCity = homeTeamMatch[1].trim();
          const homeName = homeTeamMatch[2].trim();
          const homeInitials = homeTeamMatch[3].trim();
          const awayCity = awayTeamMatch[1].trim();
          const awayName = awayTeamMatch[2].trim();
          const awayInitials = awayTeamMatch[3].trim();
          
          const homeTeamRaw = homeName ? `${homeCity} ${homeName}`.trim() : homeCity;
          const awayTeamRaw = awayName ? `${awayCity} ${awayName}`.trim() : awayCity;
          
          // Enhance team names using our mapping system
          const sport = sportMatch[1];
          const league = leagueMatch[1];
          const homeTeam = getFullTeamName(homeCity, sport, league);
          const awayTeam = getFullTeamName(awayCity, sport, league);
          
          // Check if game is within the specified days ahead
          const gameTime = new Date(timeMatch[1]);
          const now = new Date();
          const maxFutureMs = daysAhead * 24 * 60 * 60 * 1000;
          const timeDiff = gameTime.getTime() - now.getTime();
          
          if (timeDiff > 0 && timeDiff <= maxFutureMs) {
            // Extract odds data for this game
            const odds = extractOddsFromGameXml(gameXml, homeTeam, awayTeam);
            
            console.log(`✅ UPCOMING GAME: ${awayTeam} @ ${homeTeam} (${gameTime.toLocaleDateString()})`);
            
            upcomingGames.push({
              id: idMatch[1],
              homeTeam,
              awayTeam,
              homeInitials,
              awayInitials,
              sport: normalizeLeague(sport),
              league: normalizeLeague(league),
              gameTime: gameTime.toISOString(),
              status: 'upcoming',
              odds: odds,
              hasOdds: odds.length > 0,
              // Raw data for debugging
              rawTeamData: {
                homeTeamRaw,
                awayTeamRaw,
                homeCity,
                awayCity,
                homeName,
                awayName
              }
            });
          } else if (timeDiff <= 0) {
            console.log(`🚫 PAST UPCOMING GAME: ${awayTeam} vs ${homeTeam} (${Math.round(-timeDiff / (1000 * 60 * 60 * 24))} days ago)`);
          } else {
            console.log(`🚫 FAR FUTURE GAME: ${awayTeam} vs ${homeTeam} (${Math.round(timeDiff / (1000 * 60 * 60 * 24))} days away)`);
          }
        }
      }
    });
  } catch (error) {
    console.error('XML parsing error for upcoming games:', error);
    return [];
  }
  
  console.log(`Returning ${upcomingGames.length} upcoming games with odds`);
  return upcomingGames;
}

// Extract odds data from game XML
function extractOddsFromGameXml(gameXml, homeTeam, awayTeam) {
  const odds = [];
  
  try {
    // Extract odds data - look for quotes within the game
    const quoteMatches = gameXml.match(/<quote[^>]*>.*?<\/quote>/gs) || [];
    
    quoteMatches.forEach(quoteXml => {
      const bookMatch = quoteXml.match(/book="([^"]*)"/) || ['', 'Unknown'];
      const typeMatch = quoteXml.match(/type="([^"]*)"/) || ['', 'moneyline'];
      const sideMatch = quoteXml.match(/side="([^"]*)"/) || ['', 'home'];
      const priceMatch = quoteXml.match(/price="([^"]*)"/) || ['', '0'];
      const lineMatch = quoteXml.match(/line="([^"]*)"/) || ['', null];
      
      const sportsbook = bookMatch[1];
      const betType = typeMatch[1];
      const side = sideMatch[1];
      const price = parseFloat(priceMatch[1]);
      const line = lineMatch[1] ? parseFloat(lineMatch[1]) : null;
      
      if (sportsbook && price !== 0) {
        odds.push({
          sportsbook,
          betType,
          side,
          price,
          line,
          team: side === 'home' ? homeTeam : awayTeam,
          lastUpdated: new Date().toISOString()
        });
      }
    });
  } catch (error) {
    console.error('Error extracting odds from game XML:', error);
  }
  
  return odds;
}

// Calculate time until game starts
function calculateTimeUntilStart(gameTime) {
  const now = new Date();
  const game = new Date(gameTime);
  const diffMs = game.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return {
      total: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: 'Game has started',
      shortFormat: 'Started'
    };
  }
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  let formatted = '';
  let shortFormat = '';
  
  if (days > 0) {
    formatted = `${days}d ${hours}h ${minutes}m`;
    shortFormat = `${days}d ${hours}h`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m`;
    shortFormat = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    formatted = `${minutes}m ${seconds}s`;
    shortFormat = `${minutes}m`;
  } else {
    formatted = `${seconds}s`;
    shortFormat = `${seconds}s`;
  }
  
  return {
    total: diffMs,
    days,
    hours,
    minutes,
    seconds,
    formatted,
    shortFormat
  };
}

// Format game time for display
function formatGameTime(gameTime) {
  try {
    const date = new Date(gameTime);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (date.toDateString() === today.toDateString()) {
      return `Today ${timeStr}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow ${timeStr}`;
    } else {
      return `${date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })} ${timeStr}`;
    }
  } catch {
    return gameTime;
  }
}

// Check if game is today
function isToday(gameTime) {
  const today = new Date();
  const gameDate = new Date(gameTime);
  return today.toDateString() === gameDate.toDateString();
}

// Check if game is tomorrow
function isTomorrow(gameTime) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const gameDate = new Date(gameTime);
  return tomorrow.toDateString() === gameDate.toDateString();
}

// Get day of week for game
function getDayOfWeek(gameTime) {
  try {
    const date = new Date(gameTime);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } catch {
    return 'Unknown';
  }
}


