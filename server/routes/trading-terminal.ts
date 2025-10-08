import { Router, Request, Response } from 'express';
import { TradingTerminalService } from '../services/tradingTerminalService';

const router = Router();
const tradingTerminalService = new TradingTerminalService();

const getTradingTerminalData = async (req: Request, res: Response) => {
  try {
    const { sport } = req.query;
    
    console.log('🚀 [TRADING TERMINAL API] Request received:', { sport });
    
    const events = await tradingTerminalService.getTradingTerminalData(sport as string);
    
    console.log(`✅ [TRADING TERMINAL API] Returning ${events.length} events`);
    
    res.json({
      success: true,
      events,
      timestamp: new Date().toISOString(),
      count: events.length
    });
  } catch (error: any) {
    console.error('❌ [TRADING TERMINAL API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch trading terminal data'
    });
  }
};

const getTradingTerminalStats = async (req: Request, res: Response) => {
  try {
    const { sport } = req.query;
    
    console.log('📊 [TRADING TERMINAL STATS] Request received:', { sport });
    
    const events = await tradingTerminalService.getTradingTerminalData(sport as string);
    
    // Calculate stats
    const stats = {
      totalEvents: events.length,
      liveEvents: events.filter(e => e.gameStatus === 'live').length,
      upcomingEvents: events.filter(e => e.gameStatus === 'upcoming').length,
      finalEvents: events.filter(e => e.gameStatus === 'final').length,
      positiveEVEvents: events.filter(e => e.evPercentage > 0).length,
      leagues: Array.from(new Set(events.map(e => e.league))),
      markets: Array.from(new Set(events.map(e => e.market))),
      avgEV: events.length > 0 ? 
        Math.round(events.reduce((sum, e) => sum + e.evPercentage, 0) / events.length * 10) / 10 : 0,
      maxEV: events.length > 0 ? 
        Math.round(Math.max(...events.map(e => e.evPercentage)) * 10) / 10 : 0
    };
    
    console.log(`✅ [TRADING TERMINAL STATS] Returning stats:`, stats);
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [TRADING TERMINAL STATS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch trading terminal stats'
    });
  }
};

// Set up router routes
router.get('/data', getTradingTerminalData);
router.get('/stats', getTradingTerminalStats);

export default router;
