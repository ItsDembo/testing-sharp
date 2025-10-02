import { NormalizedProp } from '../../shared/market/types';

export interface AywtConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retries: number;
}

export interface AywtResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

const DEFAULT_CONFIG: AywtConfig = {
  baseUrl: 'https://api.areyouwatchingthis.com',
  timeout: 10000,
  retries: 3
};

export class AywtFetcher {
  private config: AywtConfig;

  constructor(config: Partial<AywtConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async fetchOdds(league?: string, sport?: string): Promise<AywtResponse> {
    try {
      const url = new URL('/odds', this.config.baseUrl);
      if (league) url.searchParams.set('league', league);
      if (sport) url.searchParams.set('sport', sport);

      const response = await this.makeRequest(url.toString());
      return response;
    } catch (error) {
      console.error('Error fetching AYWT odds:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async fetchEvents(league?: string, sport?: string): Promise<AywtResponse> {
    try {
      const url = new URL('/events', this.config.baseUrl);
      if (league) url.searchParams.set('league', league);
      if (sport) url.searchParams.set('sport', sport);

      const response = await this.makeRequest(url.toString());
      return response;
    } catch (error) {
      console.error('Error fetching AYWT events:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async fetchLiveGames(): Promise<AywtResponse> {
    try {
      const url = new URL('/live', this.config.baseUrl);
      const response = await this.makeRequest(url.toString());
      return response;
    } catch (error) {
      console.error('Error fetching AYWT live games:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async makeRequest(url: string, attempt: number = 1): Promise<AywtResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, application/json',
          'User-Agent': 'SharpShot/1.0',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('application/xml') || contentType?.includes('text/xml')) {
        const text = await response.text();
        data = { xml: text }; // Store XML as text for parsing
      } else {
        data = await response.text();
      }

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      if (attempt < this.config.retries) {
        console.warn(`AYWT request failed, retrying (${attempt}/${this.config.retries}):`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        return this.makeRequest(url, attempt + 1);
      }

      throw error;
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.config.baseUrl}/health`);
      return response.success;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const aywtFetcher = new AywtFetcher();
