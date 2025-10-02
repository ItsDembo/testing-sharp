import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, RotateCcw, RefreshCw, Pause, Clock, Play, TrendingUp, AlertCircle } from "lucide-react";
import React from "react"; // Added missing import
import { useBookSelection } from "@/contexts/BookSelectionContext";
import { evColorClass, filterValidFieldOdds } from "@/lib/evColorScheme";
import { BOOK_ORDER, BOOK_DISPLAY_NAMES } from "@/lib/bookConfig";
import { americanToDecimal } from "@/lib/oddsUtils";

interface SportsbookOdds {
  sportsbook: string;
  odds: number;
  ev: number;
  isMainBook?: boolean;
  team1Odds?: number;
  team2Odds?: number;
  url?: string;
  lastUpdated?: string;
  uniqueId?: string;
}

interface BettingOpportunity {
  id: string;
  sport: string;
  game: string;
  market: string;
  betType: string;
  line: string;
  mainBookOdds: number;
  ev: number;
  hit: number;
  gameTime: string;
  confidence: string;
  category: string;
  impliedProbability?: number;
  oddsComparison: SportsbookOdds[];
  normalizedEvent?: any;
  truthStatus?: string;
  
  // New trading terminal fields (from API specification)
  event: string;
  league: string;
  prop: string;
  myOdds: number;
  winProbability: number;
  evPercentage: number;
  fieldOdds: Array<{
    sportsbook: string;
    odds: number;
    url: string;
  }>;
}

