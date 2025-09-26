/********************************************
 * STANDARDIZED OPPORTUNITY DATA STRUCTURES
 * Single source of truth for all opportunity types
 ********************************************/

/**
 * Consensus data - never fabricated, always from real sportsbook data
 */
export interface ConsensusData {
  /** Fair probability from consensus calculation (0-1) */
  prob: number;
  /** American odds representation of consensus */
  american: number;
  /** Number of sportsbooks used in consensus */
  samples: number;
  /** Timestamp when consensus was calculated */
  calculatedAt: string;
}

/**
 * Individual sportsbook odds with calculated metrics
 */
export interface SportsbookOdds {
  /** Sportsbook name */
  sportsbook: string;
  /** American odds */
  odds: number;
  /** Expected Value percentage */
  ev: number;
  /** Edge percentage */
  edge: number;
  /** Whether this is the primary/main book */
  isMainBook?: boolean;
  /** Direct link to place bet */
  url?: string;
  /** Last time these odds were updated */
  lastUpdated?: string;
}

/**
 * Standardized opportunity structure
 * Replaces all inconsistent opportunity objects
 */
export interface StandardOpportunity {
  /** Unique identifier */
  id: string;

  // Event Information
  /** Sport (e.g., 'NFL', 'NBA') */
  sport: string;
  /** Game description (e.g., 'Chiefs @ Bills') */
  game: string;
  /** Market type (e.g., 'moneyline', 'spread', 'total') */
  market: string;
  /** Specific bet type (e.g., 'over', 'under', 'home', 'away') */
  betType: string;
  /** Line value for spreads/totals */
  line?: string;
  /** Game start time */
  gameTime: string;

  // Consensus Data (never fabricated)
  /** Consensus probability and odds - null if insufficient data */
  consensus: ConsensusData | null;

  // Sportsbook Comparison
  /** All available odds with EV/Edge calculations */
  oddsComparison: SportsbookOdds[];

  // Best Opportunity
  /** Highest odds available */
  bestOdds: number;
  /** Sportsbook with best odds */
  bestBook: string;
  /** Expected Value of best odds */
  bestEV: number;
  /** Edge percentage of best odds */
  bestEdge: number;

  // Metadata
  /** When opportunity was last updated */
  lastUpdated: string;
  /** Confidence level (high/medium/low) */
  confidence?: 'high' | 'medium' | 'low';
  /** Category for filtering */
  category?: string;
  /** Status for validation */
  status?: 'active' | 'stale' | 'disabled';
}