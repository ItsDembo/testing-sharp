// Import team mapping utilities
import { enhanceTeamData, normalizeLeague, getFullTeamName } from './lib/teamMapping.js';

// Separate API endpoint for final game scores - keeps them out of trading terminal
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    
    // Fetch games data from the real API (XML format)
    const gamesResponse = await fetch(`${BASE_URL}/api/games?key=${API_KEY}`, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'SharpShot-Scores/1.0'
      }
    });

    if (!gamesResponse.ok) {
      throw new Error(`Games API error: ${gamesResponse.status}`);
    }

    const gamesXml = await gamesResponse.text();
    
    // Parse XML and extract final scores AND upcoming games
    const finalScores = parseFinalScoresFromXml(gamesXml);
    const upcomingGames = parseUpcomingGamesFromXml(gamesXml);

    // Calculate counts for all games
    const counts = {
      total: finalScores.length,
      today: finalScores.filter(score => isToday(score.gameTime)).length,
      yesterday: finalScores.filter(score => isYesterday(score.gameTime)).length,
      thisWeek: finalScores.filter(score => isThisWeek(score.gameTime)).length,
      upcoming: upcomingGames.length
    };

    res.status(200).json({
      finalScores,
      upcomingGames: upcomingGames.slice(0, 20), // Limit to 20 upcoming games
      counts,
      lastUpdated: new Date().toISOString(),
      filters: {
        leagues: [...new Set([...finalScores.map(score => score.league), ...upcomingGames.map(game => game.league)].filter(Boolean))].sort(),
        dateRange: {
          oldest: finalScores.length > 0 ? Math.min(...finalScores.map(s => new Date(s.gameTime).getTime())) : null,
          newest: finalScores.length > 0 ? Math.max(...finalScores.map(s => new Date(s.gameTime).getTime())) : null
        }
      },
      dataSource: 'Are You Watching This API - Final Scores and Upcoming Games',
      note: finalScores.length === 0 ? 
        `No final games found. ${upcomingGames.length} upcoming games available.` : 
        `Found ${finalScores.length} final games and ${upcomingGames.length} upcoming games.`
    });

  } catch (error) {
    console.error('Scores API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch scores data',
      message: error.message 
    });
  }
}

