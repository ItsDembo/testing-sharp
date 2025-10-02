export interface OddsResponse {
  opportunities: any[];
  counts: {
    books: number;
    ev: number;
    arb: number;
    mid: number;
    live: number;
    upcoming: number;
  };
  lastUpdated: string;
  filters?: {
    leagues: string[];
    marketTypes: string[];
    books: string[];
  };
}

export interface LiveGame {
  id: string;
  sport: string; // Add sport property
  home: string;
  away: string;
  league: string;
  startTime: string;
  status: 'live' | 'prematch' | 'scheduled' | 'starting_soon' | 'final';
  score?: {
    home: number;
    away: number;
    period?: string;
    timeRemaining?: string;
  };
  timeLeft?: string; // Add timeLeft property
  markets: Array<{
    type: string;
    side: string;
    line?: number;
    odds: number;
    book: string;
    impliedProbability: number;
    ev: number;
  }>;
}

export interface LiveOddsResponse {
  games: LiveGame[];
  lastUpdated: string;
  totalGames: number;
  liveGames: number;
  stats?: {
    evOpportunities: number;
    highEVOpportunities: number;
    totalMarkets: number;
    averageEV: number;
    leagues: string[];
    books: string[];
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sharp-shot.com';

// Enhanced odds fetching with real-time updates using the new endpoint
export async function fetchLiveOdds(): Promise<LiveOddsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/enhanced-trading-terminal`, { 
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    if (response.status === 429) {
      // Rate limited, retry after delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchLiveOdds();
    }
    
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Fetch live games specifically
export async function fetchLiveGames(status = 'live'): Promise<LiveOddsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/enhanced-trading-terminal?status=${status}`, { 
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Fetch upcoming games
export async function fetchUpcomingGames(): Promise<LiveOddsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/enhanced-trading-terminal?status=upcoming`, { 
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Fetch games by league
export async function fetchGamesByLeague(league: string): Promise<LiveOddsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/enhanced-trading-terminal?league=${encodeURIComponent(league)}`, { 
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Fetch games by market type
export async function fetchGamesByMarketType(marketType: string): Promise<LiveOddsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/enhanced-trading-terminal?market_type=${encodeURIComponent(marketType)}`, { 
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Legacy odds fetching (keeping for backward compatibility)
export async function fetchOdds(filters = {}): Promise<OddsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/odds`, { 
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    if (response.status === 429) {
      // Rate limited, retry after delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchOdds();
    }
    
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function fetchOddsWithRetry(maxRetries = 3): Promise<OddsResponse> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchOdds();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Real-time data polling with WebSocket-like behavior
export class LiveDataManager {
  private intervalId: number | null = null;
  private subscribers: Set<(data: LiveOddsResponse) => void> = new Set();
  private isPolling = false;
  private currentFilters: { status?: string; league?: string; market_type?: string } = {};

  subscribe(callback: (data: LiveOddsResponse) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  setFilters(filters: { status?: string; league?: string; market_type?: string }) {
    this.currentFilters = filters;
  }

  startPolling(intervalMs: number = 30000) {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.intervalId = window.setInterval(async () => {
      try {
        const data = await this.fetchWithFilters();
        this.subscribers.forEach(callback => callback(data));
      } catch (error) {
        console.error('Live data polling error:', error);
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
  }

  // Fetch data with current filters
  private async fetchWithFilters(): Promise<LiveOddsResponse> {
    const params = new URLSearchParams();
    if (this.currentFilters.status) params.append('status', this.currentFilters.status);
    if (this.currentFilters.league) params.append('league', this.currentFilters.league);
    if (this.currentFilters.market_type) params.append('market_type', this.currentFilters.market_type);

    const url = `${API_BASE_URL}/api/enhanced-trading-terminal${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Immediate data fetch
  async refresh(): Promise<LiveOddsResponse> {
    try {
      const data = await this.fetchWithFilters();
      this.subscribers.forEach(callback => callback(data));
      return data;
    } catch (error) {
      console.error('Live data refresh error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const liveDataManager = new LiveDataManager();
