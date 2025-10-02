import { Router } from 'express';
import LiveGameValidator, { ValidationResult } from '../liveGameValidator';

const router = Router();

/**
 * POST /api/live-games/validate
 * Validate live games by cross-referencing with external sources
 */
router.post('/validate', async (req, res) => {
  try {
    const { games } = req.body;

    if (!games || !Array.isArray(games)) {
      return res.status(400).json({
        error: 'Invalid request: games array is required',
        example: {
          games: [
            {
              id: 'game-123',
              home: 'Lakers',
              away: 'Warriors',
              sport: 'basketball',
              league: 'NBA',
              status: 'live',
              startTime: '2024-01-15T19:00:00Z',
              awayScore: 45,
              homeScore: 42
            }
          ]
        }
      });
    }

    console.log(`🔍 Validating ${games.length} games for live status...`);

    // Validate each game has required fields
    const invalidGames = games.filter(game => 
      !game.id || !game.home || !game.away || !game.sport || !game.league || !game.status
    );

    if (invalidGames.length > 0) {
      return res.status(400).json({
        error: 'Some games are missing required fields',
        invalidGames: invalidGames.map(g => ({ id: g.id, missing: [] }))
      });
    }

    // Get validator instance and validate games
    const validator = LiveGameValidator.getInstance();
    const result: ValidationResult = await validator.validateLiveGames(games);

    // Add metadata to response
    const response = {
      ...result,
      metadata: {
        timestamp: new Date().toISOString(),
        validationDuration: '~2-5 seconds per game',
        sources: ['Google Search', 'ESPN API', 'Sports Reference'],
        cacheStats: validator.getCacheStats(),
        rateLimit: '1 second delay between requests to avoid API limits'
      }
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Live game validation endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error during live game validation',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/live-games/validate/:gameId
 * Validate a single game by ID
 */
router.get('/validate/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { home, away, sport, league, status, startTime, awayScore, homeScore } = req.query;

    if (!home || !away || !sport || !league || !status || !startTime) {
      return res.status(400).json({
        error: 'Missing required query parameters',
        required: ['home', 'away', 'sport', 'league', 'status', 'startTime'],
        optional: ['awayScore', 'homeScore']
      });
    }

    const game = {
      id: gameId,
      home: home as string,
      away: away as string,
      sport: sport as string,
      league: league as string,
      status: status as string,
      startTime: startTime as string,
      awayScore: awayScore ? parseInt(awayScore as string) : undefined,
      homeScore: homeScore ? parseInt(homeScore as string) : undefined
    };

    console.log(`🔍 Validating single game: ${game.away} vs ${game.home}`);

    const validator = LiveGameValidator.getInstance();
    const result = await validator.validateLiveGames([game]);

    if (result.validatedGames.length === 0) {
      return res.status(404).json({
        error: 'Game validation failed',
        gameId,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      game: result.validatedGames[0],
      metadata: {
        timestamp: new Date().toISOString(),
        cacheStats: validator.getCacheStats()
      }
    });
  } catch (error) {
    console.error('❌ Single game validation error:', error);
    res.status(500).json({
      error: 'Internal server error during single game validation',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/live-games/status
 * Get validation service status and cache information
 */
router.get('/status', async (req, res) => {
  try {
    const validator = LiveGameValidator.getInstance();
    const cacheStats = validator.getCacheStats();

    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      cache: {
        ...cacheStats,
        ttlFormatted: `${Math.round(cacheStats.ttl / 1000)} seconds`
      },
      features: {
        googleValidation: true,
        espnValidation: true,
        sportsReferenceValidation: false, // Disabled for legal reasons
        rateLimiting: true,
        caching: true,
        parallelProcessing: true
      },
      endpoints: {
        validateMultiple: 'POST /api/live-games/validate',
        validateSingle: 'GET /api/live-games/validate/:gameId',
        status: 'GET /api/live-games/status',
        clearCache: 'POST /api/live-games/cache/clear'
      }
    });
  } catch (error) {
    console.error('❌ Status endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error getting status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/live-games/cache/clear
 * Clear the validation cache
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const validator = LiveGameValidator.getInstance();
    validator.clearCache();

    res.json({
      message: 'Validation cache cleared successfully',
      timestamp: new Date().toISOString(),
      cacheStats: validator.getCacheStats()
    });
  } catch (error) {
    console.error('❌ Cache clear error:', error);
    res.status(500).json({
      error: 'Internal server error clearing cache',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/live-games/sample
 * Get sample validation data for testing
 */
router.get('/sample', async (req, res) => {
  try {
    const sampleGames = [
      {
        id: 'sample-nba-1',
        home: 'Lakers',
        away: 'Warriors',
        sport: 'basketball',
        league: 'NBA',
        status: 'live',
        startTime: new Date().toISOString(),
        awayScore: 45,
        homeScore: 42
      },
      {
        id: 'sample-nfl-1',
        home: 'Chiefs',
        away: 'Ravens',
        sport: 'football',
        league: 'NFL',
        status: 'scheduled',
        startTime: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      }
    ];

    res.json({
      message: 'Sample games for testing validation',
      games: sampleGames,
      usage: {
        validateMultiple: `POST /api/live-games/validate with body: { "games": ${JSON.stringify(sampleGames)} }`,
        validateSingle: `GET /api/live-games/validate/sample-nba-1?home=Lakers&away=Warriors&sport=basketball&league=NBA&status=live&startTime=${encodeURIComponent(new Date().toISOString())}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Sample endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error getting sample data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
