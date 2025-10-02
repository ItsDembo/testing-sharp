import { TradingTerminalService } from '../../server/services/tradingTerminalService.js';

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
    
    console.log('🎯 Trading Terminal API called with params:', { sport, minEV, status, primaryBook });

    const tradingService = new TradingTerminalService();
    const opportunities = await tradingService.getTradingTerminalData(sport || 'all');

    console.log(`✅ Trading Terminal API returning ${opportunities.length} opportunities`);

    res.status(200).json({
      success: true,
      events: opportunities,
      count: opportunities.length,
      filters: { 
        sport: sport || 'all', 
        minEV: parseFloat(minEV) || 0, 
        status: status || 'all',
        primaryBook: primaryBook
      },
      lastUpdated: new Date().toISOString(),
      serverTime: Date.now(),
      refreshInterval: 15000
    });

  } catch (error) {
    console.error('❌ Trading Terminal API error:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}