import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { TrendingUp, RefreshCw, Pause, Play, Search, ChevronDown, AlertCircle } from 'lucide-react';
import { SportsbookLogo } from '@/components/SportsbookLogo';
import EVCalculator, { SavedBet as CalcSavedBet } from '@/components/terminal/EVCalculator';
import LaunchStatusWidget from '@/components/LaunchStatusWidget';
import { ArbitrageCalculator } from '@/components/calculators/ArbitrageCalculator';
import { useBookSelection } from '@/contexts/BookSelectionContext';
import { Table } from '@/components/terminal/Table';

import {
  americanToDecimal,
  decimalToAmerican,
  formatOddsDisplay,
  calculateWinProbability,
  calculateEVPercent,
  formatTimeUntilGame,
  normalizeBookName,
  normalizeSportName,
  toDecimalOdds,
  generatePropLabel,
  getEVColor,
  findBestOdds,
  getOrderedBooks
} from '@/utils/bettingUtils';

const BOOK_DISPLAY_NAMES: { [key: string]: string } = {
  'FanDuel': 'FD',
  'DraftKings': 'DK',
  'BetMGM': 'MGM',
  'Caesars': 'CZR',
  'PointsBet': 'PB',
  'BetRivers': 'BR',
  'Hard Rock': 'HR',
  'ESPN BET': 'ESPN',
  'Fanatics': 'FAN',
  'Unibet': 'UB',
  'William Hill': 'WH',
  'Bet365': '365',
  'Bovada': 'BOV',
  'BetOnline': 'BOL'
};

// Available leagues for filtering
const AVAILABLE_LEAGUES = [
  'All Sports', 'MLB', 'NBA', 'NFL', 'NHL', 'NCAA BK', 'NCAA FB', 'SOCCER', 'TENNIS', 'GOLF', 'MMA', 'BOXING'
];

// Available markets for filtering
const AVAILABLE_MARKETS = [
  'All Markets', 'Moneyline', 'Spread', 'Total', 'Player Prop'
];

// Trading Terminal Event Interface
interface TradingTerminalEvent {
  id: string;
  event: string;
  league: string;
  prop: string;
  market: string;
  myOdds: number;
  winProbability: number;
  evPercentage: number;
  fieldOdds: Array<{
    book: string;
    american?: number;
    european?: number;
    odds?: number;
    url?: string;
  }>;
  gameTime: string;
  isLive: boolean;
  gameStatus: 'live' | 'upcoming' | 'final';
  playerID?: number;
  // Enhanced display fields
  fairLine?: string;
  impliedProbability?: number;
  kellyPercentage?: number;
  // Arbitrage detection
  isArbitrage?: boolean;
  arbitrageProfit?: number;
  arbitrageStakes?: { book1: string; stake1: number; book2: string; stake2: number };
  // Optional enrichment data
  points?: number;
  rationale?: string;
  betsPercentage?: number;
  handlePercentage?: number;
}

// Enhanced data processing functions
const enhanceEventData = (event: TradingTerminalEvent): TradingTerminalEvent => {
  // Calculate fair line from win probability
  const fairLine = event.winProbability ?
    (event.winProbability > 50 ?
      `-${Math.round((event.winProbability / (100 - event.winProbability)) * 100)}` :
      `+${Math.round(((100 - event.winProbability) / event.winProbability) * 100)}`
    ) : 'N/A';

  // Calculate implied probability from best odds
  const bestOdds = findBestOdds(event.fieldOdds);
  const impliedProbability = bestOdds ? (1 / toDecimalOdds(bestOdds as any)) * 100 : event.winProbability;

  // Calculate Kelly percentage
  const kellyPercentage = event.winProbability && bestOdds ?
    calculateKellyPercentage(event.winProbability / 100, toDecimalOdds(bestOdds as any)) : 0;

  // Detect arbitrage opportunities
  const arbitrageData = detectArbitrage(event);

  return {
    ...event,
    fairLine,
    impliedProbability,
    kellyPercentage,
    ...arbitrageData
  };
};

// Detect arbitrage opportunities
const detectArbitrage = (event: TradingTerminalEvent) => {
  if (!event.fieldOdds || event.fieldOdds.length < 2) {
    return { isArbitrage: false };
  }

  // Find the best odds for this side
  const bestOdds = findBestOdds(event.fieldOdds);
  if (!bestOdds) return { isArbitrage: false };

  // For arbitrage, we need to find the opposite side
  // This is a simplified version - in reality, you'd need to match opposing sides
  const bestDecimal = toDecimalOdds(bestOdds as any);
  const impliedProb = 1 / bestDecimal;

  // Look for opportunities where total implied probability < 1
  // This is a basic check - real arbitrage detection would be more complex
  const worstOdds = event.fieldOdds.reduce((worst, current) => {
    const currentDecimal = toDecimalOdds(current as any);
    const worstDecimal = toDecimalOdds(worst as any);
    return currentDecimal < worstDecimal ? current : worst;
  });

  const worstDecimal = toDecimalOdds(worstOdds as any);
  const totalImpliedProb = impliedProb + (1 / worstDecimal);

  if (totalImpliedProb < 0.98) { // 2% margin for arbitrage
    const profit = ((1 - totalImpliedProb) / totalImpliedProb) * 100;
    return {
      isArbitrage: true,
      arbitrageProfit: profit,
      arbitrageStakes: {
        book1: bestOdds.book,
        stake1: 100 / bestDecimal,
        book2: worstOdds.book,
        stake2: 100 / worstDecimal
      }
    };
  }

  return { isArbitrage: false };
};

// Calculate Kelly percentage
const calculateKellyPercentage = (probability: number, decimalOdds: number): number => {
  const q = 1 - probability;
  const b = decimalOdds - 1;
  const kelly = (probability * b - q) / b;
  return Math.max(0, kelly * 100); // Return as percentage, minimum 0
};

// Improve league detection
const improveLeagueDetection = (event: TradingTerminalEvent): string => {
  if (event.league && event.league !== 'UNKNOWN') {
    return event.league;
  }

  // Try to detect league from event name or other fields
  const eventName = event.event.toLowerCase();

  if (eventName.includes('nfl') || eventName.includes('football')) return 'NFL';
  if (eventName.includes('nba') || eventName.includes('basketball')) return 'NBA';
  if (eventName.includes('mlb') || eventName.includes('baseball')) return 'MLB';
  if (eventName.includes('nhl') || eventName.includes('hockey')) return 'NHL';
  if (eventName.includes('soccer') || eventName.includes('football')) return 'Soccer';
  if (eventName.includes('tennis')) return 'Tennis';
  if (eventName.includes('golf')) return 'Golf';
  if (eventName.includes('mma') || eventName.includes('ufc')) return 'MMA';
  if (eventName.includes('boxing')) return 'Boxing';

  // Check game time patterns for league detection
  const gameTime = new Date(event.gameTime);
  const hour = gameTime.getHours();

  // NFL games typically on Sundays, Mondays, Thursdays
  if ([0, 1, 4].includes(gameTime.getDay()) && hour >= 13 && hour <= 23) {
    return 'NFL';
  }

  // NBA games typically evenings
  if (hour >= 19 && hour <= 23) {
    return 'NBA';
  }

  return event.league || 'Unknown';
};
// Adapt TradingTerminalEvent to compact Table opportunity shape
const adaptToCompactOpportunity = (e: TradingTerminalEvent) => {
  const teams = (e.event || '').split(' vs ');
  const home = teams[0] || 'Away';
  const away = teams[1] || 'Home';
  let line: number | undefined = undefined;
  const m = e.prop?.match(/[+-]?\d+(?:\.\d+)?/);
  if (m) {
    const n = Number(m[0]);
    if (!Number.isNaN(n)) line = n;
  }
  const fieldPrices = (e.fieldOdds || []).map((o) => ({
    book: o.book,
    odds: typeof o.american === 'number' ? o.american : (typeof o.odds === 'number' ? o.odds : 0),
    line,
    url: o.url,
  })).filter(p => !!p.book && typeof p.odds === 'number');
  const impliedProbability = typeof e.winProbability === 'number' ? e.winProbability / 100 : undefined;
  const fairOdds = e.winProbability ? decimalToAmerican(1 / (e.winProbability / 100)) : e.myOdds;
  const [viewMode, setViewMode] = useState<'classic' | 'compact'>('classic');

  return {
    id: e.id,
    category: (e.evPercentage ?? 0) >= 0 ? 'ev' : 'neutral',
    event: { home, away, league: e.league || 'UNKNOWN', startTime: e.gameTime, status: e.gameStatus === 'live' ? 'live' : 'pre' },
    market: { type: e.market, side: e.prop || '', line },
    impliedProbability,
    evPercent: e.evPercentage ?? 0,
    myPrice: { odds: e.myOdds, book: 'CONSENSUS' },
    fairOdds,
    fieldPrices,
    lastUpdateMs: 0,
  } as any;
};