// Parse XML and extract only games with final scores
function parseFinalScoresFromXml(xmlString) {
  const finalScores = [];

  try {
    const gameMatches = xmlString.match(/<game[^>]*>.*?<\/game>/gs) || [];
    
    console.log(`Processing ${gameMatches.length} games for final scores`);
    
    gameMatches.forEach((gameXml, index) => {
      // Extract game metadata
      const idMatch = gameXml.match(/id="([^"]*)"/) || ['', `score_${index}`];
      const sportMatch = gameXml.match(/sport="([^"]*)"/) || ['', 'unknown'];
      const leagueMatch = gameXml.match(/leagueCode="([^"]*)"/) || ['', 'unknown'];
      
      // Extract teams with proper home/away designation
      const homeTeamMatch = gameXml.match(/<team[^>]*homeID[^>]*>.*?<city>([^<]*)<\/city>.*?<name>([^<]*)<\/name>.*?<initials>([^<]*)<\/initials>/s);
      const awayTeamMatch = gameXml.match(/<team[^>]*visitorID[^>]*>.*?<city>([^<]*)<\/city>.*?<name>([^<]*)<\/name>.*?<initials>([^<]*)<\/initials>/s);
      
      // Extract timing and status
      const dateMatch = gameXml.match(/<date>([^<]*)<\/date>/) || ['', new Date().toISOString()];
      const timeMatch = gameXml.match(/<time>([^<]*)<\/time>/) || dateMatch;
      const statusMatch = gameXml.match(/<timeLeft>([^<]*)<\/timeLeft>/) || ['', 'Unknown'];
      
      // Extract final scores - look for score attribute in team elements
      const homeScoreMatch = gameXml.match(/<team[^>]*homeID[^>]*[^>]*score="([^"]*)"/) || ['', null];
      const awayScoreMatch = gameXml.match(/<team[^>]*visitorID[^>]*[^>]*score="([^"]*)"/) || ['', null];
      
      // Only include games that are explicitly marked as final AND have scores
      const isFinalGame = statusMatch[1] && statusMatch[1].toLowerCase().includes('final');
      const hasScores = homeScoreMatch[1] !== null && awayScoreMatch[1] !== null;
      
      if (isFinalGame && hasScores && homeTeamMatch && awayTeamMatch) {
        const homeCity = homeTeamMatch[1].trim();
        const homeName = homeTeamMatch[2].trim();
        const homeInitials = homeTeamMatch[3].trim();
        const awayCity = awayTeamMatch[1].trim();
        const awayName = awayTeamMatch[2].trim();
        const awayInitials = awayTeamMatch[3].trim();
        
        // Build proper team names with enhanced mapping
        const homeTeamRaw = homeName ? `${homeCity} ${homeName}`.trim() : homeCity;
        const awayTeamRaw = awayName ? `${awayCity} ${awayName}`.trim() : awayCity;
        
        // Enhance team names using our mapping system
        const sport = sportMatch[1];
        const league = leagueMatch[1];
        const homeTeam = getFullTeamName(homeCity, sport, league);
        const awayTeam = getFullTeamName(awayCity, sport, league);
        
        // Check if game is within reasonable timeframe (not older than 7 days for scores)
        const gameTime = new Date(timeMatch[1]);
        const now = new Date();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const gameAge = now.getTime() - gameTime.getTime();
        
        if (gameAge <= sevenDaysMs) {
          console.log(`✅ FINAL SCORE: ${awayTeam} ${awayScoreMatch[1]} - ${homeScoreMatch[1]} ${homeTeam}`);
          
          finalScores.push({
            id: idMatch[1],
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            homeScore: parseInt(homeScoreMatch[1]) || 0,
            awayScore: parseInt(awayScoreMatch[1]) || 0,
            homeInitials: homeInitials,
            awayInitials: awayInitials,
            league: normalizeLeague(league),
            sport: normalizeLeague(sport),
            gameTime: timeMatch[1],
            finalStatus: statusMatch[1],
            winner: determineWinner(parseInt(awayScoreMatch[1]), parseInt(homeScoreMatch[1]), awayTeam, homeTeam),
            margin: Math.abs(parseInt(homeScoreMatch[1]) - parseInt(awayScoreMatch[1])),
            totalPoints: parseInt(homeScoreMatch[1]) + parseInt(awayScoreMatch[1]),
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
        } else {
          console.log(`🚫 EXCLUDING OLD FINAL GAME: ${awayTeam} vs ${homeTeam} (${Math.round(gameAge / (1000 * 60 * 60 * 24))} days old)`);
        }
      }
    });
  } catch (error) {
    console.error('XML parsing error for scores:', error);
    return [];
  }

  console.log(`Returning ${finalScores.length} final scores`);
  return finalScores;
}

// Helper function to normalize league names (reused from odds.js)
// Note: This function is also imported from teamMapping.js, so we'll use the imported version

// Determine winner of the game
function determineWinner(awayScore, homeScore, awayTeam, homeTeam) {
  if (awayScore > homeScore) {
    return {
      team: awayTeam,
      type: 'away',
      score: awayScore
    };
  } else if (homeScore > awayScore) {
    return {
      team: homeTeam,
      type: 'home',
      score: homeScore
    };
  } else {
    return {
      team: 'Tie',
      type: 'tie',
      score: homeScore
    };
  }
}

// Date helper functions
function isToday(gameTime) {
  const today = new Date();
  const gameDate = new Date(gameTime);
  return today.toDateString() === gameDate.toDateString();
}

