export interface LiveGameValidation {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  isActuallyLive: boolean;
  actualStatus: string;
  lastVerified: Date;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
  discrepancies: string[];
  score?: {
    home: number;
    away: number;
    period?: string;
    timeRemaining?: string;
  };
}

export interface ValidationResult {
  success: boolean;
  validatedGames: LiveGameValidation[];
  errors: string[];
  summary: {
    total: number;
    actuallyLive: number;
    discrepancies: number;
    lastUpdate: Date;
  };
  metadata?: {
    timestamp: string;
    validationDuration: string;
    sources: string[];
    cacheStats: {
      size: number;
      ttl: number;
    };
    rateLimit: string;
  };
}

export interface GameToValidate {
  id: string;
  home: string;
  away: string;
  sport: string;
  league: string;
  status: string;
  startTime: string;
  awayScore?: number;
  homeScore?: number;
}

/**
 * Live Game Validation Service
 * Cross-references game statuses with external sources to ensure accuracy
 */
export class LiveGameValidationService {
  private static instance: LiveGameValidationService;
  private validationCache: Map<string, LiveGameValidation> = new Map();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  private isValidationInProgress = false;

  private constructor() {}

  public static getInstance(): LiveGameValidationService {
    if (!LiveGameValidationService.instance) {
      LiveGameValidationService.instance = new LiveGameValidationService();
    }
    return LiveGameValidationService.instance;
  }

  /**
   * Validate multiple games for live status accuracy
   */
  public async validateGames(games: GameToValidate[]): Promise<ValidationResult> {
    try {
      if (this.isValidationInProgress) {
        console.log('🔄 Live game validation already in progress, skipping...');
        return this.getCachedResults(games);
      }

      this.isValidationInProgress = true;
      console.log(`🔍 Validating ${games.length} games for live status accuracy...`);

      // Check cache first for games that don't need re-validation
      const gamesToValidate: GameToValidate[] = [];
      const cachedResults: LiveGameValidation[] = [];

      games.forEach(game => {
        const cacheKey = `${game.id}-${game.status}`;
        const cached = this.validationCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.lastVerified.getTime()) < this.CACHE_TTL) {
          cachedResults.push(cached);
        } else {
          gamesToValidate.push(game);
        }
      });

      if (gamesToValidate.length === 0) {
        console.log('✅ All games validated from cache');
        this.isValidationInProgress = false;
        return {
          success: true,
          validatedGames: cachedResults,
          errors: [],
          summary: {
            total: games.length,
            actuallyLive: cachedResults.filter(g => g.isActuallyLive).length,
            discrepancies: cachedResults.filter(g => g.discrepancies.length > 0).length,
            lastUpdate: new Date()
          }
        };
      }

