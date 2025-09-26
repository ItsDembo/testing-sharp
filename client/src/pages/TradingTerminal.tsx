import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, RefreshCw, Pause, Play, AlertCircle, Clock, Calculator } from "lucide-react";
import { FilterBar } from '../components/terminal/filters/FilterBar';
import { ActiveFilterChips } from '../components/terminal/filters/ActiveFilterChips';
import { TipCardMyBook } from '../components/terminal/filters/TipCardMyBook';
import { useTerminalFilters, TerminalFiltersState } from '../components/terminal/filters/store';
import { TerminalTable } from '../components/trading/TerminalTable';
import { BettingOpportunity } from '../../../shared/schema';
import { CategoryTabs, CategoryBadge } from '../components/CategoryTabs';
import { BetCategorizer, type BetCategory } from '../../../shared/betCategories';
import { CacheService } from '@/services/cacheService';
import LaunchStatusWidget from '../components/LaunchStatusWidget';
import { EVCalculator } from '../components/terminal/EVCalculator';
import { ArbitrageCalculator } from '../components/calculators/ArbitrageCalculator';

interface SavedBet {
  id: string;
  game: string;
  selection: string;
  market: string;
  odds: number;
  book: string;
  ev: number;
  timestamp: Date;
}
import { MiddlingCalculator } from '../components/calculators/MiddlingCalculator';
// AllProfitableCalculator removed - using canonical functions instead
import { FeatureGate } from '../components/FeatureGate';
import { ExportButton } from '../components/ExportButton';

// Available sportsbooks for filtering
const AVAILABLE_BOOKS = [
  'FanDuel', 'DraftKings', 'BetMGM', 'Caesars', 'BetRivers', 'ESPN BET', 'Fanatics',
  'Fliff', 'PrizePicks', 'Underdog', 'Bettr', 'Bet365', 'Pinnacle', 'Bovada', 'BetOnline'
];

const AVAILABLE_LEAGUES = [
  'nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab', 'soccer', 'tennis', 'golf', 'mma', 'boxing'
];

// Proper EV calculation using correct ROI formula (use RAW probability; do not clamp here)
const calculateAccurateEV = (myOdds: number, trueProbability: number): number => {
  try {
    if (myOdds === undefined || myOdds === null || isNaN(myOdds)) return NaN;
    if (trueProbability === undefined || trueProbability === null || isNaN(trueProbability)) return NaN;
    // Expect probability in [0,1]
    if (trueProbability < 0 || trueProbability > 1) return NaN;

    // Convert American odds to net payout per $1 staked
    const netPayout = myOdds > 0 ? (myOdds / 100) : (100 / Math.abs(myOdds));

    // EV formula: P(win) * net_payout - P(lose) * 1
    const ev = (trueProbability * netPayout) - (1 - trueProbability);
    return ev * 100;

  } catch (error) {
    console.warn('Error calculating EV:', error);
    return NaN;
  }
};

// Calculate no-vig probability from two-sided market (requires pair for SAME book/line/timestamp window)
const calculateNoVigProbability = (side1Odds: number, side2Odds: number): number => {
  try {
    const toImpliedProb = (americanOdds: number): number => (americanOdds > 0)
      ? 100 / (americanOdds + 100)
      : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);

    const prob1 = toImpliedProb(side1Odds);
    const prob2 = toImpliedProb(side2Odds);
    const totalProb = prob1 + prob2;
    if (totalProb <= 0) return NaN;
    return prob1 / totalProb;
  } catch (error) {
    console.warn('Error calculating no-vig probability:', error);
    return NaN;
  }
};

