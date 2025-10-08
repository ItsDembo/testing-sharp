// Self-contained API function for Vercel deployment - COMPREHENSIVE VERSION
const API_BASE_URL = 'https://sharpshot.api.areyouwatchingthis.com/api';
const API_KEY = '3e8b23fdd1b6030714b9320484d7367b';

// Utility functions
function americanToDecimal(american) {
  if (american > 0) {
    return (american / 100) + 1;
  } else {
    return (100 / Math.abs(american)) + 1;
  }
}

function calculateImpliedProbability(decimal) {
  return 1 / decimal;
}

function calculateWinProbability(odds) {
  const decimal = americanToDecimal(odds);
  return calculateImpliedProbability(decimal) * 100;
}

// Enhanced EV calculation with devigging for single-sided bets
function calculateEVFromFieldOdds(fieldOdds) {
  if (!fieldOdds || fieldOdds.length === 0) {
    return 0;
  }

  // Find best odds
  let bestOdds = -Infinity;
  fieldOdds.forEach(odd => {
    const americanOdds = odd.american || odd.odds;
    if (americanOdds && Number.isFinite(americanOdds)) {
      if (americanOdds > bestOdds) {
        bestOdds = americanOdds;
      }
    }
  });

  if (bestOdds === -Infinity) return 0;

  // Calculate implied probabilities and apply devigging
  const impliedProbs = fieldOdds
    .filter(o => (o.american || o.odds) && Number.isFinite(o.american || o.odds))
    .map(o => {
      const american = o.american || o.odds;
      return american > 0 ? 100 / (american + 100) : Math.abs(american) / (Math.abs(american) + 100);
    });

  if (impliedProbs.length === 0) return 0;

  let fairProb = impliedProbs.reduce((sum, p) => sum + p, 0) / impliedProbs.length;

  // Apply conservative devigging for single-sided bets
  if (fairProb > 0.6) {
    fairProb = fairProb * 0.92; // Reduce by ~8%
  } else if (fairProb > 0.4) {
    fairProb = fairProb * 0.95; // Reduce by ~5%
  } else {
    fairProb = fairProb * 0.97; // Reduce by ~3%
  }

  // Calculate EV using fair probability
  const decimal = americanToDecimal(bestOdds);
  const profitIfWin = 100 * (decimal - 1);
  const evDollars = (fairProb * profitIfWin) - ((1 - fairProb) * 100);
  const evPercent = (evDollars / 100) * 100;

  return Math.round(evPercent * 10) / 10;
}

// Sportsbook name mapping
function mapProviderToSportsbook(provider) {
  const mapping = {
    'fanduel': 'FanDuel',
    'draftkings': 'DraftKings',
    'betmgm': 'BetMGM',
    'caesars': 'Caesars',
    'pointsbet': 'PointsBet',
    'betrivers': 'BetRivers',
    'hardrock': 'Hard Rock',
    'espnbet': 'ESPN BET',
    'fanatics': 'Fanatics',
    'unibet': 'Unibet',
    'williamhill': 'William Hill',
    'bet365': 'Bet365',
    'bovada': 'Bovada',
    'betonline': 'BetOnline'
  };

  const normalized = provider.toLowerCase().replace(/[^a-z0-9]/g, '');
  return mapping[normalized] || provider;
}

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
    const { sport } = req.query;

    console.log('🚀 [TRADING TERMINAL API] Request received:', { sport });

    // Fetch comprehensive data using the same logic as local server
    const allEvents = [];

    // 1. Fetch main markets from headlines endpoint
    console.log('📡 Fetching headlines data...');
    const headlinesUrl = new URL(`${API_BASE_URL}/headlines.json`);
    headlinesUrl.searchParams.append('apiKey', API_KEY);

    const headlinesResponse = await fetch(headlinesUrl.toString());
    if (headlinesResponse.ok) {
      const headlinesData = await headlinesResponse.json();
      console.log(`✅ Headlines fetched: ${headlinesData.results?.length || 0} games`);

      if (headlinesData.results && Array.isArray(headlinesData.results)) {
        // Process each game to get odds
        for (const game of headlinesData.results.slice(0, 10)) { // Limit to prevent timeout
          try {
            const gameId = game.gameID || game.id;
            if (!gameId) continue;

            // Fetch odds for this game
            const oddsUrl = new URL(`${API_BASE_URL}/odds/${gameId}.json`);
            oddsUrl.searchParams.append('apiKey', API_KEY);

            const oddsResponse = await fetch(oddsUrl.toString());
            if (oddsResponse.ok) {
              const oddsData = await oddsResponse.json();

              if (oddsData.results && Array.isArray(oddsData.results)) {
                // Process main markets (moneyline, spread, total)
                oddsData.results.forEach(market => {
                  if (market.books && Array.isArray(market.books)) {
                    // Create opportunities for each side
                    ['home', 'away'].forEach(side => {
                      const sideData = market[side];
                      if (sideData && sideData.price) {
                        const fieldOdds = market.books.map(book => ({
                          book: mapProviderToSportsbook(book.name || book.provider || 'Unknown'),
                          american: book[side]?.price || sideData.price,
                          odds: book[side]?.price || sideData.price,
                          url: `https://go.metabet.io/bet/${gameId}/${book.name}`
                        })).filter(book => book.american && Number.isFinite(book.american));

                        if (fieldOdds.length > 0) {
                          const bestOdds = Math.max(...fieldOdds.map(f => f.american));
                          const winProb = calculateWinProbability(bestOdds);
                          const evPercent = calculateEVFromFieldOdds(fieldOdds);

                          allEvents.push({
                            id: `${gameId}-${market.type}-${side}`,
                            event: `${game.away || 'Team A'} vs ${game.home || 'Team B'}`,
                            league: game.league || 'Unknown',
                            prop: `${side === 'home' ? (game.home || 'Home') : (game.away || 'Away')} ${market.type}`,
                            market: market.type === 'moneyline' ? 'Moneyline' : market.type === 'spread' ? 'Spread' : 'Total',
                            myOdds: bestOdds,
                            myOddsEuropean: americanToDecimal(bestOdds),
                            winProbability: Math.round(winProb * 10) / 10,
                            evPercentage: evPercent,
                            fieldOdds: fieldOdds,
                            gameTime: game.time || new Date().toISOString(),
                            isLive: game.status === 'live',
                            gameStatus: game.status === 'live' ? 'live' : 'upcoming'
                          });
                        }
                      }
                    });
                  }
                });
              }
            }
          } catch (gameError) {
            console.log(`⚠️ Error processing game ${game.gameID}:`, gameError.message);
          }
        }
      }
    }

    console.log(`✅ [TRADING TERMINAL API] Returning ${allEvents.length} events`);

    if (allEvents.length === 0) {
      console.log('⚠️ No events found in API response');
      return res.status(200).json({
        success: true,
        events: [],
        count: 0,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      events: allEvents,
      count: allEvents.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [TRADING TERMINAL API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch trading terminal data',
      timestamp: new Date().toISOString()
    });
  }
}
