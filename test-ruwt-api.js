import fetch from 'node-fetch';

async function testRUWTAPI() {
  try {
    const API_KEY = '3e8b23fdd1b6030714b9320484d7367b';
    const BASE_URL = 'https://areyouwatchingthis.com';
    
    console.log('🔍 Testing RUWT API...');
    
    // First, let's get the games list (XML)
    const gamesResponse = await fetch(`${BASE_URL}/api/games?key=${API_KEY}`, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'SharpShot/1.0'
      }
    });
    
    if (!gamesResponse.ok) {
      throw new Error(`Games API error: ${gamesResponse.status}`);
    }
    
    const gamesXml = await gamesResponse.text();
    console.log('📊 Games API response (XML):', gamesXml.substring(0, 500) + '...');
    
    // Parse XML to find game IDs
    const gameIdMatch = gamesXml.match(/<game id="([^"]+)"/);
    if (gameIdMatch) {
      const gameId = gameIdMatch[1];
      console.log('🎯 Found game ID:', gameId);
      
      // Test the odds API for this game
      const oddsResponse = await fetch(`${BASE_URL}/api/odds?key=${API_KEY}&game_id=${gameId}`, {
        headers: {
          'Accept': 'application/xml',
          'User-Agent': 'SharpShot/1.0'
        }
      });
      
      if (!oddsResponse.ok) {
        throw new Error(`Odds API error: ${oddsResponse.status}`);
      }
      
      const oddsXml = await oddsResponse.text();
      console.log('💰 Odds API response (XML):', oddsXml.substring(0, 500) + '...');
    } else {
      console.log('❌ No game IDs found in XML response');
    }
    
  } catch (error) {
    console.error('❌ Error testing RUWT API:', error.message);
  }
}

testRUWTAPI();
