import fetch from 'node-fetch';

async function testXMLParsing() {
  try {
    const API_KEY = '3e8b23fdd1b6030714b9320484d7367b';
    const BASE_URL = 'https://areyouwatchingthis.com';
    
    console.log('🔍 Testing RUWT XML structure...');
    
    // First, get games to find a game ID
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
    console.log('📊 Games XML (first 1000 chars):', gamesXml.substring(0, 1000));
    
    // Find a game ID
    const gameIdMatch = gamesXml.match(/<game id="([^"]+)"/);
    if (!gameIdMatch) {
      console.log('❌ No game IDs found');
      return;
    }
    
    const gameId = gameIdMatch[1];
    console.log('🎯 Testing odds for game ID:', gameId);
    
    // Test odds API
    const oddsResponse = await fetch(`${BASE_URL}/api/odds?key=${API_KEY}&game_id=${gameId}`, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'SharpShot/1.0'
      }
    });
    
    console.log(`📡 Odds API status: ${oddsResponse.status}`);
    
    if (oddsResponse.ok) {
      const oddsXml = await oddsResponse.text();
      console.log('💰 Odds XML (first 1000 chars):', oddsXml.substring(0, 1000));
      
      // Test our parsing function
      const parsed = parseOddsFromXml(oddsXml);
      console.log('✅ Parsed result:', parsed);
    } else {
      console.log('❌ Odds API failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function parseOddsFromXml(xmlData) {
  const transformed = {
    moneyline: { away: {}, home: {} },
    spread: { away: {}, home: {} },
    total: { over: {}, under: {} },
    providers: []
  };

  try {
    console.log('🔍 Looking for odds tags...');
    
    // Look for different possible XML structures
    const oddsPatterns = [
      /<odds[^>]*>([\s\S]*?)<\/odds>/g,
      /<book[^>]*>([\s\S]*?)<\/book>/g,
      /<provider[^>]*>([\s\S]*?)<\/provider>/g
    ];
    
    let foundOdds = false;
    
    oddsPatterns.forEach((pattern, index) => {
      const matches = xmlData.match(pattern);
      if (matches) {
        console.log(`✅ Found ${matches.length} matches with pattern ${index + 1}:`, matches[0]);
        foundOdds = true;
        
        matches.forEach(oddsBlock => {
          // Extract provider
          const providerMatch = oddsBlock.match(/provider="([^"]+)"/) || 
                               oddsBlock.match(/book="([^"]+)"/) ||
                               oddsBlock.match(/name="([^"]+)"/);
          const provider = providerMatch ? providerMatch[1] : 'Unknown';
          
          if (provider === 'CONSENSUS') {
            return;
          }
          
          transformed.providers.push(provider);
          
          // Extract moneyline odds
          const moneyLine1Match = oddsBlock.match(/moneyLine1="([^"]+)"/);
          const moneyLine2Match = oddsBlock.match(/moneyLine2="([^"]+)"/);
          
          if (moneyLine1Match && moneyLine2Match) {
            const decimal1 = parseFloat(moneyLine1Match[1]);
            const decimal2 = parseFloat(moneyLine2Match[1]);
            
            if (decimal1 > 1 && decimal2 > 1) {
              const awayAmericanOdds = convertEuropeanToAmerican(decimal1);
              const homeAmericanOdds = convertEuropeanToAmerican(decimal2);
              
              transformed.moneyline.away[provider] = awayAmericanOdds;
              transformed.moneyline.home[provider] = homeAmericanOdds;
              
              console.log(`💰 ${provider} odds: ${decimal1}→${awayAmericanOdds}, ${decimal2}→${homeAmericanOdds}`);
            }
          }
        });
      }
    });
    
    if (!foundOdds) {
      console.log('❌ No odds patterns found in XML');
      console.log('🔍 XML structure:', xmlData.substring(0, 500));
    }
    
    transformed.providers = [...new Set(transformed.providers)].sort();
    return transformed;
    
  } catch (error) {
    console.error('❌ Error parsing XML:', error);
    return transformed;
  }
}

function convertEuropeanToAmerican(decimalOdds) {
  if (decimalOdds <= 1) return -110;
  
  if (typeof decimalOdds !== 'number' || !Number.isFinite(decimalOdds)) {
    return -110;
  }
  
  if (decimalOdds > 10) return 900;
  if (decimalOdds < 1.01) return -10000;
  
  let americanOdds;
  if (decimalOdds >= 2) {
    americanOdds = Math.round((decimalOdds - 1) * 100);
  } else {
    americanOdds = Math.round(-100 / (decimalOdds - 1));
  }
  
  if (americanOdds < -10000 || americanOdds > 10000) {
    return -110;
  }
  
  return americanOdds;
}

testXMLParsing();