      // Validate games that need fresh validation
      const response = await fetch('/api/live-games/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ games: gamesToValidate })
      });

      if (!response.ok) {
        throw new Error(`Validation API error: ${response.status} ${response.statusText}`);
      }

      const result: ValidationResult = await response.json();

      // Cache the new validation results
      result.validatedGames.forEach(validation => {
        const cacheKey = `${validation.gameId}-${validation.actualStatus}`;
        this.validationCache.set(cacheKey, validation);
      });

      // Combine cached and fresh results
      const allValidatedGames = [...cachedResults, ...result.validatedGames];

      // Clean up cache if it gets too large
      if (this.validationCache.size > 100) {
        this.cleanupCache();
      }

      const finalResult: ValidationResult = {
        success: true,
        validatedGames: allValidatedGames,
        errors: result.errors,
        summary: {
          total: games.length,
          actuallyLive: allValidatedGames.filter(g => g.isActuallyLive).length,
          discrepancies: allValidatedGames.filter(g => g.discrepancies.length > 0).length,
          lastUpdate: new Date()
        },
        metadata: result.metadata
      };

      console.log(`✅ Live game validation completed: ${finalResult.summary.actuallyLive}/${finalResult.summary.total} actually live, ${finalResult.summary.discrepancies} discrepancies`);
      
      this.isValidationInProgress = false;
      return finalResult;
    } catch (error) {
      console.error('❌ Live game validation failed:', error);
      this.isValidationInProgress = false;
      
      // Return cached results as fallback
      return this.getCachedResults(games);
    }
  }

  /**
   * Validate a single game
   */
  public async validateSingleGame(game: GameToValidate): Promise<LiveGameValidation | null> {
    try {
      const result = await this.validateGames([game]);
      return result.validatedGames[0] || null;
    } catch (error) {
      console.error('❌ Single game validation failed:', error);
      return null;
    }
  }

  /**
   * Get validation status for a specific game
   */
  public getGameValidation(gameId: string, status: string): LiveGameValidation | null {
    const cacheKey = `${gameId}-${status}`;
    const cached = this.validationCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.lastVerified.getTime()) < this.CACHE_TTL) {
      return cached;
    }
    
    return null;
  }

  /**
   * Check if a game is actually live based on validation
   */
  public isGameActuallyLive(gameId: string, status: string): boolean {
    const validation = this.getGameValidation(gameId, status);
    return validation?.isActuallyLive || false;
  }

  /**
   * Get confidence level for a game's status
   */
  public getGameConfidence(gameId: string, status: string): 'high' | 'medium' | 'low' {
    const validation = this.getGameValidation(gameId, status);
    return validation?.confidence || 'low';
  }

  /**
   * Get discrepancies for a game
   */
  public getGameDiscrepancies(gameId: string, status: string): string[] {
    const validation = this.getGameValidation(gameId, status);
    return validation?.discrepancies || [];
  }

  /**
   * Get validation service status
   */
  public async getServiceStatus(): Promise<any> {
    try {
      const response = await fetch('/api/live-games/status');
      if (!response.ok) {
        throw new Error(`Status API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get validation service status:', error);
      return null;
    }
  }

  /**
   * Clear validation cache
   */
  public async clearCache(): Promise<boolean> {
    try {
      const response = await fetch('/api/live-games/cache/clear', {
        method: 'POST'
      });
      
      if (response.ok) {
        this.validationCache.clear();
        console.log('✅ Live game validation cache cleared');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to clear validation cache:', error);
      return false;
    }
  }

  /**
   * Get cached results for games
   */
  private getCachedResults(games: GameToValidate[]): ValidationResult {
    const cachedResults: LiveGameValidation[] = [];
    
    games.forEach(game => {
      const cacheKey = `${game.id}-${game.status}`;
      const cached = this.validationCache.get(cacheKey);
      if (cached) {
        cachedResults.push(cached);
      }
    });

    return {
      success: true,
      validatedGames: cachedResults,
      errors: [],
      summary: {
        total: games.length,
        actuallyLive: cachedResults.filter(g => g.isActuallyLive).length,
        discrepancies: cachedResults.filter(g => g.discrepancies.length > 0).length,
        lastUpdate: new Date()
      }
    };
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.validationCache.forEach((validation, key) => {
      if ((now - validation.lastVerified.getTime()) > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.validationCache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; ttl: number } {
    return {
      size: this.validationCache.size,
      ttl: this.CACHE_TTL
    };
  }
}

// Export singleton instance
export const liveGameValidationService = LiveGameValidationService.getInstance();

// Export utility functions for easy use
export const validateLiveGames = (games: GameToValidate[]) => liveGameValidationService.validateGames(games);
export const validateSingleGame = (game: GameToValidate) => liveGameValidationService.validateSingleGame(game);
export const isGameActuallyLive = (gameId: string, status: string) => liveGameValidationService.isGameActuallyLive(gameId, status);
export const getGameConfidence = (gameId: string, status: string) => liveGameValidationService.getGameConfidence(gameId, status);
export const getGameDiscrepancies = (gameId: string, status: string) => liveGameValidationService.getGameDiscrepancies(gameId, status);
