export interface BettingOpportunity {
  id: string;
  event: {
    home: string;
    away: string;
    league: string;
    sport?: string;
    startTime: string;
    status: 'live' | 'prematch' | 'scheduled' | 'starting_soon' | 'final' | string;
    awayScore?: number;
    homeScore?: number;
  };
  market: {
    type: string;
    side: string;
    line?: number;
    player?: string;
  };
  fairOdds: number;
  fairProbability: number;
  evPercent: number;
  myPrice: {
    odds: number;
    book: string;
    url?: string;
  };
  fieldPrices: Array<{
    book: string;
    odds: number;
    line?: number;
    url?: string;
  }>;
  consensus?: {
    count: number;
    avgOdds: number;
  };
  updatedAt: string;
  category: 'ev' | 'arb' | 'mid' | 'neutral';
}
