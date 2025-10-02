const API_BASE_URL = 'https://sharpshot.api.areyouwatchingthis.com/api';
const API_KEY = '3e8b23fdd1b6030714b9320484d7367b';

export interface Game {
  gameID: string;
  sport: string;
  team1Name: string; // This is the home team
  team2Name: string; // This is the away team
  team1City: string;
  team2City: string;
  team1Score?: number;
  team2Score?: number;
  timeLeft: string; // This contains the status
  time: number; // Unix timestamp
  date: number; // Unix timestamp
  pointsLevel: string;
  points: number;
  leagueCode: string;
  competition: string;
  location: string;
  broadcast?: string;
}

export interface Odds {
  gameID: string;
  provider: string;
  homeOdds: number;
  awayOdds: number;
  drawOdds?: number;
  lastUpdate: string;
}

export interface PlayerProp {
  id: string;
  playerName: string;
  gameId: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  provider: string;
}

export class SportsApiService {
  private async makeApiCall(endpoint: string, params: Record<string, string | number> = {}) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    url.searchParams.set('apiKey', API_KEY);
    url.searchParams.set('_t', Date.now().toString());
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value.toString());
    });

    const fullUrl = url.toString();
    console.log('🌐 Making API call to:', fullUrl);

    try {
      const response = await fetch(fullUrl);
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API call failed:', response.status, errorText);
        throw new Error(`API call failed: ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ API call successful, data type:', typeof data);
      return data;
    } catch (error) {
      console.error('❌ API call error:', error);
      throw error;
    }
  }

  async getGames(sport?: string): Promise<Game[]> {
    const params: Record<string, string | number> = {};
    if (sport) params.sport = sport;
    
    console.log('🔍 Calling getGames with params:', params);
    const data = await this.makeApiCall('/games.json', params);
    console.log('📊 Raw API response:', data);
    console.log('📊 Results array:', data.results);
    
    if (!data.results) {
      console.log('⚠️ No results array found, checking data structure:', Object.keys(data));
      // Try different possible response structures
      if (data.games) return data.games;
      if (data.events) return data.events;
      if (Array.isArray(data)) return data;
      return [];
    }
    
    return data.results || [];
  }

  async getOdds(gameID: string): Promise<Odds[]> {
    const data = await this.makeApiCall('/odds.json', { gameID });
    return data.results || [];
  }

  async getPlayerProps(gameID: string): Promise<PlayerProp[]> {
    const data = await this.makeApiCall('/sideodds.json', { gameID });
    return data.results || [];
  }

  async getLiveGames(): Promise<Game[]> {
    const games = await this.getGames();
    return games.filter(game => 
      game.timeLeft && ['1H', '2H', 'HT', 'Q1', 'Q2', 'Q3', 'Q4', 'OT'].some(period => 
        game.timeLeft.includes(period)
      )
    );
  }

  async getUpcomingGames(): Promise<Game[]> {
    const games = await this.getGames();
    return games.filter(game => 
      game.timeLeft && ['Final', 'POSTPONED'].includes(game.timeLeft)
    );
  }

  // Helper method to get games by sport
  async getGamesBySport(sport: string): Promise<Game[]> {
    const games = await this.getGames();
    return games.filter(game => game.sport === sport);
  }

  // Helper method to get games by league
  async getGamesByLeague(leagueCode: string): Promise<Game[]> {
    const games = await this.getGames();
    return games.filter(game => game.leagueCode === leagueCode);
  }
}

export const sportsApi = new SportsApiService();