// Unit test functions for EV calculation
const runEVSanityChecks = () => {
  console.log('🧪 Running EV Sanity Checks...');

  // Test 1: Break-even probability should give EV ≈ 0
  const breakEvenProb = 100 / (110 + 100); // 0.47619 for +110
  const ev1 = calculateAccurateEV(110, breakEvenProb);
  console.log(`Test 1 - Break-even +110: EV = ${ev1.toFixed(2)}% (should be ≈0%)`);

  // Test 2: 60% probability at +110 should give EV ≈ +21.8%
  const ev2 = calculateAccurateEV(110, 0.60);
  console.log(`Test 2 - 60% at +110: EV = ${ev2.toFixed(1)}% (should be ≈21.8%)`);

  // Test 3: 54% probability at +110 should give EV ≈ +13.4%
  const ev3 = calculateAccurateEV(110, 0.54);
  console.log(`Test 3 - 54% at +110: EV = ${ev3.toFixed(1)}% (should be ≈13.4%)`);

  // Test 4: Negative odds test
  const ev4 = calculateAccurateEV(-110, 0.60);
  console.log(`Test 4 - 60% at -110: EV = ${ev4.toFixed(1)}% (should be ≈9.1%)`);
};

// Run tests in development
if (process.env.NODE_ENV === 'development') {
  runEVSanityChecks();
}

// Add test function to window for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testEV = (odds: number, prob: number) => {
    const result = calculateAccurateEV(odds, prob);
    console.log(`Test: ${(prob * 100).toFixed(1)}% at ${odds > 0 ? '+' : ''}${odds} = ${result.toFixed(2)}% EV`);
    return result;
  };

  (window as any).testNoVig = (odds1: number, odds2: number) => {
    const result = calculateNoVigProbability(odds1, odds2);
    console.log(`No-vig: ${odds1 > 0 ? '+' : ''}${odds1} vs ${odds2 > 0 ? '+' : ''}${odds2} = ${(result * 100).toFixed(1)}%`);
    return result;
  };
}

// Apply comprehensive filter system
const applyFilters = (opportunities: BettingOpportunity[], filters: TerminalFiltersState): BettingOpportunity[] => {
  return opportunities.filter(opp => {
    // League filter
    if (filters.leagues.length > 0) {
      const league = opp.event?.sport || opp.sport || opp.league || '';
      const normalizedLeague = league.toUpperCase();
      if (!filters.leagues.some(selected => normalizedLeague === selected.toUpperCase())) {
        return false;
      }
    }

    // Market filter
    if (filters.markets.length > 0) {
      const market = opp.market?.type || '';
      if (!filters.markets.includes(market)) {
        return false;
      }
    }
    
    // Prop type filter
    if (filters.propTypes.length > 0) {
      const propType = opp.propType || '';
      if (!filters.propTypes.some(selected => propType.toLowerCase().includes(selected.toLowerCase()))) {
        return false;
      }
    }
    
    // O/U mode filter
    if (filters.ouMode !== 'all') {
      const side = opp.market?.side || opp.bet || '';
      if (filters.ouMode === 'over' && !side.toLowerCase().includes('over')) {
        return false;
      }
      if (filters.ouMode === 'under' && !side.toLowerCase().includes('under')) {
        return false;
      }
    }
    
    // Timing filter (live/prematch)
    if (filters.timing !== 'all') {
      const status = opp.event?.status || 'prematch';
      if (filters.timing === 'live' && status !== 'live') {
        return false;
      }
      if (filters.timing === 'prematch' && status === 'live') {
        return false;
      }
    }
    
    // Odds range filter
    const odds = opp.myPrice?.odds || 0;
    if (odds < filters.oddsMin || odds > filters.oddsMax) {
      return false;
    }
    
    // EV threshold filter
    const ev = opp.evPercent || opp.ev || 0;
    if (ev < filters.evThreshold) {
      return false;
    }
    
    // Search query filter
    if (filters.query.length > 0) {
      const searchText = [
        opp.event?.home,
        opp.event?.away,
        opp.game,
        opp.market?.type,
        opp.bet,
        opp.playerName,
        opp.propDescription
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchText.includes(filters.query.toLowerCase())) {
        return false;
      }
    }
    
    // My Book filter - personalize projection and EV based on selected book
    if (filters.myBook && filters.myBook !== 'none') {
      const target = (filters.myBook || '').toLowerCase();
      // Prefer oddsComparison for full metadata
      const fromComparison = opp.oddsComparison?.find(o => (o.sportsbook || '').toLowerCase().includes(target));
      const fromField = opp.fieldPrices?.find(p => (p.book || '').toLowerCase().includes(target));
      const chosenOdds = fromComparison?.odds ?? fromField?.odds;
      const chosenBook = fromComparison?.sportsbook ?? fromField?.book;

      if (typeof chosenOdds === 'number' && chosenBook) {
        // Update projection price used for display AND EV
        opp.myPrice = { odds: chosenOdds, book: chosenBook } as any;
        (opp as any).mainBookOdds = chosenOdds;

        // Recalculate EV with SAME displayed price using RAW probability (not clamped)
        const meta = (opp as any)._meta || {};
        const rawProb = (opp as any)._debug?.rawProb;
        if (!meta.suppressEV && typeof rawProb === 'number') {
          const ev = calculateAccurateEV(chosenOdds, rawProb);
          (opp as any).evPercent = isNaN(ev) ? undefined : ev;
          (opp as any).ev = (opp as any).evPercent;
        } else {
          (opp as any).evPercent = undefined;
          (opp as any).ev = undefined;
        }
      }
    }

    // Min data points filter
    if (filters.minSamples > 0) {
      const dataPoints = (opp.fieldPrices?.length || 0) + 1; // +1 for myPrice
      if (dataPoints < filters.minSamples) {
        return false;
      }
    }
    
    return true;
  });
};

