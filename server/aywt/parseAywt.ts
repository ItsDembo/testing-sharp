import { NormalizedProp, Quote } from '../../shared/market/types';

export interface AywtEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: 'upcoming' | 'live' | 'final';
  league: string;
  sport: string;
  homeScore?: number;
  awayScore?: number;
  period?: string;
  timeRemaining?: string;
}

export interface AywtMarket {
  type: 'moneyline' | 'spread' | 'total' | 'player_props';
  line?: number;
  side: 'home' | 'away' | 'over' | 'under';
  odds: Quote[];
}

export interface AywtGame {
  event: AywtEvent;
  markets: AywtMarket[];
}

// Helper to canonicalize book names for logo mapping
export function bookNameToLogoKey(bookName: string): string {
  return bookName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
    .replace(/\s+/g, ''); // Remove spaces
}

// Helper to detect if a game is live based on status and time
export function detectGameStatus(status: string, startTime?: string, period?: string): 'upcoming' | 'live' | 'final' {
  if (status?.toLowerCase().includes('live') || period) {
    return 'live';
  }
  if (status?.toLowerCase().includes('final') || status?.toLowerCase().includes('ended')) {
    return 'final';
  }
  return 'upcoming';
}

// Helper to format event label with time
export function formatEventLabel(homeTeam: string, awayTeam: string, startTime?: string): string {
  if (!startTime) {
    return `${awayTeam} @ ${homeTeam}`;
  }
  
  try {
    const gameTime = new Date(startTime);
    const timeStr = gameTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    return `${awayTeam} @ ${homeTeam} (${gameTime.toLocaleDateString()} ${timeStr})`;
  } catch {
    return `${awayTeam} @ ${homeTeam}`;
  }
}

// Helper to format prop label
export function formatPropLabel(market: AywtMarket, event: AywtEvent): string {
  const { type, line, side } = market;
  
  switch (type) {
    case 'moneyline':
      return side === 'home' ? `${event.homeTeam} Moneyline` : `${event.awayTeam} Moneyline`;
    
    case 'spread':
      if (line !== undefined) {
        const sign = line > 0 ? '+' : '';
        return side === 'home' ? `${event.homeTeam} ${sign}${line}` : `${event.awayTeam} ${sign}${line}`;
      }
      return side === 'home' ? `${event.homeTeam} Spread` : `${event.awayTeam} Spread`;
    
    case 'total':
      if (line !== undefined) {
        return side === 'over' ? `Over ${line}` : `Under ${line}`;
      }
      return side === 'over' ? 'Over' : 'Under';
    
    case 'player_props':
      // For player props, we'd need more context from the XML
      return `${side} Player Props`;
    
    default:
      return `${side} ${type}`;
  }
}

// Main parsing function to convert AYWT XML to NormalizedProp[]
export function parseAywtXml(xmlData: string): NormalizedProp[] {
  try {
    // For now, we'll create a mock parser since we don't have the actual XML structure
    // This will be replaced with actual XML parsing logic when we have the real API
    
    const mockData: NormalizedProp[] = [
      // Example structure - replace with actual XML parsing
      {
        eventId: 'mock-1',
        eventLabel: 'Celtics @ Lakers (2025-01-15 7:00 PM)',
        league: 'NBA',
        market: 'Moneyline',
        propLabel: 'Celtics Moneyline',
        status: 'upcoming',
        myBook: 'fanduel',
        sideA: {
          label: 'Celtics ML',
          quotes: [
            { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
            { sportsbook: 'DraftKings', price: -108, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        sideB: {
          label: 'Lakers ML',
          quotes: [
            { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
            { sportsbook: 'DraftKings', price: -112, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        rowSide: 'A'
      }
    ];
    
    return mockData;
  } catch (error) {
    console.error('Error parsing AYWT XML:', error);
    return [];
  }
}

// Parse JSON response if AYWT returns JSON instead of XML
export function parseAywtJson(jsonData: any): NormalizedProp[] {
  try {
    // This will be implemented based on the actual JSON structure from AYWT
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error parsing AYWT JSON:', error);
    return [];
  }
}

// Main entry point - automatically detects format and parses accordingly
export function parseAywtData(data: any): NormalizedProp[] {
  if (typeof data === 'string') {
    // XML string
    return parseAywtXml(data);
  } else if (data?.xml) {
    // XML stored in data.xml
    return parseAywtXml(data.xml);
  } else if (typeof data === 'object') {
    // JSON object
    return parseAywtJson(data);
  } else {
    console.error('Unknown AYWT data format:', typeof data);
    return [];
  }
}

// Helper to apply freshness filters
export function applyFreshnessFilters(
  props: NormalizedProp[], 
  scope: 'live' | 'upcoming' | 'all',
  maxAgeSeconds: { live: number; upcoming: number }
): NormalizedProp[] {
  const now = Date.now();
  
  return props.filter(prop => {
    if (scope === 'all') return true;
    
    // Get the newest quote timestamp for this prop
    const allQuotes = [...prop.sideA.quotes, ...prop.sideB.quotes];
    const newestQuote = allQuotes.reduce((newest, quote) => {
      if (!quote.lastUpdate) return newest;
      const ts = Date.parse(quote.lastUpdate);
      return isNaN(ts) ? newest : Math.max(newest, ts);
    }, 0);
    
    if (newestQuote === 0) return false; // No valid timestamps
    
    const ageSeconds = Math.round((now - newestQuote) / 1000);
    
    if (scope === 'live') {
      return ageSeconds <= maxAgeSeconds.live;
    } else if (scope === 'upcoming') {
      return ageSeconds <= maxAgeSeconds.upcoming;
    }
    
    return true;
  });
}