export default function TradingTerminal() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState("");
  const { primaryBook, setPrimaryBook, availableBooks } = useBookSelection();
  const [compareAgainst, setCompareAgainst] = useState("All Books");
  const [selectedSport, setSelectedSport] = useState("All Sports");
  const [selectedMarkets, setSelectedMarkets] = useState("All Markets");
  const [minEV, setMinEV] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Get live betting opportunities from real API (temporarily using original endpoint)
  const { data: opportunitiesData, isLoading: isLoadingOpportunities, error: opportunitiesError, refetch } = useQuery({
    queryKey: ['/api/betting/live-opportunities', { sport: selectedSport, primaryBook }], // Include primaryBook in query key
    queryFn: async () => {
      console.log('🚀 Fetching live opportunities from API...');
      const params = new URLSearchParams();
      if (selectedSport !== "All Sports") params.append('sport', selectedSport);
      params.append('primaryBook', primaryBook);
      // Note: minEV filtering is now done client-side to prevent loading on slider changes
      
      const url = `/api/betting/live-opportunities?${params}`;
      console.log('📡 Requesting:', url);
      
      const response = await fetch(url);
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`Failed to fetch betting opportunities: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ API Response received:', data);
      return data;
    },
    refetchInterval: isPaused ? false : 15000, // 15 second refresh when not paused
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    staleTime: 5000, // Data considered fresh for 5 seconds
    enabled: !isPaused,
  });

  // Log any query errors
  React.useEffect(() => {
    if (opportunitiesError) {
      console.error('❌ Live opportunities query error:', opportunitiesError);
    }
  }, [opportunitiesError]);

  // Get terminal stats
  const { data: statsData } = useQuery({
    queryKey: ['/api/betting/terminal-stats'],
    queryFn: async () => {
      const response = await fetch('/api/betting/terminal-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch terminal stats');
      }
      return response.json();
    },
    refetchInterval: isPaused ? false : 60000, // 1 minute refresh
    enabled: !isPaused,
  });

  // Transform API data to our format - NO BREAKING CHANGES
  const opportunities: BettingOpportunity[] = React.useMemo(() => {
    console.log('🔍 Raw API response from live-opportunities:', opportunitiesData);
    console.log('🔍 API loading state:', isLoadingOpportunities);
    
    if (!opportunitiesData) {
      console.log('❌ No API response received');
      return [];
    }
    
    if (!opportunitiesData.opportunities) {
      console.log('❌ No opportunities data found in API response');
      console.log('🔍 Full response structure:', Object.keys(opportunitiesData));
      return [];
    }

    console.log(`✅ Found ${opportunitiesData.opportunities.length} opportunities in API response`);
    if (opportunitiesData.opportunities.length > 0) {
      console.log('🔍 Sample opportunity:', opportunitiesData.opportunities[0]);
    }

    // The API returns opportunities in the exact format we need
    // Just ensure all required fields are present with safe defaults
    return opportunitiesData.opportunities.map((opp: any) => ({
      id: opp.id || `${opp.game}-${opp.market}-${Date.now()}`,
      sport: opp.sport || 'Unknown Sport',
      game: opp.game || 'Unknown Game',
      market: opp.market || 'Unknown Market',
      betType: opp.betType || 'Unknown Bet',
      line: opp.line || '',
      mainBookOdds: opp.mainBookOdds || opp.myOdds || 100,
      myOdds: opp.myOdds || opp.mainBookOdds || 100,
      ev: typeof opp.ev === 'number' ? opp.ev : (typeof opp.evPercent === 'number' ? opp.evPercent : 0),
      evPercentage: opp.evPercentage || opp.ev || 0,
      hit: opp.hit || opp.winProbability || 50,
      winProbability: opp.winProbability || opp.hit || 50,
      gameTime: opp.gameTime || new Date().toISOString(),
      confidence: opp.confidence || 'low',
      category: opp.category || 'value',
      impliedProbability: opp.impliedProbability,
      oddsComparison: (opp.oddsComparison || opp.fieldOdds || []).map((book: any) => ({
        ...book,
        ev: typeof book.ev === 'number' ? book.ev : 0 // Ensure each book has a numeric EV
      })),
      normalizedEvent: opp.normalizedEvent,
      truthStatus: opp.truthStatus,
      fieldOdds: opp.fieldOdds || opp.oddsComparison || [],
      event: opp.event || opp.game,
      league: opp.league,
      prop: opp.prop || opp.betType
    }));
  }, [opportunitiesData]);

  // Filter opportunities based on current filters
  const filteredOpportunities = React.useMemo(() => {
    console.log(`🔍 Filtering ${opportunities.length} opportunities with filters:`, {
      selectedSport,
      selectedMarkets,
      minEV,
      searchTerm,
      activeTab
    });
    
    const filtered = opportunities.filter(opp => {
      // Filter by sport
      if (selectedSport !== "All Sports" && opp.sport !== selectedSport) {
        return false;
      }
      
      // Filter by market type
      if (selectedMarkets !== "All Markets" && opp.market !== selectedMarkets) {
        return false;
      }
      
      // Filter by minimum EV
      if (opp.ev < minEV) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm && !opp.game.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !opp.market.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by category tab
      if (activeTab === 'live' && opp.category !== 'live') return false;
      if (activeTab === 'upcoming' && opp.category !== 'upcoming') return false;
      if (activeTab === 'final' && opp.category !== 'final') return false;
      if (activeTab === 'ev' && opp.ev <= 0) return false;
      if (activeTab === 'arbitrage' && opp.category !== 'arbitrage') return false;
      if (activeTab === 'middling' && opp.category !== 'middling') return false;
      
      return true;
    });
    
    console.log(`✅ Filtered to ${filtered.length} opportunities`);
    return filtered;
  }, [opportunities, selectedSport, selectedMarkets, minEV, searchTerm, activeTab]);

  // Category counts
  const counts = React.useMemo(() => {
    const all = opportunities.length;
    const live = opportunities.filter(opp => opp.category === 'live').length;
    const upcoming = opportunities.filter(opp => opp.category === 'upcoming').length;
    const final = opportunities.filter(opp => opp.category === 'final').length;
    const ev = opportunities.filter(opp => opp.ev > 0).length;
    const arbitrage = opportunities.filter(opp => opp.category === 'arbitrage').length;
    const middling = opportunities.filter(opp => opp.category === 'middling').length;
    
    console.log(`📊 Category counts:`, {
      all,
      live,
      upcoming,
      final,
      ev,
      arbitrage,
      middling,
      sampleCategories: opportunities.slice(0, 3).map(opp => opp.category)
    });
    
    return { 
      all: all || 0, 
      live: live || 0,
      upcoming: upcoming || 0,
      final: final || 0,
      ev: ev || 0, 
      arbitrage: arbitrage || 0, 
      middling: middling || 0 
    };
  }, [opportunities]);

  // EV color function - using the new utility
  const getEVColor = (ev: number) => {
    return evColorClass(ev);
  };

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setLastRefresh(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused]);

  if (isLoadingOpportunities) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-green-400">Loading trading terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Top Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 gap-2">
        <div className="flex items-center gap-2 lg:gap-4 text-xs flex-wrap">
          <Badge variant="outline" className="bg-gray-800 text-green-400 border-green-400">
            Books {statsData?.booksScanned || 18}
          </Badge>
          <Badge variant="outline" className="bg-gray-800 text-yellow-400 border-yellow-400">
            +EV {counts.ev}
          </Badge>
          <Badge variant="outline" className="bg-gray-800 text-blue-400 border-blue-400">
            Arb {counts.arbitrage}
          </Badge>
          <Badge variant="outline" className="bg-gray-800 text-purple-400 border-purple-400">
            Mid {counts.middling}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`}></div>
            <span className={isPaused ? 'text-red-400' : 'text-green-400'}>
              {isPaused ? 'PAUSED' : 'LIVE - 30s refresh'}
            </span>
          </div>
          <span className="text-gray-400 hidden md:inline">
            Updated {formatTimeAgo(lastRefresh.toISOString())}
          </span>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-green-400 hover:text-green-300"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden md:inline ml-1">Refresh</span>
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className={isPaused ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}
            onClick={togglePause}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span className="hidden md:inline ml-1">{isPaused ? 'Resume' : 'Pause'}</span>
          </Button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center justify-center py-4 bg-black px-4">
        <div className="flex gap-2 flex-wrap justify-center">
          {[
            { key: 'all', label: 'All Games', count: counts.all, color: 'border-green-400 bg-green-400/20' },
            { key: 'live', label: '🔴 Live', count: counts.live, color: 'border-red-400 bg-red-400/20' },
            { key: 'upcoming', label: '⏰ Upcoming', count: counts.upcoming, color: 'border-blue-400 bg-blue-400/20' },
            { key: 'final', label: '✅ Final', count: counts.final, color: 'border-green-500 bg-green-500/20' },
            { key: 'ev', label: '+EV', count: counts.ev, color: 'border-yellow-400 bg-yellow-400/20' },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.key)}
              className={`${activeTab === tab.key ? tab.color : 'border-gray-600 bg-gray-800/20'} border rounded-full text-xs px-2 sm:px-3 py-1 min-h-[32px] sm:min-h-[36px]`}
            >
              {tab.label} {tab.count}
            </Button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 sm:px-4 py-3 bg-gray-900">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search players, teams, or markets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 h-10 sm:h-12 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 px-3 sm:px-4 py-3 bg-gray-900 border-b border-gray-700">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Primary Book</label>
          <Select value={primaryBook} onValueChange={setPrimaryBook}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-xs sm:text-sm h-8 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              {availableBooks.map((book) => (
                <SelectItem key={book} value={book} className="text-white text-xs">
                  {book}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Compare Against</label>
          <Select value={compareAgainst} onValueChange={setCompareAgainst}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-xs sm:text-sm h-8 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="All Books" className="text-white text-xs">All Books</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Sports</label>
          <Select value={selectedSport} onValueChange={setSelectedSport}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-xs sm:text-sm h-8 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="All Sports" className="text-white text-xs">All Sports</SelectItem>
              <SelectItem value="MLB" className="text-white text-xs">MLB</SelectItem>
              <SelectItem value="NBA" className="text-white text-xs">NBA</SelectItem>
              <SelectItem value="NFL" className="text-white text-xs">NFL</SelectItem>
              <SelectItem value="NHL" className="text-white text-xs">NHL</SelectItem>
              <SelectItem value="SOCCER" className="text-white text-xs">SOCCER</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Markets</label>
          <Select value={selectedMarkets} onValueChange={setSelectedMarkets}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-xs sm:text-sm h-8 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="All Markets" className="text-white text-xs">All Markets</SelectItem>
              <SelectItem value="Moneyline" className="text-white text-xs">Moneyline</SelectItem>
              <SelectItem value="Spread" className="text-white text-xs">Spread</SelectItem>
              <SelectItem value="Total" className="text-white text-xs">Total (O/U)</SelectItem>
              <SelectItem value="Props" className="text-white text-xs">Player Props</SelectItem>
              <SelectItem value="Futures" className="text-white text-xs">Futures</SelectItem>
              <SelectItem value="Live Betting" className="text-white text-xs">Live Betting</SelectItem>
              <SelectItem value="Parlays" className="text-white text-xs">Parlays</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Min EV</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-400">{minEV}%</span>
            <Slider
              value={[minEV]}
              onValueChange={(value) => setMinEV(value[0])}
              max={50}
              min={0}
              step={1}
              className="w-20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Search</label>
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white text-xs h-8"
          />
        </div>
      </div>

      {/* Data Table - Desktop */}
      <div className="overflow-x-auto hidden lg:block">
        <table className="w-full text-xs">
          {/* Table Header */}
          <thead className="bg-gray-900 sticky top-0">
            <tr className="border-b border-gray-700">
              <th className="text-left p-3 text-gray-400 font-normal">EVENT</th>
              <th className="text-left p-3 text-gray-400 font-normal">LEAGUE</th>
              <th className="text-left p-3 text-gray-400 font-normal">PROP</th>
              <th className="text-left p-3 text-gray-400 font-normal">MARKET</th>
              <th className="text-center p-3 text-gray-400 font-normal">MY ODDS</th>
              <th className="text-center p-3 text-gray-400 font-normal">WIN PROB</th>
              <th className="text-center p-3 text-gray-400 font-normal">+EV%</th>
              <th className="text-left p-3 text-gray-400 font-normal">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium">FIELD ODDS</div>
                  <div className="fo-wrap">
                    <div className="fo-header">
                      {BOOK_ORDER.map((book) => (
                        <div className="fo-slot" key={book} title={BOOK_DISPLAY_NAMES[book]}>
                          <div className="book-text">{BOOK_DISPLAY_NAMES[book]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {filteredOpportunities.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  {isLoadingOpportunities ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                      Loading opportunities...
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-gray-500" />
                      <p>No opportunities found matching your criteria</p>
                      <p className="text-sm">Try adjusting your filters or search terms</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredOpportunities.map((opp, index) => (
                <tr key={opp.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                  {/* 1. Event */}
                  <td className="p-3">
                    <div className="text-white">
                      {opp.event || opp.game}
                    </div>
                    <div className="text-gray-400 text-xs flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        opp.category === 'live' ? 'bg-red-500 text-white' : 
                        opp.category === 'upcoming' ? 'bg-blue-500 text-white' : 
                        opp.category === 'final' ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
                      }`}>
                        {opp.category === 'live' ? '🔴 LIVE' : 
                         opp.category === 'upcoming' ? '⏰ UPCOMING' : 
                         opp.category === 'final' ? '✅ FINAL' : 'UNKNOWN'}
                      </span>
                      {opp.gameTime && (
                        <span className="text-blue-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(opp.gameTime)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 2. League */}
                  <td className="p-3 text-gray-300">{opp.league || opp.sport}</td>

                  {/* 3. Prop */}
                  <td className="p-3">
                    <div className="text-white">{opp.prop || `${opp.betType}`}</div>
                    {opp.line && (
                      <div className="text-gray-400">{opp.line}</div>
                    )}
                  </td>

                  {/* 4. Market */}
                  <td className="p-3 text-gray-300">{opp.market}</td>

                  {/* 5. My Odds */}
                  <td className="p-3 text-center">
                    <div className="bg-blue-600 text-white px-3 py-1 rounded font-medium">
                      {formatOdds(opp.myOdds || opp.mainBookOdds)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{primaryBook}</div>
                  </td>

                  {/* 6. Win Probability */}
                  <td className="p-3 text-center text-green-400 font-medium">
                    {opp.winProbability ? `${opp.winProbability}%` : `${opp.hit}%`}
                  </td>

                  {/* 7. +EV% */}
                  <td className="p-3 text-center">
                    <span className={getEVColor(opp.evPercentage || opp.ev)}>
                      {typeof (opp.evPercentage || opp.ev) === 'number' ? 
                        `${(opp.evPercentage || opp.ev) > 0 ? '+' : ''}${(opp.evPercentage || opp.ev).toFixed(1)}%` : 
                        'N/A'
                      }
                    </span>
                  </td>

                  {/* 8. Field Odds */}
                  <td className="p-3">
                    <div className="fo-wrap">
                      <div className="fo-grid">
                        {BOOK_ORDER.map((book) => {
                          const bookOdds = filterValidFieldOdds(
                            opp.fieldOdds || opp.oddsComparison.filter(b => !b.isMainBook),
                            primaryBook
                          ).find(b => b.sportsbook === book);
                          if (!bookOdds) {
                            // true gap (empty slot) to keep alignment
                            return <div className="fo-slot fo-slot--empty" key={book} aria-hidden="true" />;
                          }
                          
                          // Get decimal value (use existing decimal or compute from American)
                          const decimal = (bookOdds as any).decimal != null
                            ? String((bookOdds as any).decimal)
                            : americanToDecimal(bookOdds.odds);
                          
                          // Stack decimal above pill
                          return (
                            <div className="fo-slot" key={book}>
                              <div className="fo-stack">
                                {decimal && <span className="fo-decimal">{decimal}</span>}
                                <button
                                  onClick={() => window.open(bookOdds.url, '_blank', 'noopener,noreferrer')}
                                  className="odds-pill--compact text-center transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer bg-gray-700 hover:bg-gray-600 text-gray-100"
                                  title={`Bet on ${bookOdds.sportsbook} - ${formatOdds(bookOdds.odds)}`}
                                >
                                  {formatOdds(bookOdds.odds)}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="lg:hidden">
        {filteredOpportunities.length === 0 ? (
          <div className="text-center py-8 text-gray-400 px-4">
            {isLoadingOpportunities ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                Loading opportunities...
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-gray-500" />
                <p>No opportunities found matching your criteria</p>
                <p className="text-sm">Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-2 space-y-3">
            {filteredOpportunities.map((opp) => (
              <div key={`${opp.game}-${opp.market}-${opp.betType}`} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium text-sm">{opp.game}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        opp.category === 'live' ? 'bg-red-500 text-white' : 
                        opp.category === 'upcoming' ? 'bg-blue-500 text-white' : 
                        opp.category === 'final' ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
                      }`}>
                        {opp.category === 'live' ? '🔴 LIVE' : 
                         opp.category === 'upcoming' ? '⏰ UPCOMING' : 
                         opp.category === 'final' ? '✅ FINAL' : 'UNKNOWN'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">{opp.sport} • {opp.market}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${getEVColor(opp.ev)}`}>
                      {typeof opp.ev === 'number' ? 
                        `${opp.ev > 0 ? '+' : ''}${opp.ev.toFixed(1)}%` : 
                        'N/A'
                      }
                    </div>
                    <p className="text-xs text-gray-400">EV</p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mb-3 text-center">
                  <div>
                    <div className="text-gray-300 text-sm">
                      {opp.impliedProbability ? Math.round(opp.impliedProbability * 1000) / 10 : 'N/A'}%
                    </div>
                    <p className="text-xs text-gray-500">Implied</p>
                  </div>
                  <div>
                    <div className="text-green-400 text-sm">{opp.hit}%</div>
                    <p className="text-xs text-gray-500">Fair</p>
                  </div>
                  <div>
                    <div className="text-gray-300 text-sm">{opp.betType}</div>
                    <p className="text-xs text-gray-500">Type</p>
                  </div>
                </div>

                {/* Sportsbooks */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">Sportsbooks</p>
                  <div className="flex flex-wrap gap-2">
                    {filterValidFieldOdds(
                      opp.oddsComparison.filter(book => !book.isMainBook),
                      primaryBook
                    ).slice(0, 8).map((book, i) => (
                      <button
                        key={i}
                        onClick={() => window.open(book.url, '_blank', 'noopener,noreferrer')}
                        className={`flex flex-col items-center p-2 rounded min-w-[70px] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                          book.isMainBook ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                        title={`Bet on ${book.sportsbook} - ${formatOdds(book.odds)}`}
                      >
                        <div className="text-xs font-medium text-white truncate w-full text-center">{book.sportsbook}</div>
                        <div className="text-xs text-gray-300 font-medium">{formatOdds(book.odds)}</div>
                        <div className="text-xs text-gray-400">
                          {typeof book.ev === 'number' ? 
                            `${book.ev > 0 ? '+' : ''}${book.ev.toFixed(0)}%` : 
                            'N/A'
                          }
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Status */}
      <div className="px-4 py-2 bg-gray-900 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <span>Showing {filteredOpportunities.length} of {opportunities.length} opportunities</span>
          <span>Last updated: {formatTimeAgo(lastRefresh.toISOString())}</span>
        </div>
      </div>
    </div>
  );
}