// Transform backend data to comprehensive table format
const transformOpportunityData = (backendData: any): any[] => {
  // Handle different API response formats
  const dataArray = Array.isArray(backendData) ? backendData :
                   backendData?.opportunities ? backendData.opportunities :
                   backendData?.data ? backendData.data : [];

  if (!Array.isArray(dataArray)) {
    console.warn('Expected array but got:', typeof dataArray, dataArray);
    return [];
  }

  const FRESHNESS_WINDOW_MS = 10000; // 10s for live markets
  const nowMs = Date.now();

  return dataArray.map(item => {
    // 1) Projection price (this is ALSO the price we use for EV)
    const projection = (() => {
      const mainOdds = (typeof item.mainBookOdds === 'number') ? {
        odds: item.mainBookOdds,
        sportsbook: item.mainSportsbook || item.oddsComparison?.[0]?.sportsbook || 'Unknown',
        lastUpdated: item.lastUpdated
      } : null;
      const firstOC = item.oddsComparison && item.oddsComparison[0] ? item.oddsComparison[0] : null;
      const choice: any = mainOdds ?? firstOC ?? null;
      return {
        odds: (choice && typeof choice.odds === 'number') ? choice.odds : 100,
        sportsbook: choice?.sportsbook || 'Unknown',
        lastUpdated: choice?.lastUpdated || item.lastUpdated || null
      };
    })();

    // 2) Robust probability parsing with source tracking
    let probSource: 'model' | 'implied' | 'novig' | 'fallback' = 'fallback';
    let rawProb: number | null = null; // decimal 0..1

    const parseProb = (val: any): number | null => {
      if (val === undefined || val === null) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.endsWith('%')) {
          const num = parseFloat(trimmed.replace('%',''));
          return isNaN(num) ? null : num / 100;
        }
        const num = Number(trimmed);
        if (isNaN(num)) return null;
        if (num > 1.000001) return num / 100;
        if (num >= 0 && num <= 1) return num;
        return null;
      }
      if (typeof val === 'number') {
        if (val > 1.000001) return val / 100;
        if (val >= 0 && val <= 1) return val;
        return null;
      }
      return null;
    };

    const hitProb = parseProb(item.hit);
    if (hitProb !== null) {
      rawProb = hitProb; probSource = 'model';
    } else {
      const impProb = parseProb(item.impliedProbability);
      if (impProb !== null) { rawProb = impProb; probSource = 'implied'; }
    }

    // No-vig: require same line & fresh snapshot; prefer entries with team1Odds & team2Odds
    if (rawProb === null && Array.isArray(item.oddsComparison)) {
      const oc = item.oddsComparison as any[];
      // Prefer one record with both sides
      const bothSides = oc.find(e => Number.isFinite(e.team1Odds) && Number.isFinite(e.team2Odds) && (item.line === undefined || e.line === item.line));
      const freshEnough = (ts?: string) => !ts || (nowMs - new Date(ts).getTime() <= FRESHNESS_WINDOW_MS);
      if (bothSides && freshEnough(bothSides.lastUpdated)) {
        const p = calculateNoVigProbability(bothSides.team1Odds, bothSides.team2Odds);
        if (!isNaN(p)) { rawProb = p; probSource = 'novig'; }
      }
      // Else skip cross-book pairing to avoid distortion
    }

    if (rawProb === null) { rawProb = 0.5; probSource = 'fallback'; }

    // 3) Display probability (clamped only for UI)
    const displayProb = Math.max(0.001, Math.min(0.999, rawProb));

    // 4) Suppress EV in these cases
    let suppressEV = false;

    // a) Fallback probability → do not fabricate edges
    if (probSource === 'fallback') suppressEV = true;

    // b) Integer push-prone lines for spreads/totals
    const numericLine = parseFloat(item.line);
    const isIntegerLine = Number.isFinite(numericLine) && Math.abs(numericLine - Math.round(numericLine)) < 1e-9;
    const marketStr = (item.market || '').toString().toLowerCase();
    const pushMarkets = ['total', 'spread', 'run line', 'team total'];
    const isPushSensitive = pushMarkets.some(m => marketStr.includes(m));
    if (isIntegerLine && isPushSensitive) suppressEV = true;

    // c) Live markets must be fresh
    const isLive = (item.truthStatus === 'LIVE') || (item.event?.status === 'live');
    if (isLive && projection.lastUpdated) {
      const age = nowMs - new Date(projection.lastUpdated).getTime();
      if (age > FRESHNESS_WINDOW_MS) suppressEV = true;
    }

    // 5) EV using the SAME projection price and RAW probability
    let calculatedEV: number | undefined = undefined;
    if (!suppressEV && rawProb !== null) {
      const ev = calculateAccurateEV(projection.odds, rawProb);
      if (!isNaN(ev)) calculatedEV = ev;
    }

    if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
      if (displayProb !== rawProb) {
        console.log('[prob-clamp] raw=', rawProb, 'display=', displayProb);
      }
      if (suppressEV) {
        console.log('[ev-suppressed]', { reason: { probSource, isIntegerLine, isLive }, projection });
      }
    }

    // 6) Return normalized row
    return {
      id: item.id || `${item.game}-${item.market}-${Date.now()}`,
      sport: item.sport || 'unknown',
      game: item.game || 'Unknown Event',
      market: item.market || 'Moneyline',
      betType: item.betType || 'Standard',
      line: item.line || '',
      mainBookOdds: projection.odds,
      ev: calculatedEV,
      evPercent: calculatedEV,
      hit: displayProb,
      gameTime: item.gameTime || 'TBD',
      confidence: item.confidence || 'medium',
      category: item.category || 'ev',
      impliedProbability: displayProb,
      truthStatus: item.truthStatus || 'UPCOMING',
      oddsComparison: item.oddsComparison || [],
      updatedAt: item.lastUpdated || new Date().toISOString(),
      _debug: {
        probSource,
        rawProb,
        projection,
      },
      event: {
        home: item.game?.split(' vs ')[1] || item.homeTeam || 'Team B',
        away: item.game?.split(' vs ')[0] || item.awayTeam || 'Team A',
        sport: item.sport || 'unknown',
        league: item.sport || 'unknown',
        startTime: item.gameTime || new Date().toISOString(),
        status: item.truthStatus === 'LIVE' ? 'live' : 'prematch'
      },
      myPrice: {
        odds: projection.odds,
        book: projection.sportsbook
      },
      fieldPrices: (() => {
        const allOdds = item.oddsComparison || [];
        const myBook = projection.sportsbook;
        return allOdds
          .filter((odds: any) => odds.sportsbook !== myBook)
          .slice(0, 8)
          .map((odds: any) => ({
            book: odds.sportsbook || 'Unknown',
            odds: odds.odds || 100
          }));
      })(),
      fairProbability: displayProb || 0.5,
      _meta: {
        probSource,
        suppressEV,
      }
    };
  });
};

