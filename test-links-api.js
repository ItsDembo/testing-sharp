// Test script to verify Links API parsing
import fetch from 'node-fetch';

async function testLinksAPI() {
  try {
    console.log('🧪 Testing Links API parsing...');
    
    const now = Date.now();
    const startDate = now;
    const endDate = now + (7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    const url = new URL('https://sharpshot.api.areyouwatchingthis.com/api/links.json');
    url.searchParams.append('apiKey', '3e8b23fdd1b6030714b9320484d7367b');
    url.searchParams.append('startDate', startDate.toString());
    url.searchParams.append('endDate', endDate.toString());
    
    console.log(`🔗 Fetching: ${url.toString()}`);
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`📊 Results count: ${data.results ? data.results.length : 'undefined'}`);
    
    if (data.results && data.results.length > 0) {
      // Test parsing first 3 games
      const testGames = data.results.slice(0, 3);
      
      testGames.forEach((link, index) => {
        console.log(`\n🔍 Game ${index + 1} (ID: ${link.gameID}):`);
        console.log(`  Headline: ${link.headline}`);
        
        if (link.links && Array.isArray(link.links)) {
          const siriusLinks = link.links.filter(l => l.source === 'SIRIUSXM' && l.team);
          console.log(`  SiriusXM links: ${siriusLinks.length}`);
          
          siriusLinks.forEach(link => {
            console.log(`    ${link.team}: ${link.url}`);
          });
          
          if (siriusLinks.length >= 2) {
            const awayLink = siriusLinks.find(l => l.team === 'away');
            const homeLink = siriusLinks.find(l => l.team === 'home');
            
            if (awayLink && homeLink) {
              // Extract team names from URLs
              const awayMatch = awayLink.url.match(/\/([^\/]+)-([^\/]+)$/);
              const homeMatch = homeLink.url.match(/\/([^\/]+)-([^\/]+)$/);
              
              if (awayMatch && homeMatch) {
                const team1Name = awayMatch[2].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const team2Name = homeMatch[2].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                console.log(`  ✅ Parsed teams: ${team1Name} vs ${team2Name}`);
                
                // Determine league
                let leagueCode = 'UNKNOWN';
                if (awayLink.url.includes('/mlb/') || homeLink.url.includes('/mlb/')) leagueCode = 'BBM';
                else if (awayLink.url.includes('/nfl/') || homeLink.url.includes('/nfl/')) leagueCode = 'FBP';
                else if (awayLink.url.includes('/nba/') || homeLink.url.includes('/nba/')) leagueCode = 'BKP';
                else if (awayLink.url.includes('/nhl/') || homeLink.url.includes('/nhl/')) leagueCode = 'HCP';
                
                console.log(`  ✅ League: ${leagueCode}`);
              }
            }
          }
        }
      });
    }
    
    console.log('\n✅ Links API test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing Links API:', error);
  }
}

testLinksAPI();
