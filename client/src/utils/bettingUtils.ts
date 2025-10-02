// Shared utilities for betting calculations and formatting
// Used by TradingTerminal and EVCalculator components

// Odds conversion utilities
export const americanToDecimal = (american: number): number => {
  if (american > 0) {
    return (american / 100) + 1;
  } else {
    return (100 / Math.abs(american)) + 1;
  }
};

export const decimalToAmerican = (decimal: number): string => {
  if ((decimal == null) || (decimal == 1)) {
    return 'N/A';
  }

  // Handle edge cases
  if (decimal >= -1000 && decimal <= 1000 && decimal !== 0) {
    return decimal > 0 ? `+${decimal}` : `${decimal}`;
  }

  if (decimal < 1.01 || decimal > 1000) {
    return 'N/A';
  }

  if (decimal < 2) {
    const american = Math.round(-1 * (1 / (decimal - 1)) * 100);
    return american < -1000 ? '-1000' : `${american}`;
  }

  const american = Math.round((decimal - 1) * 100);
  return american > 1000 ? '+1000' : `+${american}`;
};

export const formatOddsDisplay = (american?: number, european?: number, legacy?: number): string => {
  // American-only display per user preference. Never show European/decimal.
  if (typeof american === 'number' && isFinite(american)) {
    return american > 0 ? `+${american}` : `${american}`;
  }
  // Fallbacks: if only decimal provided, convert to American
  if (typeof legacy === 'number' && isFinite(legacy)) {
    const converted = decimalToAmerican(legacy);
    return converted ?? 'N/A';
  }
  if (typeof european === 'number' && isFinite(european)) {
    const converted = decimalToAmerican(european);
    return converted ?? 'N/A';
  }
  return 'N/A';
};

// Probability and EV calculations based on user's specifications
export const calculateWinProbability = (decimalOdds: number): number => {
  return Math.round((1 / decimalOdds) * 100 * 10) / 10;
};

// Calculate implied probability from American odds
export const calculateImpliedProbability = (americanOdds: number): number => {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
};

// Find best odds (highest decimal odds) from field odds
export const findBestOdds = (fieldOdds: Array<{ odds?: number; american?: number; european?: number }>): { odds: number; book: string } | null => {
  if (!fieldOdds || fieldOdds.length === 0) return null;

  let bestOdds = 0;
  let bestBook = '';

  fieldOdds.forEach((bookOdds: any) => {
    let decimalOdds = 0;

    // Convert to decimal odds for comparison
    if (bookOdds.european) {
      decimalOdds = bookOdds.european;
    } else if (bookOdds.american) {
      decimalOdds = americanToDecimal(bookOdds.american);
    } else if (bookOdds.odds) {
      // If odds is already decimal
      if (bookOdds.odds > 0 && bookOdds.odds < 100) {
        decimalOdds = bookOdds.odds;
      } else {
        // Assume it's American odds
        decimalOdds = americanToDecimal(bookOdds.odds);
      }
    }

    if (decimalOdds > bestOdds) {
      bestOdds = decimalOdds;
      bestBook = bookOdds.book || 'Unknown';
    }
  });

  return bestOdds > 0 ? { odds: bestOdds, book: bestBook } : null;
};

// Calculate Expected Value per $1 staked: EV = p * b - (1 - p)
export const calculateEV = (winProbability: number, decimalOdds: number): number => {
  const p = winProbability / 100; // Convert percentage to decimal
  const b = decimalOdds - 1; // Net payout per $1 staked
  return p * b - (1 - p);
};

// Kelly Criterion calculation: f* = (b*p - q)/b where q = 1-p
export const kellyPercentFrom = (winProbPct?: number, decimalOdds?: number): number | null => {
  if (!winProbPct || !decimalOdds || decimalOdds <= 1.0) return null;
  const p = Math.min(Math.max(winProbPct / 100, 0), 1);
  const b = decimalOdds - 1;
  if (b <= 0) return null;
  const q = 1 - p;
  const k = (b * p - q) / b;
  return Math.max(0, k) * 100;
};

// Calculate stake amount based on Kelly percentage and bankroll
export const calculateStake = (bankroll: number, kellyPercent: number, kellyFraction: number = 1): number => {
  return bankroll * (kellyPercent / 100) * kellyFraction;
};

// Profit calculation - potential profit if bet wins
export const calculateProfit = (stake: number, decimalOdds: number): number => {
  return stake * (decimalOdds - 1);
};

