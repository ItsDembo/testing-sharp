import axios from 'axios';
import { EventEmitter } from 'events';

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
}

export class LiveGameValidator extends EventEmitter {
  private static instance: LiveGameValidator;
  private validationCache: Map<string, LiveGameValidation> = new Map();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  private readonly GOOGLE_SEARCH_DELAY = 1000; // 1 second between requests to avoid rate limiting

  private constructor() {
    super();
  }

  public static getInstance(): LiveGameValidator {
    if (!LiveGameValidator.instance) {
      LiveGameValidator.instance = new LiveGameValidator();
    }
    return LiveGameValidator.instance;
  }

  /**
   * Validate live games by cross-referencing with multiple sources
   */
  public async validateLiveGames(games: Array<{
    id: string;
    home: string;
    away: string;
    sport: string;
    league: string;
    status: string;
    startTime: string;
    awayScore?: number;
    homeScore?: number;
  }>): Promise<ValidationResult> {
    const validatedGames: LiveGameValidation[] = [];
    const errors: string[] = [];
    let actuallyLive = 0;
    let discrepancies = 0;

    try {
      console.log(`🔍 Starting live game validation for ${games.length} games...`);
      
      // Process games in parallel with rate limiting
      const validationPromises = games.map(async (game, index) => {
        // Add delay to avoid overwhelming external APIs
        await this.delay(index * this.GOOGLE_SEARCH_DELAY);
        
        try {
          const validation = await this.validateSingleGame(game);
          validatedGames.push(validation);
          
          if (validation.isActuallyLive) {
            actuallyLive++;
          }
          
          if (validation.discrepancies.length > 0) {
            discrepancies++;
          }
          
          return validation;
        } catch (error) {
          const errorMsg = `Failed to validate game ${game.home} vs ${game.away}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
          
          // Return fallback validation
          return this.createFallbackValidation(game);
        }
      });

      await Promise.all(validationPromises);

      const result: ValidationResult = {
        success: true,
        validatedGames,
        errors,
        summary: {
          total: games.length,
          actuallyLive,
          discrepancies,
          lastUpdate: new Date()
        }
      };

      console.log(`✅ Live game validation completed: ${actuallyLive}/${games.length} actually live, ${discrepancies} discrepancies`);
      this.emit('validationComplete', result);
      
      return result;
    } catch (error) {
      console.error('❌ Live game validation failed:', error);
      return {
        success: false,
        validatedGames: [],
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        summary: {
          total: games.length,
          actuallyLive: 0,
          discrepancies: 0,
          lastUpdate: new Date()
        }
      };
    }
  }

  /**
   * Validate a single game using multiple sources
   */
  private async validateSingleGame(game: {
    id: string;
    home: string;
    away: string;
    sport: string;
    league: string;
    status: string;
    startTime: string;
    awayScore?: number;
    homeScore?: number;
  }): Promise<LiveGameValidation> {
    const cacheKey = `${game.id}-${game.status}`;
    const cached = this.validationCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.lastVerified.getTime()) < this.CACHE_TTL) {
      return cached;
    }

    const sources: string[] = [];
    const discrepancies: string[] = [];
    let isActuallyLive = false;
    let actualStatus = game.status;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let score: LiveGameValidation['score'] | undefined;

    try {
      // Source 1: Google Search for live game status
      const googleValidation = await this.validateWithGoogle(game);
      sources.push('Google');
      
      if (googleValidation.isLive) {
        isActuallyLive = true;
        confidence = 'high';
        if (googleValidation.score) {
          score = googleValidation.score;
        }
      }

      // Source 2: ESPN API (if available)
      try {
        const espnValidation = await this.validateWithESPN(game);
        sources.push('ESPN');
        
        if (espnValidation.isLive && !isActuallyLive) {
          isActuallyLive = true;
          confidence = 'high';
        }
        
        if (espnValidation.score && !score) {
          score = espnValidation.score;
        }
      } catch (error) {
        console.log(`ESPN validation failed for ${game.home} vs ${game.away}:`, error);
      }

      // Source 3: Sports Reference (if available)
      try {
        const sportsRefValidation = await this.validateWithSportsReference(game);
        sources.push('Sports Reference');
        
        if (sportsRefValidation.isLive && !isActuallyLive) {
          isActuallyLive = true;
          confidence = 'medium';
        }
      } catch (error) {
        console.log(`Sports Reference validation failed for ${game.home} vs ${game.away}:`, error);
      }

      // Check for discrepancies
      if (game.status.toLowerCase().includes('live') && !isActuallyLive) {
        discrepancies.push('Marked as live but not actually live');
      } else if (!game.status.toLowerCase().includes('live') && isActuallyLive) {
        discrepancies.push('Actually live but not marked as live');
      }

      // Update confidence based on source agreement
      if (sources.length >= 2) {
        confidence = 'high';
      } else if (sources.length === 1) {
        confidence = 'medium';
      }

      const validation: LiveGameValidation = {
        gameId: game.id,
        homeTeam: game.home,
        awayTeam: game.away,
        sport: game.sport,
        league: game.league,
        isActuallyLive,
        actualStatus: isActuallyLive ? 'live' : game.status,
        lastVerified: new Date(),
        confidence,
        sources,
        discrepancies,
        score
      };

      // Cache the result
      this.validationCache.set(cacheKey, validation);
      
      return validation;
    } catch (error) {
      console.error(`Error validating game ${game.home} vs ${game.away}:`, error);
      return this.createFallbackValidation(game);
    }
  }

  /**
   * Validate game status using Google search
   */
  private async validateWithGoogle(game: {
    home: string;
    away: string;
    sport: string;
    league: string;
  }): Promise<{
    isLive: boolean;
    score?: { home: number; away: number; period?: string; timeRemaining?: string };
  }> {
    try {
      const searchQuery = `${game.away} vs ${game.home} ${game.sport} ${game.league} live score`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      // Use a proxy service or scraping approach to avoid rate limiting
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000
      });

      const html = response.data;
      
      // Check for live indicators
      const isLive = this.detectLiveStatus(html, game);
      
      // Extract score if available
      const score = this.extractScore(html, game);
      
      return { isLive, score };
    } catch (error) {
      console.error('Google validation failed:', error);
      return { isLive: false };
    }
  }

  /**
   * Validate game status using ESPN API
   */
  private async validateWithESPN(game: {
    home: string;
    away: string;
    sport: string;
    league: string;
  }): Promise<{
    isLive: boolean;
    score?: { home: number; away: number; period?: string; timeRemaining?: string };
  }> {
    try {
      // ESPN API endpoint (you'll need to implement this based on ESPN's API)
      // This is a placeholder for the actual ESPN API integration
      const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${this.mapSportToESPN(game.sport)}/${this.mapLeagueToESPN(game.league)}/scoreboard`;
      
      const response = await axios.get(espnUrl, {
        timeout: 10000
      });

      const data = response.data;
      
      // Parse ESPN data to find the specific game
      const gameData = this.findGameInESPNData(data, game);
      
      if (gameData) {
        return {
          isLive: gameData.status.type.state === 'post',
          score: gameData.score ? {
            home: gameData.score.home,
            away: gameData.score.away,
            period: gameData.status.period,
            timeRemaining: gameData.status.time
          } : undefined
        };
      }
      
      return { isLive: false };
    } catch (error) {
      console.error('ESPN validation failed:', error);
      return { isLive: false };
    }
  }

  /**
   * Validate game status using Sports Reference
   */
  private async validateWithSportsReference(game: {
    home: string;
    away: string;
    sport: string;
    league: string;
  }): Promise<{
    isLive: boolean;
    score?: { home: number; away: number; period?: string; timeRemaining?: string };
  }> {
    try {
      // Sports Reference doesn't have a public API, so this would require scraping
      // For now, return false to avoid legal issues
      return { isLive: false };
    } catch (error) {
      console.error('Sports Reference validation failed:', error);
      return { isLive: false };
    }
  }

  /**
   * Detect live status from HTML content
   */
  private detectLiveStatus(html: string, game: { home: string; away: string; sport: string }): boolean {
    const lowerHtml = html.toLowerCase();
    
    // Look for live indicators
    const liveIndicators = [
      'live',
      'in progress',
      'currently playing',
      'live score',
      'live game',
      'live now',
      'playing now',
      'in play',
      'live updates'
    ];
    
    // Look for sport-specific live indicators
    const sportSpecificIndicators = {
      'basketball': ['quarter', 'period', 'time remaining', 'shot clock'],
      'football': ['quarter', 'down', 'time remaining', 'possession'],
      'baseball': ['inning', 'top of', 'bottom of', 'bases loaded'],
      'soccer': ['minute', 'half', 'extra time', 'stoppage time'],
      'hockey': ['period', 'time remaining', 'power play']
    };
    
    const sportIndicators = sportSpecificIndicators[game.sport.toLowerCase() as keyof typeof sportSpecificIndicators] || [];
    
    // Check for live indicators
    const hasLiveIndicator = liveIndicators.some(indicator => lowerHtml.includes(indicator));
    const hasSportIndicator = sportIndicators.some(indicator => lowerHtml.includes(indicator));
    
    // Check for score patterns that indicate live games
    const hasLiveScore = /\d+\s*-\s*\d+/.test(html);
    
    return hasLiveIndicator || hasSportIndicator || hasLiveScore;
  }

  /**
   * Extract score from HTML content
   */
  private extractScore(html: string, game: { home: string; away: string }): { home: number; away: number; period?: string; timeRemaining?: string } | undefined {
    try {
      // Look for score patterns like "24 - 21" or "24-21"
      const scorePattern = /(\d+)\s*[-–]\s*(\d+)/g;
      const scores: Array<{ home: number; away: number }> = [];
      
      let match;
      while ((match = scorePattern.exec(html)) !== null) {
        const away = parseInt(match[1]);
        const home = parseInt(match[2]);
        
        if (!isNaN(away) && !isNaN(home) && away >= 0 && home >= 0 && away <= 200 && home <= 200) {
          scores.push({ home, away });
        }
      }
      
      if (scores.length > 0) {
        // Return the most likely score (usually the first one found)
        const score = scores[0];
        
        // Try to extract period/time information
        const periodMatch = html.match(/(?:quarter|period|inning)\s*(\d+)/i);
        const timeMatch = html.match(/(\d+):(\d+)\s*(?:remaining|left|to go)/i);
        
        return {
          home: score.home,
          away: score.away,
          period: periodMatch ? periodMatch[1] : undefined,
          timeRemaining: timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : undefined
        };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error extracting score:', error);
      return undefined;
    }
  }

  /**
   * Find game in ESPN data
   */
  private findGameInESPNData(data: any, game: { home: string; away: string }): any {
    try {
      if (!data.events) return null;
      
      return data.events.find((event: any) => {
        const homeTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')?.team?.name;
        const awayTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')?.team?.name;
        
        return homeTeam === game.home && awayTeam === game.away;
      });
    } catch (error) {
      console.error('Error finding game in ESPN data:', error);
      return null;
    }
  }

  /**
   * Map sport names to ESPN API format
   */
  private mapSportToESPN(sport: string): string {
    const sportMap: { [key: string]: string } = {
      'basketball': 'basketball',
      'football': 'football',
      'baseball': 'baseball',
      'soccer': 'soccer',
      'hockey': 'hockey',
      'tennis': 'tennis',
      'golf': 'golf'
    };
    
    return sportMap[sport.toLowerCase()] || 'basketball';
  }

  /**
   * Map league names to ESPN API format
   */
  private mapLeagueToESPN(league: string): string {
    const leagueMap: { [key: string]: string } = {
      'nba': 'nba',
      'nfl': 'nfl',
      'mlb': 'mlb',
      'nhl': 'nhl',
      'ncaa basketball': 'mens-college-basketball',
      'ncaa football': 'college-football',
      'premier league': 'eng.1',
      'la liga': 'esp.1',
      'bundesliga': 'ger.1',
      'serie a': 'ita.1'
    };
    
    return leagueMap[league.toLowerCase()] || 'nba';
  }

  /**
   * Create fallback validation when external sources fail
   */
  private createFallbackValidation(game: {
    id: string;
    home: string;
    away: string;
    sport: string;
    league: string;
    status: string;
    startTime: string;
    awayScore?: number;
    homeScore?: number;
  }): LiveGameValidation {
    return {
      gameId: game.id,
      homeTeam: game.home,
      awayTeam: game.away,
      sport: game.sport,
      league: game.league,
      isActuallyLive: game.status.toLowerCase().includes('live'),
      actualStatus: game.status,
      lastVerified: new Date(),
      confidence: 'low',
      sources: ['Fallback'],
      discrepancies: ['External validation failed'],
      score: game.awayScore !== undefined && game.homeScore !== undefined ? {
        home: game.homeScore,
        away: game.awayScore
      } : undefined
    };
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear validation cache
   */
  public clearCache(): void {
    this.validationCache.clear();
    console.log('Live game validation cache cleared');
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

export default LiveGameValidator;