export default function TradingTerminal() {
  const [activeCategory, setActiveCategory] = useState<BetCategory>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [savedBets, setSavedBets] = useState<SavedBet[]>([]);
  const cacheService = CacheService.getInstance();

  // Function to save a bet to "My Book"
  const saveBetToMyBook = (opportunity: BettingOpportunity) => {
    const gameString = `${opportunity.event.away} @ ${opportunity.event.home}`;

    const marketString = `${opportunity.market.type} ${opportunity.market.side}${opportunity.market.line ? ` ${opportunity.market.line}` : ''}`;

    const selection = opportunity.market.player || `${opportunity.market.side} ${opportunity.market.line || ''}`;

    const newBet: SavedBet = {
      id: `${opportunity.id}-${Date.now()}`,
      game: gameString,
      selection: selection,
      market: marketString,
      odds: opportunity.myPrice.odds || 0,
      book: opportunity.myPrice.book || 'Unknown Book',
      ev: opportunity.evPercent || 0,
      timestamp: new Date()
    };

    setSavedBets(prev => [...prev, newBet]);
  };

  // Get filter state from store
  const filters = useTerminalFilters();
  
  // Fetch all types of opportunities from backend
  const {
    data: upcomingOpportunities = [],
    isLoading: isLoadingUpcoming,
    error: upcomingError,
    refetch: refetchUpcoming
  } = useQuery({
    queryKey: ['/api/betting/upcoming-opportunities'],
    refetchInterval: isPaused ? false : 30000,
    staleTime: 25000
  });

  const {
    data: liveOpportunities = [],
    isLoading: isLoadingLive,
    error: liveError,
    refetch: refetchLive
  } = useQuery({
    queryKey: ['/api/betting/live-opportunities'],
    refetchInterval: isPaused ? false : 30000,
    staleTime: 25000
  });

  const {
    data: playerPropsData = [],
    isLoading: isLoadingProps,
    error: propsError,
    refetch: refetchProps
  } = useQuery({
    queryKey: ['/api/betting/player-props'],
    refetchInterval: isPaused ? false : 60000, // Slower refresh for props
    staleTime: 55000
  });

  // Combine all opportunities
  const rawOpportunities = React.useMemo(() => {
    const upcoming = upcomingOpportunities?.opportunities || upcomingOpportunities || [];
    const live = liveOpportunities?.opportunities || liveOpportunities || [];
    const props = playerPropsData?.opportunities || playerPropsData || [];

    return [...upcoming, ...live, ...props];
  }, [upcomingOpportunities, liveOpportunities, playerPropsData]);

  const isLoading = isLoadingUpcoming || isLoadingLive || isLoadingProps;
  const error = upcomingError || liveError || propsError;
  const refetch = () => {
    refetchUpcoming();
    refetchLive();
    refetchProps();
  };

  // Transform and filter opportunities
  const opportunities = React.useMemo(() => {
    let transformed = transformOpportunityData(rawOpportunities);
    
    // Apply category filter
    if (activeCategory !== 'all') {
      transformed = transformed.filter(opp => opp.category === activeCategory);
    }
    
    // Apply new filter system
    transformed = applyFilters(transformed, filters);
    
    return transformed;
  }, [rawOpportunities, activeCategory, filters]);

  // Time display
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Clean Page Gradient - No overlapping text */}
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-[#D8AC35]/20 dark:from-black dark:via-gray-900 dark:to-[#D8AC35]/10">
        {/* Full-screen Trading Terminal */}
        <div className="min-h-screen">
          <Tabs defaultValue="opportunities" className="w-full min-h-screen">
            {/* Trading Terminal Design */}
            <div className="min-h-screen flex flex-col">
              {/* Terminal Header */}
              <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm px-8 py-6 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-6 w-6 text-[#D8AC35] dark:text-[#D8AC35]" />
                      <h2 className="text-2xl font-bold tracking-wide text-gray-900 dark:text-white">TRADING TERMINAL</h2>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-[#D8AC35] dark:bg-[#D8AC35] rounded-full animate-pulse"></div>
                      <span className="text-gray-600 dark:text-gray-300 font-mono">LIVE MARKET DATA</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                      <TabsList className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50">
                        <TabsTrigger value="opportunities" className="text-xs font-mono data-[state=active]:bg-[#D8AC35] data-[state=active]:text-white dark:data-[state=active]:bg-[#D8AC35] dark:data-[state=active]:text-black">LIVE OPPORTUNITIES</TabsTrigger>
                        <TabsTrigger value="calculator" className="text-xs font-mono data-[state=active]:bg-[#D8AC35] data-[state=active]:text-white dark:data-[state=active]:bg-[#D8AC35] dark:data-[state=active]:text-black">EV CALCULATOR</TabsTrigger>
                        <TabsTrigger value="comparison" className="text-xs font-mono data-[state=active]:bg-[#D8AC35] data-[state=active]:text-white dark:data-[state=active]:bg-[#D8AC35] dark:data-[state=active]:text-black">ODDS COMPARISON</TabsTrigger>
                        <TabsTrigger value="launch-status" className="text-xs font-mono data-[state=active]:bg-[#D8AC35] data-[state=active]:text-white dark:data-[state=active]:bg-[#D8AC35] dark:data-[state=active]:text-black">LAUNCH STATUS</TabsTrigger>
                      </TabsList>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {currentTime.toLocaleTimeString('en-US', { 
                        hour12: true,
                        hour: '2-digit',
                        minute: '2-digit', 
                        second: '2-digit',
                        timeZone: 'America/New_York'
                      })} EST
                    </div>
                    <div className="w-3 h-3 bg-[#D8AC35] dark:bg-[#D8AC35] rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <TabsContent value="opportunities" className="min-h-screen m-0 p-0 flex-1">
                <div className="flex flex-col min-h-screen">
                  <div className="flex-1 p-8 space-y-6">
                    {/* Category Navigation */}
                    <div className="flex items-center justify-between">
                      <CategoryTabs activeCategory={activeCategory} onCategoryChange={setActiveCategory} opportunities={opportunities} />
                      <div className="flex items-center gap-4">
                        <ExportButton
                          opportunities={opportunities}
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsPaused(!isPaused);
                            if (!isPaused) {
                              setLastUpdated(new Date());
                            }
                          }}
                          className="font-mono text-xs"
                        >
                          {isPaused ? <Play className="h-3 w-3 mr-2" /> : <Pause className="h-3 w-3 mr-2" />}
                          {isPaused ? 'RESUME' : 'PAUSE'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refetch()}
                          className="font-mono text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-2" />
                          REFRESH
                        </Button>
                      </div>
                    </div>
                    
                    {/* New Filter System */}
                    <FilterBar />
                    <ActiveFilterChips />
                    
                    {/* Tip Card for My Book */}
                    <TipCardMyBook />

                    {/* Professional Trading Terminal Table */}
                    <TerminalTable
                      opportunities={opportunities}
                      loading={isLoading}
                      error={error?.message}
                      onRowClick={(opportunity) => {
                        // Save bet to "My Book" when clicked
                        saveBetToMyBook(opportunity);
                        console.log('Saved bet to My Book:', opportunity);
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Calculator Tab */}
              <TabsContent value="calculator" className="min-h-screen m-0 p-0 flex-1">
                <div className="p-8">
                  <div className="max-w-md mx-auto">
                    <EVCalculator savedBets={savedBets} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="comparison" className="min-h-screen m-0 p-0 flex-1">
                <div className="p-8">
                  <div className="text-center py-16">
                    <h3 className="text-lg font-mono text-gray-600 dark:text-gray-400 mb-2">ODDS COMPARISON</h3>
                    <p className="text-gray-500 dark:text-gray-500 font-mono text-sm">
                      Coming soon - comprehensive odds comparison tools.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="launch-status" className="min-h-screen m-0 p-0 flex-1">
                <div className="p-8">
                  <LaunchStatusWidget />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}