// Time formatting utilities
export const formatTimeUntilGame = (gameTime: string): string => {
  const now = new Date();
  const gameDate = new Date(gameTime);
  const diffMs = gameDate.getTime() - now.getTime();

  if (diffMs <= 0) return 'Started';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 24) {
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${diffHours % 24}h`;
  } else if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  } else {
    return `${diffMinutes}m`;
  }
};

// Sport name normalization
export const normalizeSportName = (sport: string): string => {
  const sportMap: { [key: string]: string } = {
    'mlb': 'MLB',
    'nba': 'NBA',
    'nfl': 'NFL',
    'nhl': 'NHL',
    'soccer': 'SOCCER',
    'tennis': 'TENNIS',
    'golf': 'GOLF',
    'mma': 'MMA',
    'ufc': 'UFC',
    'wnba': 'WNBA',
    'ncaab': 'NCAAB',
    'ncaaf': 'NCAAF'
  };
  return sportMap[sport.toLowerCase()] || sport.toUpperCase();
};

// Prop label generation
export const generatePropLabel = (prop: string, market: string): string => {
  const raw = (prop || '').trim();

  // Player Props: "Player (TEAM) - Over 1.5" => "Player Over 1.5"
  if (market === 'Player Prop') {
    const withTeam = raw.match(/^(.+?)\s*\((?:[^)]+)\)\s*-\s*(.+)$/);
    if (withTeam) return `${withTeam[1]} ${withTeam[2]}`.trim();

    const withoutTeam = raw.match(/^(.+?)\s*-\s*(.+)$/);
    if (withoutTeam) return `${withoutTeam[1]} ${withoutTeam[2]}`.trim();
  }

  // Moneyline: remove "ML" suffix
  if (market === 'Moneyline') {
    return raw.replace(/\s+ML$/i, '').trim();
  }

  // Total: proper case for Over/Under
  if (market === 'Total') {
    return raw.replace(/^(over|under)/i, s => s[0].toUpperCase() + s.slice(1).toLowerCase());
  }

  return raw;
};

// EV color coding
export const getEVColor = (ev: number): string => {
  if (ev > 5) return 'text-green-400';
  if (ev > 0) return 'text-green-300';
  if (ev > -5) return 'text-yellow-400';
  return 'text-red-400';
};



// Normalize sportsbook names to canonical labels used across the app (match SportsbookLogo keys)
export const normalizeBookName = (book: string): string => {
  if (!book) return 'Unknown';
  const b = book.trim().replace(/\s+logo$/i, '');
  const map: Record<string, string> = {
    'FD': 'FanDuel', 'Fanduel': 'FanDuel', 'FanDuel': 'FanDuel',
    'DK': 'DraftKings', 'DraftKings': 'DraftKings',
    'MGM': 'BetMGM', 'BetMGM': 'BetMGM',
    'Caesars': 'Caesars', 'CZR': 'Caesars',
    'BetRivers': 'BetRivers', 'Rivers': 'BetRivers', 'SugarHouse': 'BetRivers',
    'ESPN BET': 'ESPN BET', 'ESPNBET': 'ESPN BET', 'ESPN Bet': 'ESPN BET',
    'Fanatics': 'Fanatics',
    'Unibet': 'Unibet', 'UNI': 'Unibet',
    'William Hill': 'William Hill', 'WH': 'William Hill',
    'Bet365': 'Bet365', '365': 'Bet365',
    'Bovada': 'Bovada',
    'BetOnline': 'BetOnline', 'BOL': 'BetOnline',
    'Betway': 'Betway',
    'Hard Rock': 'Hard Rock',
    'PointsBet': 'PointsBet',
    'Barstool': 'Barstool',
    'WynnBET': 'WynnBET',
    'Sports Interaction': 'Sports Interaction',
    'SportingBet': 'SportingBet',
    'SportTrade': 'SportTrade',
    'Sportszino': 'Sportszino',
    'PuntNow': 'PuntNow'
  };
  return map[b] || b;
};

// Convert a fieldOdds entry to true decimal odds
export const toDecimalOdds = (
  fo?: { american?: number; european?: number; odds?: number }
): number | undefined => {
  if (!fo) return undefined;
  if (typeof fo.european === 'number') return fo.european;
  if (typeof fo.american === 'number') return americanToDecimal(fo.american);
  if (typeof fo.odds === 'number') {
    const val = fo.odds;
    return (val > 0 && val < 100) ? val : americanToDecimal(val);
  }
  return undefined;
};


// Sportsbook ordering
export const BOOK_ORDER = [
  'FANDUEL', 'DRAFTKINGS', 'MGM', 'CAESARS', 'BET_RIVERS', 'POINTSBET',
  'BETWAY', 'UNIBET', 'WILLIAM_HILL', 'BARSTOOL', 'TWINSPIRES', 'FOXBET'
];

export const getOrderedBooks = (primaryBook: string): string[] => {
  return [primaryBook, ...BOOK_ORDER.filter(b => b !== primaryBook)];
};
