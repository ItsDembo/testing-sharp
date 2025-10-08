export type OddsFormat = "american" | "decimal";
export type Canonical = "home" | "away" | "draw";

export type OutcomeQuote = {
  name: string;
  price: number;            // american or decimal per oddsFormat
  oddsFormat: OddsFormat;
  role?: Canonical;         // ← REQUIRED for correctness
  participantId?: string;   // ← stable mapping if XML has it
  selectionId?: string;     // ← stable selection ID from XML
};

export type Quote = {
  sportsbook: string;
  eventId: string;                // stable event id from XML
  marketType: "moneyline" | "threeway";  // only support ML and 3-way for now
  participants?: { homeId: string; awayId: string; drawId?: string };
  outcomes: OutcomeQuote[];       // exactly 2 or 3 for ML/3way
  point?: number;
  lastUpdate?: string;            // ISO8601
};
