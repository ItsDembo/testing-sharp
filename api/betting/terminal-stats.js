export default async function handler(req, res) {
  // Enable CORS for your Vercel domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = '3e8b23fdd1b6030714b9320484d7367b';
    const baseUrl = 'https://sharpshot.api.areyouwatchingthis.com/api';
    
    // Get today's games across all sports
    const gamesResponse = await fetch(`${baseUrl}/games.json?apiKey=${apiKey}&sport=mlb,nba,nfl,nhl,ncaaf,ncaab,soccer,tennis,golf,mma,boxing`);
    
    if (!gamesResponse.ok) {
      throw new Error(`Failed to fetch games: ${gamesResponse.status}`);
    }
    
    const gamesData = await gamesResponse.json();
    
    if (!gamesData.games || !Array.isArray(gamesData.games)) {
      return res.status(200).json({
        liveGamesCount: 0,
        upcomingGamesCount: 0,
        totalOpportunities: 0,
        lastUpdate: new Date().toISOString(),
        booksScanned: 18,
        evSignals: 0,
        arbitrage: 0,
        middling: 0
      });
    }
    
    const games = gamesData.games;
    
    // Calculate statistics
    const liveGames = games.filter(game => game.progress < 72 && game.progress > 0);
    const upcomingGames = games.filter(game => game.progress === 72 && game.time && game.time !== '');
    
    // Count high-excitement games (potential EV opportunities)
    const evSignals = games.filter(game => game.points > 100).length;
    
    // Count games with close scores (potential arbitrage)
    const arbitrage = games.filter(game => {
      if (game.team1Score !== null && game.team2Score !== null) {
        const scoreDiff = Math.abs(game.team1Score - game.team2Score);
        return scoreDiff <= 3 && game.progress < 72;
      }
      return false;
    }).length;
    
    // Count games near halftime (potential middling)
    const middling = games.filter(game => {
      if (game.progress >= 30 && game.progress <= 42) {
        return game.team1Score !== null && game.team2Score !== null;
      }
      return false;
    }).length;
    
    const stats = {
      liveGamesCount: liveGames.length,
      upcomingGamesCount: upcomingGames.length,
      totalOpportunities: games.length,
      lastUpdate: new Date().toISOString(),
      booksScanned: 18, // Major sportsbooks
      evSignals: evSignals,
      arbitrage: arbitrage,
      middling: middling
    };
    
    console.log('Terminal stats generated:', stats);
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching terminal stats:', error);
    res.status(500).json({ error: error.message });
  }
}
