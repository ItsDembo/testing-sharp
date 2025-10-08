// Complete Metabet sportsbook integration - All available books
export const BOOK_ORDER: string[] = [
  "BET_365", "DRAFTKINGS", "FANDUEL", "MGM", "CAESARS",
  "POINTSBET", "UNIBET", "BET_RIVERS", "FANATICS", "SPORTS_INTERACTION",
  "WILLIAM_HILL", "BOVADA", "BETONLINE", "SUGAR_HOUSE", "SPORTINGBET",
  "SPORTZINO", "SPORTTRADE", "PUNTNOW", "HARD_ROCK", "ESPNBET"
];

export const BOOK_ICONS: Record<string, string> = {
  BET_365: "/icons/bet365.svg",
  DRAFTKINGS: "/icons/draftkings.svg",
  FANDUEL: "/icons/fanduel.svg",
  MGM: "/icons/mgm.svg",
  CAESARS: "/icons/caesars.svg",
  POINTSBET: "/icons/pointsbet.svg",
  UNIBET: "/icons/unibet.svg",
  BET_RIVERS: "/icons/betrivers.svg",
  FANATICS: "/icons/fanatics.svg",
  SPORTS_INTERACTION: "/icons/sportsinteraction.svg"
};

// Fallback text for books without icons - All Metabet sportsbooks
export const BOOK_DISPLAY_NAMES: Record<string, string> = {
  BET_365: "Bet365",
  DRAFTKINGS: "DraftKings", 
  FANDUEL: "FanDuel",
  MGM: "MGM",
  CAESARS: "Caesars",
  POINTSBET: "PointsBet",
  UNIBET: "Unibet",
  BET_RIVERS: "BetRivers",
  FANATICS: "Fanatics",
  SPORTS_INTERACTION: "Sports Interaction",
  WILLIAM_HILL: "William Hill",
  BOVADA: "Bovada",
  BETONLINE: "BetOnline",
  SUGAR_HOUSE: "SugarHouse",
  SPORTINGBET: "SportingBet",
  SPORTZINO: "SportZino",
  SPORTTRADE: "SportTrade",
  PUNTNOW: "PuntNow",
  HARD_ROCK: "Hard Rock",
  ESPNBET: "ESPN Bet"
};