export default function TradingTerminal() {
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [evThreshold, setEvThreshold] = useState(0);
  const [sortBy, setSortBy] = useState<'ev' | 'time' | 'league' | 'odds' | 'hit-probability'>('ev');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedSportsbook, setSelectedSportsbook] = useState('All Books');
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>(['All Sports']);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(['All Markets']);
  const [statType, setStatType] = useState<'all' | 'over' | 'under'>('all');
  const [minOdds, setMinOdds] = useState<string>('');
  const [maxOdds, setMaxOdds] = useState<string>('');
  const [minDataPoints, setMinDataPoints] = useState<number>(3);
  const [matchTiming, setMatchTiming] = useState<'all' | 'pre-match' | 'live'>('all');
  const [showArbitrageOnly, setShowArbitrageOnly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'classic' | 'compact'>('classic');


  // Bet slip state
  const [pinnedBets, setPinnedBets] = useState<TradingTerminalEvent[]>([]);
  const [betSlipStakes, setBetSlipStakes] = useState<Record<string, number>>({});

  // Pin bet to slip
  const pinBetToSlip = (event: TradingTerminalEvent) => {
    setPinnedBets(prev => {
      if (prev.find(bet => bet.id === event.id)) {
        return prev; // Already pinned
      }
      return [...prev, event];
    });
    setBetSlipStakes(prev => ({
      ...prev,
      [event.id]: 50 // Default stake
    }));
  };

  // Remove bet from slip
  const removeBetFromSlip = (eventId: string) => {
    setPinnedBets(prev => prev.filter(bet => bet.id !== eventId));
    setBetSlipStakes(prev => {
      const newStakes = { ...prev };
      delete newStakes[eventId];
      return newStakes;
    });
  };

  // Update stake for a bet
  const updateBetStake = (eventId: string, stake: number) => {
    setBetSlipStakes(prev => ({
      ...prev,
      [eventId]: stake
    }));
  };

  // Reset all filters function
  const resetAllFilters = () => {
    setSelectedLeagues(['All Sports']);
    setSelectedMarkets(['All Markets']);
    setSearchQuery('');
    setEvThreshold(0);
    setStatType('all');
    setMinOdds('');
    setMaxOdds('');
    setMinDataPoints(3);
    setMatchTiming('all');
    setSelectedSportsbook('All Books');
    setSortBy('ev');
    setSortOrder('desc');
    setShowArbitrageOnly(false);
  };

  // EV Calculator saved bets + active tab
  type SavedBet = CalcSavedBet;
  const [savedBets, setSavedBets] = useState<SavedBet[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'arbitrage' | 'calculator' | 'odds' | 'launch'>('live');

  const addSavedBet = (evt: TradingTerminalEvent) => {


    // Normalize and choose proper decimal odds using utils
    const toDecimal = (fo?: { american?: number; european?: number; odds?: number }): number | undefined => {
      if (!fo) return undefined;
      if (typeof fo.european === 'number') return fo.european;
      if (typeof fo.american === 'number') return americanToDecimal(fo.american);
      if (typeof fo.odds === 'number') {
        const val = fo.odds;
        return (val > 0 && val < 100) ? val : americanToDecimal(val);
      }
      return undefined;
    };

    let bestDecimal: number | undefined;
    let bestBook: string | undefined;
    try {
      if (Array.isArray(evt.fieldOdds) && evt.fieldOdds.length > 0) {
        const best = findBestOdds(evt.fieldOdds as any);
        bestDecimal = best?.odds;
        bestBook = (best as any)?.book;
      }
    } catch (error) {
      console.error('🔍 [TRADING TERMINAL] Error processing fieldOdds:', error);
    }

    const myField = Array.isArray(evt.fieldOdds) && selectedSportsbook !== 'All Books' ? evt.fieldOdds.find((fo: any) => fo.book === selectedSportsbook) : undefined;
    const myDecimal = toDecimal(myField) ?? (typeof evt.myOddsEuropean === 'number' ? evt.myOddsEuropean : undefined) ?? bestDecimal;
    const book = myField?.book || bestBook || (selectedSportsbook !== 'All Books' ? selectedSportsbook : 'FanDuel');

    // Create a normalized saved bet object (decimalOdds must be true decimal)
    const finalDecimal = typeof myDecimal === 'number' ? myDecimal : (typeof bestDecimal === 'number' ? bestDecimal : 2.0);
    const saved: SavedBet = {
      id: `${evt.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: evt.event || 'Unknown Event',
      league: evt.league || 'Unknown League',
      prop: evt.prop || 'Unknown Prop',
      market: evt.market || 'Unknown Market',
      selection: evt.prop || 'Unknown Selection',
      book: book || 'Unknown Book',
      decimalOdds: finalDecimal,
      americanOdds: decimalToAmerican(finalDecimal),
      evPercent: evt.evPercentage || 0,
      gameStatus: evt.gameStatus,
      gameTime: evt.gameTime,
      winProbability: evt.winProbability,
      myOddsEuropean: evt.myOddsEuropean,
      fieldOdds: evt.fieldOdds || [],
      // Excitement metrics snapshot
      points: evt.points,
      highPoints: evt.highPoints,
      pointsLevel: evt.pointsLevel,
      rationale: evt.rationale,
      headline: evt.headline,
      // Betting splits snapshot
      betsPercentage: evt.betsPercentage,
      handlePercentage: evt.handlePercentage
    };

    setSavedBets(prev => [saved, ...prev]);
    setActiveTab('calculator');
  };



  // Primary book selection from context
  const { primaryBook, setPrimaryBook } = useBookSelection();




  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch trading terminal data
  const {
    data: tradingData = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/trading-terminal/data', selectedLeagues],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Add sport filters if specific leagues are selected
      if (selectedLeagues.length > 0 && !selectedLeagues.includes('All Sports')) {
        selectedLeagues.forEach(league => {
          if (league !== 'All Sports') {
            params.append('sport', league.toLowerCase());
          }
        });
      }

      const response = await fetch(`/api/trading-terminal/data?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch trading data: ${response.status} - ${errorText}`);
      }
      const result = await response.json();

      // Validate response structure
      if (!result.success) {
        throw new Error(result.error || 'API returned unsuccessful response');
      }

      // Extract events array from API response
      const events = result.events || [];

      // Enhance the data with additional calculations
      const enhancedEvents = events.map((event: TradingTerminalEvent) => {
        const enhanced = enhanceEventData(event);
        // Improve league detection
        enhanced.league = improveLeagueDetection(enhanced);
        return enhanced;
      });


      return enhancedEvents;
    },
    refetchInterval: isPaused ? false : 30000,
    staleTime: 25000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Fetch trading terminal stats
  const { data: stats } = useQuery({
    queryKey: ['/api/trading-terminal/stats'],
    queryFn: async () => {
      const response = await fetch('/api/trading-terminal/stats');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch stats: ${response.status} - ${errorText}`);
      }
      const result = await response.json();

      // Validate response structure
      if (!result.success) {
        throw new Error(result.error || 'Stats API returned unsuccessful response');
      }

      return result.stats || {};
    },
    refetchInterval: isPaused ? false : 60000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000)
  });

  // Get all available sportsbooks from the trading data
  const allAvailableBooks = useMemo(() => {
    const booksSet = new Set<string>();
    if (tradingData && Array.isArray(tradingData)) {
      tradingData.forEach(event => {
        if (event.fieldOdds && Array.isArray(event.fieldOdds)) {
          event.fieldOdds.forEach((odds: any) => {
            if (odds.book) {
              booksSet.add(normalizeBookName(odds.book));
            }
          });
        }
      });
    }
    const allBooks = Array.from(booksSet);
    // Order them with primary book first, then the rest alphabetically
    const primary = normalizeBookName(primaryBook);
    return [primary, ...allBooks.filter(book => book !== primary).sort()];
  }, [tradingData, primaryBook]);


  // Options for My Sportsbook select (normalized)
  const bookOptions = useMemo(() => {
    const unique = Array.from(new Set(allAvailableBooks.map(b => normalizeBookName(b))));
    const defaults = ['FanDuel','DraftKings','BetMGM','Caesars','BetRivers','Bet365','ESPN BET','Fanatics','Unibet','William Hill','Betway','Bovada','BetOnline','Hard Rock'];
    const merged = [...unique];
    defaults.forEach(d => { if (!merged.includes(d)) merged.push(d); });
    return merged;
  }, [allAvailableBooks]);
  // Use all available books instead of just the predefined ordered books
  const orderedBooks = allAvailableBooks.length > 0 ? allAvailableBooks : getOrderedBooks(primaryBook);



  // Get count of opportunities for each sportsbook
  const sportsbookCounts = useMemo(() => {
    const safeTradingData = Array.isArray(tradingData) ? tradingData : [];
    const counts: Record<string, number> = { 'All Books': safeTradingData.length };

    bookOptions.forEach(book => {
      counts[book] = safeTradingData.filter(event =>
        Array.isArray(event.fieldOdds) &&
        event.fieldOdds.some(fo => normalizeBookName(fo.book) === normalizeBookName(book))
      ).length;
    });

    return counts;
  }, [tradingData, bookOptions]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    // Ensure tradingData is an array
    const safeTradingData = Array.isArray(tradingData) ? tradingData : [];
    let filtered = safeTradingData.filter((event: TradingTerminalEvent) => {
      // Multi-select League filter
      if (!selectedLeagues.includes('All Sports')) {
        const normalizedLeague = normalizeSportName(event.league);
        if (!selectedLeagues.includes(normalizedLeague)) return false;
      }

      // Multi-select Market filter
      if (!selectedMarkets.includes('All Markets')) {
        if (!selectedMarkets.includes(event.market)) return false;
      }

      // Search query filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        if (!event.event.toLowerCase().includes(searchLower) &&
            !event.prop.toLowerCase().includes(searchLower) &&
            !event.league.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Stat Type filter (Over/Under)
      if (statType !== 'all') {
        const propLower = event.prop.toLowerCase();
        if (statType === 'over' && !propLower.includes('over') && !propLower.includes('o ')) return false;
        if (statType === 'under' && !propLower.includes('under') && !propLower.includes('u ')) return false;
      }

      // Odds Range filter
      if (minOdds || maxOdds) {
        const bestOdds = findBestOdds(event.fieldOdds);
        if (bestOdds) {
          const americanOdds = (bestOdds as any).american || decimalToAmerican(toDecimalOdds(bestOdds as any) || 2.0);
          if (minOdds && americanOdds < parseInt(minOdds)) return false;
          if (maxOdds && americanOdds > parseInt(maxOdds)) return false;
        }
      }

      // Minimum Data Points filter - count books that agree on the same line/number
      if (minDataPoints > 1 && event.fieldOdds && event.fieldOdds.length > 0) {
        // Helper functions for grouping quotes by "same number"
        const roundToStep = (x: number, step: number) => Math.round(x / step) * step;
        const bucketAmerican = (american: number, tick = 5) => Math.round(american / tick) * tick;

        // Determine market type and line step
        const marketType = event.market?.toUpperCase() || 'UNKNOWN';
        const isMoneyline = marketType.includes('MONEYLINE') || marketType.includes('ML');
        const isSpread = marketType.includes('SPREAD') || marketType.includes('POINT');
        const isTotal = marketType.includes('TOTAL') || marketType.includes('O/U') || marketType.includes('OVER/UNDER');
        const isProp = !isMoneyline && !isSpread && !isTotal;

        // Extract line from prop if available
        const propLine = event.prop ? parseFloat(event.prop.match(/[\d.]+/)?.[0] || '0') : null;

        // Group books by normalized line + odds bucket
        const lineGroups = new Map<string, Set<string>>();

        event.fieldOdds.forEach(odds => {
          if (!odds.book) return;

          // Normalize book name to parent operator
          const parentBook = normalizeBookName(odds.book);

          // Determine the line value
          let line: number | null = null;
          if (isSpread || isTotal) {
            // For spread/total, use 0.5 step rounding
            line = propLine ? roundToStep(propLine, 0.5) : null;
          } else if (isProp) {
            // For props, use 0.5 step rounding
            line = propLine ? roundToStep(propLine, 0.5) : null;
          }
          // For moneyline, line stays null

          // Get American odds
          const americanOdds = odds.american ||
                              (odds.european ? decimalToAmerican(odds.european) :
                               (odds.odds ? decimalToAmerican(odds.odds) : 0));

          // Create grouping key
          const linePart = line !== null ? String(line) : 'NA';
          const oddsPart = isMoneyline ? String(bucketAmerican(americanOdds, 5)) : 'oddsNA';
          const groupKey = `${event.id}|${marketType}|${linePart}|${oddsPart}`;

          // Add book to group
          if (!lineGroups.has(groupKey)) {
            lineGroups.set(groupKey, new Set());
          }
          lineGroups.get(groupKey)!.add(parentBook);
        });

        // Check if any group has enough books
        const maxGroupSize = Math.max(...Array.from(lineGroups.values()).map(books => books.size));
        if (maxGroupSize < minDataPoints) return false;
      }

      // Match Timing filter
      if (matchTiming !== 'all') {
        const gameTime = new Date(event.gameTime);
        const now = new Date();
        const isLive = gameTime <= now;

        if (matchTiming === 'pre-match' && isLive) return false;
        if (matchTiming === 'live' && !isLive) return false;
      }

      // EV threshold filter
      if (event.evPercentage < evThreshold) return false;

      // Arbitrage filter
      if (showArbitrageOnly && !event.isArbitrage) return false;

      // My Sportsbook filter — only show events priced at selected book
      if (selectedSportsbook && selectedSportsbook !== 'All Books' && !event.fieldOdds.some(fo => fo.book === selectedSportsbook)) return false;

      return true;
    });

    // Apply normalized My Sportsbook filter post hoc to handle alias mismatches
    if (selectedSportsbook && selectedSportsbook !== 'All Books') {
      filtered = filtered.filter((ev: TradingTerminalEvent) =>
        Array.isArray(ev.fieldOdds) && ev.fieldOdds.some(fo => normalizeBookName(fo.book) === normalizeBookName(selectedSportsbook))
      );
    }


    // Sort data
    filtered.sort((a: TradingTerminalEvent, b: TradingTerminalEvent) => {
      let comparison = 0;

      switch (sortBy) {
        case 'ev':
          comparison = a.evPercentage - b.evPercentage;
          break;
        case 'time':
          comparison = new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime();
          break;
        case 'league':
          comparison = a.league.localeCompare(b.league);
          break;
        case 'odds':
          const bestA = findBestOdds(a.fieldOdds);
          const bestB = findBestOdds(b.fieldOdds);
          const oddsA = bestA ? ((bestA as any).american || decimalToAmerican(toDecimalOdds(bestA as any) || 2.0)) : 0;
          const oddsB = bestB ? ((bestB as any).american || decimalToAmerican(toDecimalOdds(bestB as any) || 2.0)) : 0;
          comparison = oddsA - oddsB;
          break;
        case 'hit-probability':
          const probA = a.winProbability || calculateWinProbability(a.myOdds || 2.0);
          const probB = b.winProbability || calculateWinProbability(b.myOdds || 2.0);
          comparison = probA - probB;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [tradingData, selectedLeagues, selectedMarkets, searchQuery, evThreshold, sortBy, sortOrder, selectedSportsbook, statType, minOdds, maxOdds, minDataPoints, matchTiming, showArbitrageOnly]);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-in-out;
          }
          .animate-shimmer {
            background: linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent);
            background-size: 200% 100%;
            animation: shimmer 2s infinite;
          }
        `
      }} />
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0a0a0a] dark:to-[#121212] text-gray-900 dark:text-white font-sans tracking-wide transition-colors duration-300">

      {/* NAVIGATION BAR */}
      <div className="bg-white/90 dark:bg-black/70 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-md transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-500 dark:text-green-400" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">Sharp Shot</span>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1">
              <Button
                variant={activeTab === 'live' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('live')}
                className="text-sm font-medium"
              >
                +EV
              </Button>
              <Button
                variant={activeTab === 'arbitrage' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('arbitrage')}
                className="text-sm font-medium"
              >
                Arbitrage
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search teams, players, leagues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-white/50 dark:bg-black/50 border-gray-300 dark:border-gray-600"

              />
            </div>

            {/* Live Data Indicator */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></div>
              <span>LIVE</span>
            </div>

            {/* Time */}
            <div className="text-sm text-gray-400 font-mono">
              {currentTime.toLocaleTimeString('en-US', {
                hour12: true,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'America/New_York'
              })} EST
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="text-xs px-6 py-1.5 whitespace-nowrap min-w-[120px] bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 transition-all duration-200"
            >
              {isPaused ? <Play className="h-3 w-3 mr-2" /> : <Pause className="h-3 w-3 mr-2" />}
              {isPaused ? 'RESUME' : 'PAUSE'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs px-6 py-1.5 whitespace-nowrap min-w-[120px] bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 transition-all duration-200"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              REFRESH
            </Button>
          </div>
        </div>
      </div>

      {/* PROMINENT SPORTSBOOK SELECTOR */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 border-b-2 border-blue-200 dark:border-gray-600 px-6 py-6 shadow-lg transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Select Your Main Sportsbook</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'compact' ? 'classic' : 'compact')}
              className="text-xs px-6 py-1.5 whitespace-nowrap min-w-[120px] bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 transition-all duration-200"
            >
              {viewMode === 'compact' ? 'Classic View' : 'Compact View'}
            </Button>

            <p className="text-gray-600 dark:text-gray-400 text-sm">Choose your primary betting platform to see personalized +EV opportunities</p>
          </div>

          {/* Horizontal Sportsbook Selection */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {/* All Books Option */}
            <button
              onClick={() => setSelectedSportsbook('All Books')}
              className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                selectedSportsbook === 'All Books'
                  ? 'border-blue-500 bg-blue-100 dark:bg-blue-900 shadow-lg'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-500'
              }`}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-2">
                <span className="text-white font-bold text-lg">ALL</span>
              </div>
              <span className="text-xs font-medium text-gray-900 dark:text-white">All Books</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{sportsbookCounts['All Books'] || 0} ops</span>
            </button>

            {/* Individual Sportsbooks */}
            {bookOptions.slice(0, 8).map(book => (
              <button
                key={book}
                onClick={() => setSelectedSportsbook(book)}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                  selectedSportsbook === book
                    ? 'border-green-500 bg-green-100 dark:bg-green-900 shadow-lg'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-500'
                }`}
              >
                <div className="w-12 h-12 flex items-center justify-center mb-2">
                  <SportsbookLogo sportsbook={book} size="lg" className="w-10 h-10" />
                </div>
                <span className="text-xs font-medium text-gray-900 dark:text-white">{book}</span>
                {selectedSportsbook === book ? (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Selected</span>
                ) : (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{sportsbookCounts[book] || 0} ops</span>
                )}
              </button>
            ))}

            {/* More Books Dropdown */}
            {bookOptions.length > 8 && (
              <div className="flex flex-col items-center">
                <Select value={bookOptions.includes(selectedSportsbook) && !bookOptions.slice(0, 8).includes(selectedSportsbook) ? selectedSportsbook : ""} onValueChange={setSelectedSportsbook}>
                  <SelectTrigger className="w-20 h-20 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-1">
                        <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">More</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {bookOptions.slice(8).map(book => (
                      <SelectItem key={book} value={book}>
                        <div className="flex items-center gap-2">
                          <SportsbookLogo sportsbook={book} size="sm" className="w-4 h-4" />
                          <span>{book}</span>
                          <span className="text-xs text-gray-500">({sportsbookCounts[book] || 0})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Mode Indicator & Quick Stats */}
          <div className="text-center space-y-3">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              selectedSportsbook === 'All Books'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            }`}>
              {selectedSportsbook === 'All Books' ? (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Showing {filteredAndSortedData.length} opportunities across all {bookOptions.length} integrated sportsbooks</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Showing {filteredAndSortedData.length} +EV opportunities on {selectedSportsbook} only</span>
                </>
              )}
            </div>

            {/* Quick Stats */}
            {filteredAndSortedData.length > 0 && (
              <div className="flex justify-center gap-6 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Avg EV:</span>
                  <span className={`font-bold ${
                    (filteredAndSortedData.reduce((sum, event) => sum + event.evPercentage, 0) / filteredAndSortedData.length) > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {((filteredAndSortedData.reduce((sum, event) => sum + event.evPercentage, 0) / filteredAndSortedData.length) > 0 ? '+' : '')}
                    {(filteredAndSortedData.reduce((sum, event) => sum + event.evPercentage, 0) / filteredAndSortedData.length).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Best EV:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    +{Math.max(...filteredAndSortedData.map(event => event.evPercentage)).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Live:</span>
                  <span className="font-bold text-red-500">
                    {filteredAndSortedData.filter(event => event.gameStatus === 'live').length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-white/80 dark:bg-black/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl shadow-md transition-colors duration-300">
          <div className="flex items-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Total Events:</span>
              <span className="text-white font-medium">{stats.totalEvents}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Live:</span>
              <span className="text-red-400 font-medium">{stats.liveEvents}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Upcoming:</span>
              <span className="text-blue-400 font-medium">{stats.upcomingEvents}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Avg EV:</span>
              <span className={`font-medium ${stats.avgEV > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.avgEV > 0 ? '+' : ''}{stats.avgEV}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT - Show different content based on active tab */}
      {activeTab === 'live' && (
        <>
          {/* FILTERS */}
          <div className="bg-white/85 dark:bg-black/60 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-4 shadow-md transition-colors duration-300">
        {/* Filter Row 1: Leagues | Markets | Bet Type | Odds Range */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          {/* Leagues */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Leagues</label>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_LEAGUES.slice(0, 6).map(league => (
                <Button
                  key={league}
                  size="sm"
                  variant={selectedLeagues.includes(league) ? "default" : "outline"}
                  onClick={() => {
                    if (selectedLeagues.includes(league)) {
                      setSelectedLeagues(prev => prev.filter(l => l !== league));
                    } else {
                      setSelectedLeagues(prev => [...prev.filter(l => l !== 'All Sports'), league]);
                    }
                  }}
                  className="text-xs h-7 px-2"
                >
                  {league.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Markets */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Markets</label>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_MARKETS.slice(0, 4).map(market => (
                <Button
                  key={market}
                  size="sm"
                  variant={selectedMarkets.includes(market) ? "default" : "outline"}
                  onClick={() => {
                    if (selectedMarkets.includes(market)) {
                      setSelectedMarkets(prev => prev.filter(m => m !== market));
                    } else {
                      setSelectedMarkets(prev => [...prev.filter(m => m !== 'All Markets'), market]);
                    }
                  }}
                  className="text-xs h-7 px-2"
                >
                  {market}
                </Button>
              ))}
            </div>
          </div>

          {/* Bet Type */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Bet Type</label>
            <div className="flex gap-1">
              {(['all', 'over', 'under'] as const).map(type => (
                <Button
                  key={type}
                  size="sm"
                  variant={statType === type ? "default" : "outline"}
                  onClick={() => setStatType(type)}
                  className="text-xs h-7 px-3 capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Odds Range */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Odds Range</label>
            <div className="flex gap-2">
              <Input
                placeholder="Min"
                value={minOdds}
                onChange={(e) => setMinOdds(e.target.value)}
                className="h-7 text-xs"
              />
              <Input
                placeholder="Max"
                value={maxOdds}
                onChange={(e) => setMaxOdds(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Filter Row 2: Min Data Points | Timing | Line Discrepancies | Sort by */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          {/* Min Data Points */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block" title="Only show markets where at least N sportsbooks post the same line. Increase N to reduce outliers; decrease N to see more niche markets.">
              Min Data Points
            </label>
            <Select value={minDataPoints.toString()} onValueChange={(value) => setMinDataPoints(parseInt(value))}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 book (show all)</SelectItem>
                <SelectItem value="2">2 books (permissive)</SelectItem>
                <SelectItem value="3">3 books (good default)</SelectItem>
                <SelectItem value="5">5 books (strict)</SelectItem>
                <SelectItem value="10">10 books (very strict)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timing */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Timing</label>
            <div className="flex gap-1">
              {(['all', 'pre-match', 'live'] as const).map(timing => (
                <Button
                  key={timing}
                  size="sm"
                  variant={matchTiming === timing ? "default" : "outline"}
                  onClick={() => setMatchTiming(timing)}
                  className="text-xs h-7 px-2 capitalize"
                >
                  {timing === 'pre-match' ? 'Pre' : timing}
                </Button>
              ))}
            </div>
          </div>

          {/* Line Discrepancies */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Line Discrepancies</label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="line-discrepancies"
                checked={false}
                onCheckedChange={() => {}}
              />
              <label htmlFor="line-discrepancies" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                Show only line discrepancies
              </label>
            </div>
          </div>

          {/* Sort by */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Sort by</label>
            <div className="flex gap-1">
              <Select value={sortBy} onValueChange={(value: 'ev' | 'time' | 'league' | 'odds' | 'hit-probability') => setSortBy(value)}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ev">EV%</SelectItem>
                  <SelectItem value="hit-probability">% to Hit</SelectItem>
                  <SelectItem value="odds">Odds</SelectItem>
                  <SelectItem value="time">Game Time</SelectItem>
                  <SelectItem value="league">League</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-7 w-7 p-0"
              >

                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Row 3: Reset Filters */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={resetAllFilters}
              className="text-xs h-7 px-4"
            >
              Reset Filters
            </Button>
            <div className="flex items-center gap-2">
              <Checkbox
                id="arbitrage-only"
                checked={showArbitrageOnly}
                onCheckedChange={setShowArbitrageOnly}
                className="h-4 w-4"
              />
              <label htmlFor="arbitrage-only" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                🔥 Arbitrage Only
              </label>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Showing {filteredAndSortedData.length} opportunities
              {showArbitrageOnly && ` (${filteredAndSortedData.filter(e => e.isArbitrage).length} arbitrage)`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">EV Threshold:</label>
            <div className="w-32">
              <Slider
                value={[evThreshold]}
                onValueChange={(value) => setEvThreshold(value[0])}
                max={20}
                min={-20}
                step={1}
                className="w-full"
              />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px]">{evThreshold}%</span>
          </div>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="flex-1 flex gap-4 p-4">
        {/* Left side - Main Table */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-400">Loading trading data...</span>

              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 mb-2">Failed to load trading data</p>
                <p className="text-gray-400 text-sm">{error.message}</p>
                <Button onClick={() => refetch()} className="mt-4">
                  Try Again
                </Button>
              </div>
            </div>
          ) : filteredAndSortedData.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No opportunities found</p>
                <p className="text-gray-500 text-sm">Try adjusting your filters or search terms</p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)] rounded-xl shadow-md">
                <table className="w-full text-xs min-w-[1200px]">
                  {/* Table Header */}
                  <thead className="sticky top-0 backdrop-blur-md bg-white/90 dark:bg-black/70 z-10 transition-colors duration-300">
                    <tr className="border-b border-gray-300 dark:border-gray-600">
                      <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide min-w-[180px]">EVENT</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide min-w-[140px]">MARKET</th>
                      <th className="text-center px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide min-w-[80px]">SHARP SHOT PROJECTION</th>
                      <th className="text-center px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide min-w-[60px]">% ODDS TO HIT</th>
                      <th className="text-center px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide min-w-[60px]">EV%</th>
                      {orderedBooks.map((book) => (
                        <th key={book} className={`text-center px-1 py-2 text-xs font-bold uppercase tracking-wide min-w-[40px] ${book === normalizeBookName(primaryBook) ? 'text-yellow-600 dark:text-yellow-300 ring-1 ring-yellow-500 rounded' : 'text-gray-700 dark:text-gray-300'}`}>
                          <div className="flex flex-col items-center gap-0.5">
                            <SportsbookLogo sportsbook={book} size="sm" className="w-5 h-5" />
                            <span className="text-[6px] text-gray-400 hidden xl:inline">
                              {BOOK_DISPLAY_NAMES[book]}
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="text-center px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide min-w-[80px]">ACTIONS</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody>
                    {filteredAndSortedData.map((event: TradingTerminalEvent, index) => (
                      <tr key={event.id} className={`border-b border-gray-200 dark:border-gray-700/50 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] dark:hover:shadow-[0_0_10px_rgba(255,215,0,0.3)] animate-fadeIn ${index % 2 === 0 ? 'bg-white/50 dark:bg-black/20' : 'bg-gray-50/50 dark:bg-black/40'}`}>

                        {/* 1. EVENT - Matchup, league, kickoff time (live), optional team logos */}
                        <td className="px-3 py-2 min-w-[180px]">
                          <div className="text-gray-900 dark:text-white text-sm font-medium">
                            {event.event}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                            {event.league}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                event.gameStatus === 'live' ? 'bg-red-600 text-white animate-pulse' :
                                event.gameStatus === 'upcoming' ? 'bg-blue-600 text-white' :
                                event.gameStatus === 'final' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                              }`}>
                                {String(event.gameStatus).toUpperCase()}
                            </span>
                            {event.gameTime && event.gameStatus === 'upcoming' && (
                              <span className="text-gray-400 text-xs">
                                {formatTimeUntilGame(event.gameTime)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. MARKET - Bet description */}
                        <td className="px-3 py-2 min-w-[140px]">
                          <div className="text-gray-900 dark:text-white text-sm font-medium">
                            {generatePropLabel(event.prop, event.market)}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                            {event.market}
                          </div>
                        </td>

                        {/* 3. SHARP SHOT PROJECTION - Fair line / probability projection */}
                        <td className="px-3 py-2 text-center min-w-[80px]">
                          <div className="text-gray-900 dark:text-white text-sm font-medium">
                            {event.fairLine || 'N/A'}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 text-xs">
                            Fair Line
                          </div>
                          {event.isArbitrage && (
                            <div className="text-xs text-green-600 dark:text-green-400 font-bold mt-1">
                              🔥 ARB: {event.arbitrageProfit?.toFixed(1)}%
                            </div>
                          )}
                        </td>

                        {/* 4. % ODDS TO HIT - Calculation only — no green highlight */}
                        <td className="px-3 py-2 text-center min-w-[60px]">
                          <div className="text-gray-900 dark:text-white text-sm font-medium">
                            {event.winProbability || calculateWinProbability(event.myOdds || 2.0)}%
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 text-xs">
                            Hit Prob
                          </div>
                        </td>

                        {/* 5. EV% - Core metric with color fade bar */}
                        <td className="px-3 py-2 text-center min-w-[60px]">
                          <div className="relative">
                            {/* Background color fade bar */}
                            <div
                              className="absolute inset-0 rounded-md opacity-20"
                              style={{
                                background: event.evPercentage > 0
                                  ? `linear-gradient(90deg, transparent 0%, rgba(34, 197, 94, ${Math.min(event.evPercentage / 20, 1)}) 100%)`
                                  : `linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, ${Math.min(Math.abs(event.evPercentage) / 20, 1)}) 100%)`
                              }}
                            />
                            <div className="relative z-10 py-2">
                              <div className={`text-sm font-bold ${
                                event.evPercentage > 0 ? 'text-green-600 dark:text-green-400' :
                                event.evPercentage < 0 ? 'text-red-600 dark:text-red-400' :
                                'text-gray-600 dark:text-gray-400'
                              }`}>
                                {event.evPercentage > 0 ? '+' : ''}{event.evPercentage.toFixed(1)}%
                              </div>
                              <div className="text-gray-600 dark:text-gray-400 text-xs">
                                EV
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 6. SPORTSBOOK ODDS - Odds across books with best price highlighted */}
                        {orderedBooks.map((book) => {
                          const bookOdds = event.fieldOdds.find(fo => normalizeBookName(fo.book) === book);
                          const best = findBestOdds(event.fieldOdds);
                          const bestBookNorm = best ? normalizeBookName((best as any).book) : undefined;
                          const dec = toDecimalOdds(bookOdds as any);
                          const am = typeof (bookOdds as any)?.american === 'number' ? (bookOdds as any).american : (typeof dec === 'number' ? decimalToAmerican(dec) : undefined);
                          const isBestOdds = bestBookNorm ? (book === bestBookNorm) : false;

                          return (
                            <td key={book} className="px-1 py-2 text-center min-w-[40px]">
                              {bookOdds ? (
                                <button
                                  onClick={() => window.open((bookOdds as any).url || '#', '_blank', 'noopener,noreferrer')}
                                  className={`${
                                    isBestOdds
                                      ? 'bg-green-600 hover:bg-green-500 shadow-lg border-2 border-green-400 font-bold'
                                      : 'bg-gray-200 dark:bg-gray-800/80 hover:bg-gray-300 dark:hover:bg-gray-700'
                                  } ${book === normalizeBookName(primaryBook) ? 'ring-1 ring-yellow-500' : ''} text-gray-900 dark:text-white px-2 py-1.5 rounded-md text-xs transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer min-w-[50px] shadow-md`}
                                  title={`Bet on ${book} - ${formatOddsDisplay(am as any, undefined, (dec as any) || 0)}${isBestOdds ? ' - BEST ODDS!' : ''}`}
                                >
                                  <div className="text-xs font-bold">{formatOddsDisplay(am as any, undefined, (dec as any) || 0)}</div>

                                  {isBestOdds && <div className="text-[6px] text-green-200 font-bold">★ BEST</div>}
                                </button>
                              ) : (
                                <div className="text-gray-600 text-xs">-</div>
                              )}
                            </td>
                          );
                        })}

                        {/* 7. ACTIONS - Pin to slip, Save to preset, Share link */}
                        <td className="px-3 py-2 text-center min-w-[80px]">
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-[10px] px-2 py-1 whitespace-nowrap bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-700 transition-all duration-200"
                              onClick={() => addSavedBet(event)}
                            >
                              Save to Calc
                            </Button>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[8px] px-1 py-0.5 h-6"
                                title="Pin to slip"
                                onClick={() => pinBetToSlip(event)}
                              >
                                📌
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[8px] px-1 py-0.5 h-6"
                                title="Save to preset"
                              >
                                💾
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[8px] px-1 py-0.5 h-6"
                                title="Share link"
                              >
                                🔗
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Right side - BET SLIP */}
        <div className="w-80 bg-white/90 dark:bg-black/70 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Bet Slip</h3>
            <Badge variant="secondary" className="text-xs">
              {pinnedBets.length} bet{pinnedBets.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {pinnedBets.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-sm">No pinned bets</div>
              <div className="text-gray-500 text-xs mt-1">Click 📌 to pin bets here</div>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pinnedBets.map((bet) => {
                const bestOdds = findBestOdds(bet.fieldOdds);
                const decimal = bestOdds ? toDecimalOdds(bestOdds as any) : bet.myOdds;
                const american = decimal ? decimalToAmerican(decimal) : 'N/A';
                const stake = betSlipStakes[bet.id] || 50;
                const kellyPercent = bet.winProbability ? (bet.winProbability / 100 * decimal - (1 - bet.winProbability / 100)) / (decimal - 1) * 100 : 0;
                const suggestedStake = Math.max(1, Math.round(kellyPercent * 10)); // Kelly * $10 per %

                return (
                  <Card key={bet.id} className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {generatePropLabel(bet.prop, bet.market)}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {bet.event}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBetFromSlip(bet.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                        >
                          ×
                        </Button>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Odds: </span>
                          <span className="font-medium">{typeof american === 'string' ? american : formatOddsDisplay(undefined, undefined, decimal as any)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">EV: </span>
                          <span className={`font-medium ${bet.evPercentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {bet.evPercentage > 0 ? '+' : ''}{bet.evPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600 dark:text-gray-400">Stake:</label>
                          <Input
                            type="number"
                            value={stake}
                            onChange={(e) => updateBetStake(bet.id, parseInt(e.target.value) || 0)}
                            className="h-7 text-xs flex-1"
                            min="1"
                          />
                          <span className="text-xs text-gray-500">Suggested: ${suggestedStake}</span>
                        </div>

                        <Button
                          className="w-full h-8 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            const bestBook = bestOdds ? (bestOdds as any).book : 'FanDuel';
                            const url = bestOdds ? (bestOdds as any).url : '#';
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          Place Bet → {bestOdds ? normalizeBookName((bestOdds as any).book) : 'Sportsbook'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {pinnedBets.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Stake:</span>
                <span className="font-medium">${Object.values(betSlipStakes).reduce((sum, stake) => sum + stake, 0)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600 dark:text-gray-400">Potential Profit:</span>
                <span className="font-medium text-green-600">
                  ${pinnedBets.reduce((total, bet) => {
                    const stake = betSlipStakes[bet.id] || 50;
                    const bestOdds = findBestOdds(bet.fieldOdds);
                    const decimal = bestOdds ? toDecimalOdds(bestOdds as any) : bet.myOdds;
                    return total + (stake * (decimal - 1));
                  }, 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

        </>
      )}

      {/* ARBITRAGE TAB CONTENT */}
      {activeTab === 'arbitrage' && (
        <>
          {/* ARBITRAGE FILTERS */}
          <div className="bg-white/85 dark:bg-black/60 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-4 shadow-md transition-colors duration-300">
            {/* Filter Row 1: Leagues | Market Types | Period Types | Odds Range */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              {/* Leagues */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Leagues</label>
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_LEAGUES.slice(0, 6).map(league => (
                    <Button
                      key={league}
                      size="sm"
                      variant={selectedLeagues.includes(league) ? "default" : "outline"}
                      onClick={() => {
                        if (selectedLeagues.includes(league)) {
                          setSelectedLeagues(prev => prev.filter(l => l !== league));
                        } else {
                          setSelectedLeagues(prev => [...prev.filter(l => l !== 'All Sports'), league]);
                        }
                      }}
                      className="text-xs h-7 px-2"
                    >
                      {league.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Market Types */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Market Types</label>
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_MARKETS.slice(0, 4).map(market => (
                    <Button
                      key={market}
                      size="sm"
                      variant={selectedMarkets.includes(market) ? "default" : "outline"}
                      onClick={() => {
                        if (selectedMarkets.includes(market)) {
                          setSelectedMarkets(prev => prev.filter(m => m !== market));
                        } else {
                          setSelectedMarkets(prev => [...prev.filter(m => m !== 'All Markets'), market]);
                        }
                      }}
                      className="text-xs h-7 px-2"
                    >
                      {market}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Period Types */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Period Types</label>
                <Select value={matchTiming} onValueChange={(value: 'all' | 'pre-match' | 'live') => setMatchTiming(value)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Periods</SelectItem>
                    <SelectItem value="pre-match">Full Game</SelectItem>
                    <SelectItem value="live">Live/Half</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Odds Range */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Odds Range</label>
                <div className="flex gap-1">
                  <Input
                    placeholder="Min"
                    value={minOdds}
                    onChange={(e) => setMinOdds(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Input
                    placeholder="Max"
                    value={maxOdds}
                    onChange={(e) => setMaxOdds(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Filter Row 2: Min/Max Arb % | Hours Away | Min Liquidity | Stability */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              {/* Min/Max Arb % */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Arb % Range</label>
                <div className="flex gap-1">
                  <Input
                    placeholder="Min %"
                    value={evThreshold}
                    onChange={(e) => setEvThreshold(parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs"
                    type="number"
                    step="0.1"
                  />
                  <Input
                    placeholder="Max %"
                    className="h-7 text-xs"
                    type="number"
                    step="0.1"
                  />
                </div>
              </div>

              {/* Hours Away */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Hours Away</label>
                <Select defaultValue="all">
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Times</SelectItem>
                    <SelectItem value="1">Within 1 hour</SelectItem>
                    <SelectItem value="6">Within 6 hours</SelectItem>
                    <SelectItem value="24">Within 24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Min Liquidity */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Min Liquidity</label>
                <Select value={minDataPoints.toString()} onValueChange={(value) => setMinDataPoints(parseInt(value))}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 books</SelectItem>
                    <SelectItem value="3">3 books</SelectItem>
                    <SelectItem value="5">5 books</SelectItem>
                    <SelectItem value="10">10 books</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stability */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Stability</label>
                <Select defaultValue="all">
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="stable">Stable (5+ min)</SelectItem>
                    <SelectItem value="fresh">Fresh (&lt; 2 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Row 3: Timing | Sort by | Reset */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={resetAllFilters}
                  className="text-xs h-7 px-4"
                >
                  Reset Filters
                </Button>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="arbitrage-only"
                    checked={true}
                    disabled
                  />
                  <label htmlFor="arbitrage-only" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    🔥 Arbitrage Only (Always On)
                  </label>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Showing {filteredAndSortedData.filter(e => e.isArbitrage).length} arbitrage opportunities
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Sort by:</label>
                <Select value={sortBy} onValueChange={(value: 'ev' | 'time' | 'league' | 'odds' | 'hit-probability') => setSortBy(value)}>
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ev">Arb %</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="league">League</SelectItem>
                    <SelectItem value="odds">Odds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* MAIN ARBITRAGE TABLE */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading arbitrage opportunities...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-400 mb-2">Failed to load arbitrage data</p>
                  <p className="text-gray-400 text-sm">{error.message}</p>
                  <Button onClick={() => refetch()} className="mt-4">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : filteredAndSortedData.filter(event => event.isArbitrage).length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No arbitrage opportunities found</p>
                  <p className="text-gray-500 text-sm">Try adjusting your filters or check back later</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  {/* Table Header */}
                  <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Market
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Legs
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Arb %
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody>
                    {filteredAndSortedData.filter(event => event.isArbitrage).map((event: TradingTerminalEvent, index) => {
                      // Find the two best opposing odds for arbitrage
                      const sortedOdds = [...(event.fieldOdds || [])].sort((a, b) => {
                        const aOdds = a.american || americanToDecimal(a.european || a.odds || 2.0);
                        const bOdds = b.american || americanToDecimal(b.european || b.odds || 2.0);
                        return Math.abs(bOdds) - Math.abs(aOdds);
                      });

                      const leg1 = sortedOdds[0];
                      const leg2 = sortedOdds[1];

                      if (!leg1 || !leg2) return null;

                      const leg1Odds = leg1.american || americanToDecimal(leg1.european || leg1.odds || 2.0);
                      const leg2Odds = leg2.american || americanToDecimal(leg2.european || leg2.odds || 2.0);

                      // Calculate stakes for $100 total
                      const totalStake = 100;
                      const leg1Decimal = leg1Odds > 0 ? 1 + leg1Odds/100 : 1 + 100/Math.abs(leg1Odds);
                      const leg2Decimal = leg2Odds > 0 ? 1 + leg2Odds/100 : 1 + 100/Math.abs(leg2Odds);

                      const leg1Stake = totalStake / (1 + leg1Decimal/leg2Decimal);
                      const leg2Stake = totalStake - leg1Stake;

                      return (
                        <tr key={event.id} className={`border-b border-gray-200 dark:border-gray-700/50 transition-all duration-300 hover:bg-green-50 dark:hover:bg-green-900/10 ${index % 2 === 0 ? 'bg-white/50 dark:bg-black/20' : 'bg-gray-50/50 dark:bg-black/40'}`}>

                          {/* Event */}
                          <td className="px-3 py-3 min-w-[180px]">
                            <div className="text-gray-900 dark:text-white text-sm font-medium">
                              {event.event}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                              {event.league} • {formatTimeUntilGame(event.gameTime)}
                            </div>
                          </td>

                          {/* Market */}
                          <td className="px-3 py-3 min-w-[140px]">
                            <div className="text-gray-900 dark:text-white text-sm font-medium">
                              {generatePropLabel(event.prop, event.market)}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                              {event.market}
                            </div>
                          </td>

                          {/* Legs */}
                          <td className="px-3 py-3 min-w-[280px]">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1">
                                <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
                                  [{normalizeBookName(leg1.book)}] {event.prop.includes('Over') ? 'Over' : event.prop.includes('Under') ? 'Under' : 'Side A'}
                                </span>
                                <span className="text-xs font-bold text-blue-800 dark:text-blue-200">
                                  {formatOddsDisplay(leg1Odds)} | ${leg1Stake.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
                                <span className="text-xs font-medium text-red-800 dark:text-red-200">
                                  [{normalizeBookName(leg2.book)}] {event.prop.includes('Under') ? 'Under' : event.prop.includes('Over') ? 'Over' : 'Side B'}
                                </span>
                                <span className="text-xs font-bold text-red-800 dark:text-red-200">
                                  {formatOddsDisplay(leg2Odds)} | ${leg2Stake.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Arb % */}
                          <td className="px-3 py-3">
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                +{event.arbitrageProfit?.toFixed(2)}%
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ${((event.arbitrageProfit || 0) * totalStake / 100).toFixed(2)} profit
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs px-2 py-1 h-7"
                                onClick={() => {
                                  // Pin this arbitrage opportunity
                                  const arbBet = {
                                    ...event,
                                    leg1: { book: leg1.book, odds: leg1Odds, stake: leg1Stake },
                                    leg2: { book: leg2.book, odds: leg2Odds, stake: leg2Stake },
                                    totalStake
                                  };
                                  setPinnedBets(prev => [...prev.filter(b => b.id !== event.id), arbBet]);
                                }}
                              >
                                Pin
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs px-2 py-1 h-7"
                              >
                                Share
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ARBITRAGE BET SLIP */}
          {pinnedBets.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="max-w-6xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  🔥 Pinned Arbitrage Opportunities ({pinnedBets.length})
                </h3>
                <div className="grid gap-4">
                  {pinnedBets.map((bet: any) => (
                    <div key={bet.id} className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-lg">
                            {bet.event}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {generatePropLabel(bet.prop, bet.market)} • {bet.league}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600 dark:text-green-400">
                            +{bet.arbitrageProfit?.toFixed(2)}% Profit
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ${((bet.arbitrageProfit || 0) * (bet.totalStake || 100) / 100).toFixed(2)} guaranteed
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Leg 1 */}
                        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-blue-800 dark:text-blue-200">
                              [{normalizeBookName(bet.leg1?.book || '')}] Leg 1
                            </span>
                            <span className="text-sm font-bold text-blue-800 dark:text-blue-200">
                              {formatOddsDisplay(bet.leg1?.odds || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-blue-700 dark:text-blue-300">
                              Stake Amount:
                            </span>
                            <Input
                              type="number"
                              value={bet.leg1?.stake?.toFixed(2) || '0'}
                              onChange={(e) => {
                                const newStake = parseFloat(e.target.value) || 0;
                                setPinnedBets(prev => prev.map(b =>
                                  b.id === bet.id
                                    ? { ...b, leg1: { ...b.leg1, stake: newStake } }
                                    : b
                                ));
                              }}
                              className="w-20 h-7 text-xs text-right"
                              step="0.01"
                            />
                          </div>
                        </div>

                        {/* Leg 2 */}
                        <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-red-800 dark:text-red-200">
                              [{normalizeBookName(bet.leg2?.book || '')}] Leg 2
                            </span>
                            <span className="text-sm font-bold text-red-800 dark:text-red-200">
                              {formatOddsDisplay(bet.leg2?.odds || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-red-700 dark:text-red-300">
                              Stake Amount:
                            </span>
                            <Input
                              type="number"
                              value={bet.leg2?.stake?.toFixed(2) || '0'}
                              onChange={(e) => {
                                const newStake = parseFloat(e.target.value) || 0;
                                setPinnedBets(prev => prev.map(b =>
                                  b.id === bet.id
                                    ? { ...b, leg2: { ...b.leg2, stake: newStake } }
                                    : b
                                ));
                              }}
                              className="w-20 h-7 text-xs text-right"
                              step="0.01"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Total Stake: </span>
                            <Input
                              type="number"
                              value={bet.totalStake || 100}
                              onChange={(e) => {
                                const newTotal = parseFloat(e.target.value) || 100;
                                const ratio1 = (bet.leg1?.stake || 0) / (bet.totalStake || 100);
                                const ratio2 = (bet.leg2?.stake || 0) / (bet.totalStake || 100);
                                setPinnedBets(prev => prev.map(b =>
                                  b.id === bet.id
                                    ? {
                                        ...b,
                                        totalStake: newTotal,
                                        leg1: { ...b.leg1, stake: newTotal * ratio1 },
                                        leg2: { ...b.leg2, stake: newTotal * ratio2 }
                                      }
                                    : b
                                ));
                              }}
                              className="w-20 h-7 text-xs text-center inline-block mx-1"
                              step="1"
                            />
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Arb %: </span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                              +{bet.arbitrageProfit?.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeBetFromSlip(bet.id)}
                            className="text-xs"
                          >
                            Remove
                          </Button>
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            size="sm"
                            onClick={() => {
                              if (bet.leg1?.book && bet.leg2?.book) {
                                window.open(`https://${normalizeBookName(bet.leg1.book).toLowerCase()}.com`, '_blank');
                                window.open(`https://${normalizeBookName(bet.leg2.book).toLowerCase()}.com`, '_blank');
                              }
                            }}
                          >
                            Place Bets → {normalizeBookName(bet.leg1?.book || '')} & {normalizeBookName(bet.leg2?.book || '')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Secondary Tabs (for +EV tab only) */}
      {activeTab === 'live' && (
        <Tabs value="live" className="mt-3">
        <TabsList className="flex gap-2 flex-wrap">
          <TabsTrigger value="live" className="whitespace-nowrap min-w-[200px] px-6 py-2 text-xs md:text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 transition-all duration-200">LIVE OPPORTUNITIES</TabsTrigger>
          <TabsTrigger value="calculator" className="whitespace-nowrap min-w-[200px] px-6 py-2 text-xs md:text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 transition-all duration-200">EV CALCULATOR</TabsTrigger>
          <TabsTrigger value="arbitrage" className="whitespace-nowrap min-w-[200px] px-6 py-2 text-xs md:text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 transition-all duration-200">ARBITRAGE CALC</TabsTrigger>
          <TabsTrigger value="odds" disabled className="whitespace-nowrap min-w-[200px] px-6 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-700 cursor-not-allowed">ODDS COMPARISON</TabsTrigger>
          <TabsTrigger value="launch" className="whitespace-nowrap min-w-[180px] px-6 py-2 text-xs md:text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 transition-all duration-200">LAUNCH STATUS</TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          {/* The main table is now above the tabs */}
        </TabsContent>
        <TabsContent value="calculator">
          <div className="p-4">
            <EVCalculator
              savedBets={savedBets}
              orderedBooks={orderedBooks}
              primaryBook={primaryBook}
              selectedSportsbook={selectedSportsbook}
              onRemove={(id) => setSavedBets(prev => prev.filter(b => b.id !== id))}
            />
          </div>
        </TabsContent>
        <TabsContent value="arbitrage">
          <div className="p-4">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Arbitrage Calculator</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Calculate guaranteed profit opportunities by betting on all outcomes of an event across different sportsbooks.
                </p>
              </div>

              {/* Show detected arbitrage opportunities */}
              {filteredAndSortedData.filter(event => event.isArbitrage).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    🔥 Detected Arbitrage Opportunities ({filteredAndSortedData.filter(event => event.isArbitrage).length})
                  </h3>
                  <div className="grid gap-3 max-h-64 overflow-y-auto">
                    {filteredAndSortedData.filter(event => event.isArbitrage).slice(0, 5).map((event) => (
                      <div key={event.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{event.event}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{event.prop} - {event.market}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              {event.arbitrageProfit?.toFixed(2)}% Profit
                            </div>
                            <div className="text-xs text-gray-500">
                              {event.arbitrageStakes?.book1} vs {event.arbitrageStakes?.book2}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ArbitrageCalculator />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="launch">
          <div className="p-4">
            <LaunchStatusWidget />
          </div>
        </TabsContent>
        <TabsContent value="odds">
          <div className="p-4 text-sm text-gray-400">Odds Comparison coming soon.</div>
        </TabsContent>
        </Tabs>
      )}
    </div>
    </>
  );
}