function isYesterday(gameTime) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const gameDate = new Date(gameTime);
  return yesterday.toDateString() === gameDate.toDateString();
}

function isThisWeek(gameTime) {
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const gameDate = new Date(gameTime);
  return gameDate >= weekAgo && gameDate <= now;
}

// Parse upcoming games from XML data
function parseUpcomingGamesFromXml(gamesXml) {
  const upcomingGames = [];
  
  try {
    const gameMatches = gamesXml.match(/<game[^>]*>([\s\S]*?)<\/game>/g) || [];
    console.log(`🎮 Processing ${gameMatches.length} games for upcoming games...`);
    
    gameMatches.forEach((gameXml, index) => {
      // Extract game metadata
      const idMatch = gameXml.match(/id="([^"]*)"/) || ['', `upcoming_${index}`];
      const sportMatch = gameXml.match(/sport="([^"]*)"/) || ['', 'unknown'];
      const leagueMatch = gameXml.match(/leagueCode="([^"]*)"/) || ['', 'unknown'];
      
      // Extract timing and status
      const dateMatch = gameXml.match(/<date>([^<]*)<\/date>/) || ['', new Date().toISOString()];
      const timeMatch = gameXml.match(/<time>([^<]*)<\/time>/) || dateMatch;
      const statusMatch = gameXml.match(/<timeLeft>([^<]*)<\/timeLeft>/) || ['', 'Unknown'];
      
      // Check if this is an upcoming game (not final, not currently live)
      const isFinalGame = statusMatch[1] && statusMatch[1].toLowerCase().includes('final');
      const isLiveGame = statusMatch[1] && !statusMatch[1].includes('GMT') && statusMatch[1] !== '';
      const isUpcoming = !isFinalGame && !isLiveGame;
      
      if (isUpcoming) {
        // Extract team info for upcoming games
        const homeTeamMatch = gameXml.match(/<team[^>]*homeID[^>]*>.*?<city>([^<]*)<\/city>.*?<name>([^<]*)<\/name>/s);
        const awayTeamMatch = gameXml.match(/<team[^>]*visitorID[^>]*>.*?<city>([^<]*)<\/city>.*?<name>([^<]*)<\/name>/s);
        
        if (homeTeamMatch && awayTeamMatch) {
          const homeCity = homeTeamMatch[1].trim();
          const homeName = homeTeamMatch[2].trim();
          const awayCity = awayTeamMatch[1].trim();
          const awayName = awayTeamMatch[2].trim();
          
          const homeTeamRaw = homeName ? `${homeCity} ${homeName}`.trim() : homeCity;
          const awayTeamRaw = awayName ? `${awayCity} ${awayName}`.trim() : awayCity;
          
          // Enhance team names using our mapping system
          const sport = sportMatch[1];
          const league = leagueMatch[1];
          const homeTeam = getFullTeamName(homeCity, sport, league);
          const awayTeam = getFullTeamName(awayCity, sport, league);
          
          // Check if game is within next 7 days
          const gameTime = new Date(timeMatch[1]);
          const now = new Date();
          const nextWeekMs = 7 * 24 * 60 * 60 * 1000;
          const timeDiff = gameTime.getTime() - now.getTime();
          
          if (timeDiff > 0 && timeDiff <= nextWeekMs) {
            console.log(`✅ UPCOMING GAME: ${awayTeam} @ ${homeTeam} (${gameTime.toLocaleDateString()})`);
            
            upcomingGames.push({
              id: idMatch[1],
              homeTeam,
              awayTeam,
              sport: normalizeLeague(sport),
              league: normalizeLeague(league),
              gameTime: gameTime.toISOString(),
              status: 'Upcoming',
              daysFromNow: Math.round(timeDiff / (1000 * 60 * 60 * 24)),
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
  
  console.log(`Returning ${upcomingGames.length} upcoming games`);
  return upcomingGames.sort((a, b) => new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime());
}
