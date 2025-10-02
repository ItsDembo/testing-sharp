import { Router } from 'express';
import { aywtFetcher } from '../aywt/fetchAywt';
import { parseAywtData, applyFreshnessFilters } from '../aywt/parseAywt';
import { calcUiRow } from '../../shared/market/calc';
import { UiRow } from '../../shared/market/types';

const router = Router();

export interface TradingTerminalResponse {
  rows: UiRow[];
  meta: { 
    ts: string; 
    scope: string; 
    myBook: string;
    totalRows: number;
    liveRows: number;
    upcomingRows: number;
  };
}

// Main Trading Terminal endpoint
router.get('/api/trading-terminal', async (req, res) => {
  try {
    const { myBook = 'fanduel', scope = 'all' } = req.query;
    
    // Validate query parameters
    if (!['live', 'upcoming', 'all'].includes(scope as string)) {
      return res.status(400).json({ 
        error: 'Invalid scope. Must be one of: live, upcoming, all' 
      });
    }

    console.log(`🎯 Trading Terminal request: myBook=${myBook}, scope=${scope}`);

    // Fetch data from AYWT
    let oddsResponse, eventsResponse;
    
    try {
      [oddsResponse, eventsResponse] = await Promise.all([
        aywtFetcher.fetchOdds(),
        aywtFetcher.fetchEvents()
      ]);
    } catch (fetchError) {
      console.error('Error fetching AYWT data:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to fetch live data',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      });
    }

    // Parse the fetched data
    let normalizedProps = [];
    
    if (oddsResponse.success && oddsResponse.data) {
      const oddsProps = parseAywtData(oddsResponse.data);
      normalizedProps.push(...oddsProps);
    }
    
    if (eventsResponse.success && eventsResponse.data) {
      const eventProps = parseAywtData(eventsResponse.data);
      normalizedProps.push(...eventProps);
    }

    if (normalizedProps.length === 0) {
      console.log('No data available from AYWT, returning empty response');
      return res.json({
        rows: [],
        meta: {
          ts: new Date().toISOString(),
          scope: scope as string,
          myBook: myBook as string,
          totalRows: 0,
          liveRows: 0,
          upcomingRows: 0
        }
      });
    }

    console.log(`📊 Parsed ${normalizedProps.length} normalized props from AYWT`);

    // Apply freshness filters
    const maxAgeSeconds = {
      live: 60,      // Live games: drop quotes older than 60s
      upcoming: 300  // Upcoming games: drop quotes older than 5m
    };

    const filteredProps = applyFreshnessFilters(
      normalizedProps, 
      scope as 'live' | 'upcoming' | 'all', 
      maxAgeSeconds
    );

    console.log(`🔍 After freshness filtering: ${filteredProps.length} props remain`);

    // Set myBook for all props
    filteredProps.forEach(prop => {
      prop.myBook = myBook as string;
    });

    // Convert to UI rows using the new EV calculation logic
    const uiRows: UiRow[] = [];
    
    for (const prop of filteredProps) {
      try {
        const uiRow = calcUiRow(prop);
        uiRows.push(uiRow);
      } catch (calcError) {
        console.error('Error calculating UI row for prop:', prop.eventId, calcError);
        // Continue with other props instead of failing completely
      }
    }

    console.log(`✅ Generated ${uiRows.length} UI rows with EV calculations`);

    // Count rows by status
    const liveRows = uiRows.filter(row => row.status === 'live').length;
    const upcomingRows = uiRows.filter(row => row.status === 'upcoming').length;

    const response: TradingTerminalResponse = {
      rows: uiRows,
      meta: {
        ts: new Date().toISOString(),
        scope: scope as string,
        myBook: myBook as string,
        totalRows: uiRows.length,
        liveRows,
        upcomingRows
      }
    };

    console.log(`🚀 Trading Terminal response ready: ${uiRows.length} rows, ${liveRows} live, ${upcomingRows} upcoming`);

    res.json(response);

  } catch (error) {
    console.error('❌ Trading Terminal error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
router.get('/api/trading-terminal/health', async (req, res) => {
  try {
    const isHealthy = await aywtFetcher.healthCheck();
    
    if (isHealthy) {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Trading Terminal API',
        dataSource: 'AYWT'
      });
    } else {
      res.status(503).json({ 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        service: 'Trading Terminal API',
        dataSource: 'AYWT',
        error: 'AYWT service unavailable'
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      timestamp: new Date().toISOString(),
      service: 'Trading Terminal API',
      dataSource: 'AYWT',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Configuration endpoint
router.get('/api/trading-terminal/config', (req, res) => {
  res.json({
    supportedScopes: ['live', 'upcoming', 'all'],
    supportedBooks: [
      'fanduel', 'draftkings', 'betmgm', 'caesars', 'espnbet',
      'bet365', 'unibet', 'williamhill', 'bovada', 'betonline'
    ],
    freshnessSettings: {
      live: '60 seconds',
      upcoming: '5 minutes'
    },
    features: [
      'Real-time EV calculations',
      'Vig-free consensus probabilities',
      'Freshness tracking',
      'Live status detection'
    ]
  });
});

export default router;
