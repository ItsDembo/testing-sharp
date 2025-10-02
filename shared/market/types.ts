export type OddsFormat = 'american' | 'decimal';

export type Quote = {
  sportsbook: string;
  price: number;              // american (preferred)
  oddsFormat: OddsFormat;     // 'american' unless explicitly decimal
  lastUpdate?: string;        // ISO8601 from feed
};

export type NormalizedProp = {
  eventId: string;
  eventLabel: string;         // "Celtics @ Lakers (2025-10-12 7:00p)"
  league: string;             // NBA / NFL / MLB / etc.
  market: string;             // Moneyline | Total Points | Player Rebounds ...
  propLabel: string;          // "Under 147.5" | "Yankees Moneyline" | "Jayson Tatum Over 5.5 Rebounds"
  status: 'upcoming' | 'live' | 'final';
  myBook: string;             // user-selected book (lowercased when matching)
  sideA: { label: string; quotes: Quote[] };   // e.g., "Under 147.5" or "Team A ML"
  sideB: { label: string; quotes: Quote[] };   // e.g., "Over 147.5" or "Team B ML"
  // which side this row represents (the row's "Selection"):
  rowSide: 'A' | 'B';
};

export type UiRow = {
  event: string;
  league: string;
  prop: string;
  market: string;
  myBook: string;
  myOddsAmerican: number | null;
  winProbability: number | null;     // 0..1, consensus of field books
  evPct: number | null;              // per unit; show as %
  fieldOdds: { sportsbook: string; american: number }[];
  status: 'upcoming' | 'live' | 'final';
  ageSeconds?: number;               // seconds since newest quote used for this row
};
