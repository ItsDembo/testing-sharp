import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Calculator as CalculatorIcon, Target, AlertCircle, ExternalLink, Clock } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { getSportsbookLogo, SportsbookDot } from '@/lib/sportsbookLogos';
import { SportsbookLogo } from '../components/SportsbookLogo';
import { routeToBet } from "@/lib/betRouting";
import { formatInUserTimezone, getUserTimezone, TimezoneInfo } from '@/lib/timezone';
import { BetCategorizer, type BetCategory } from '../../../shared/betCategories';
// Import sportsbooks data through a shared module
const SPORTSBOOKS = {
  'FanDuel': { name: 'FanDuel', logo: '/booklogos/fanduel.png', displayName: 'FanDuel' },
  'DraftKings': { name: 'DraftKings', logo: '/booklogos/draftkings.png', displayName: 'DraftKings' },
  'Caesars': { name: 'Caesars', logo: '/booklogos/caesars.png', displayName: 'Caesars' },
  'BetRivers': { name: 'BetRivers', logo: '/booklogos/betrivers.png', displayName: 'BetRivers' },
  'ESPNBET': { name: 'ESPN BET', logo: '/booklogos/espnbet.png', displayName: 'ESPN BET' },
  'Fanatics': { name: 'Fanatics', logo: '/booklogos/fanatics.png', displayName: 'Fanatics' },
  'BetOnline': { name: 'BetOnline', logo: '/booklogos/betonline.jpg', displayName: 'BetOnline' },
  'Bovada': { name: 'Bovada', logo: '/booklogos/bovada.jpg', displayName: 'Bovada' }
};

// Custom hook for live time
const useLiveTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return currentTime;
};

interface SportsbookOdds {
  sportsbook: string;
  odds: number;
  ev: number;
  isMainBook?: boolean;
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
  category?: BetCategory;
  arbitrageProfit?: number;
  oddsComparison: SportsbookOdds[];
}

// --- Odds utils (copy in Calculator.tsx) ---
function americanToDecimal(a: number): number {
  return a >= 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
}

function decimalToImplied(d: number): number {
  return 1 / d;
}

function impliedToDecimal(p: number): number {
  const pc = Math.max(1e-6, Math.min(1 - 1e-6, p));
  return 1 / pc;
}

function impliedToAmerican(p: number): number {
  const d = impliedToDecimal(p);
  return d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1));
}

// CRITICAL FIX: Consensus probability normalizer to eliminate unit confusion
const normalizeConsensusP = (p: unknown): number | undefined => {
  if (p === null || p === undefined) return undefined;
  let v = Number(p);
  if (!Number.isFinite(v) || v <= 0) return undefined;
  // If server accidentally sends percent (e.g., 46 or 46.0), convert once.
  if (v > 1.5) v = v / 100;
  if (v >= 1) v = Math.min(v, 0.999999);
  if (v <= 0) return undefined;
  return v;
};

// --- Fixed field average calculation with trimming & sanitization ---
const calculateFieldAverage = (oddsComparison: SportsbookOdds[]) => {
  if (!oddsComparison || oddsComparison.length < 3) return NaN;
  
  // Convert to implied probabilities and filter outliers
  const impliedProbs = oddsComparison
    .map(book => {
      const dec = book.odds >= 0 ? 1 + book.odds/100 : 1 + 100/Math.abs(book.odds);
      return 1 / dec;
    })
    .filter(p => p > 0.01 && p < 0.99);
  
  if (impliedProbs.length < 3) return NaN;
  
  // Calculate trimmed mean (remove 10% from each tail)
  const sorted = impliedProbs.sort((a, b) => a - b);
  const trimCount = Math.floor(impliedProbs.length * 0.1);
  const trimmed = sorted.slice(trimCount, -trimCount);
  
  const avg = trimmed.reduce((sum, p) => sum + p, 0) / trimmed.length;
  
  // Convert back to American odds
  const american = avg >= 0.5 ? 
    Math.round(-avg / (1 - avg) * 100) : 
    Math.round((1 - avg) / avg * 100);
  
  return Math.abs(american) > 10000 ? NaN : american;
};

// Helper function to format probability percentage
const formatProbPct = (prob: number | undefined): string => {
  if (prob === undefined || prob === null) return '—';
  return `${(prob * 100).toFixed(1)}%`;
};

// Helper function to format My Odds (consensus line)
const formatMyOdds = (prob: number | undefined): string => {
  if (prob === undefined || prob === null) return '—';
  if (prob <= 0.01 || prob >= 0.99) return '—';
  
  const d = 1 / prob;
  const am = d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1));
  return Math.abs(am) > 10000 ? '—' : (am > 0 ? `+${am}` : `${am}`);
};

// --- Client-side consensus fallback REMOVED - use server consensus only ---
// If consensus is missing, show "—" for all values

// --- Compute EV using consensus probability ---
const computeEVPct = (bookAmerican: number, consensusProb?: number, stake = 100) => {
  if (consensusProb === undefined || !Number.isFinite(bookAmerican)) return undefined;
  const dec = americanToDecimal(bookAmerican);
  if (!Number.isFinite(dec) || dec <= 1) return undefined;
  const profitIfWin = stake * (dec - 1); // NET profit
  const ev = consensusProb * profitIfWin - (1 - consensusProb) * stake;
  return (ev / stake) * 100; // EV%
};

// --- Strong client-side odds sanitization ---
const isPlausibleAmerican = (a?: number) =>
  typeof a === 'number' && isFinite(a) && a !== 0 && Math.abs(a) <= 5000;

// --- Display helpers (kill the "0" bug, kill ×100 bug) ---


export default function Calculator() {
  const [selectedSport, setSelectedSport] = useState("all");
  const [minEV, setMinEV] = useState("0");
  const [statusFilter, setStatusFilter] = useState<'all' | 'prematch' | 'live'>('all');
  const currentTime = useLiveTime();
  const [opportunities, setOpportunities] = useState<BettingOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [userTimezone, setUserTimezone] = useState<TimezoneInfo | null>(null);
  const [mainSportsbook, setMainSportsbook] = useState("all");
  const [activeCategory, setActiveCategory] = useState<BetCategory>('all');

  useEffect(() => {
    setUserTimezone(getUserTimezone());
  }, []);

  // Get live betting opportunities from real API
  const { data: opportunitiesData, isLoading: isLoadingOpportunities, error: opportunitiesError } = useQuery({
    queryKey: ['/api/betting/live-opportunities', { sport: selectedSport, minEV: minEV, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSport !== "all") params.append('sport', selectedSport);
      // Only apply minEV filter if user has set it above 0
      if (parseFloat(minEV) > 0) params.append('minEV', minEV.toString());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/betting/live-opportunities?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch betting opportunities');
      }
      return response.json();
    },
    refetchInterval: statusFilter === 'live' ? 10000 : 20000, // Faster refresh for live games (10s/20s)
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    staleTime: 5000, // Data considered fresh for 5 seconds
  });

  // Get live terminal stats
  const { data: terminalStats } = useQuery({
    queryKey: ['/api/betting/terminal-stats'],
    queryFn: async () => {
      const response = await fetch('/api/betting/terminal-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch terminal stats');
      }
      return response.json();
    },
    refetchInterval: 45000, // Refetch every 45 seconds
  });

  // Dynamic EV color function - darker green for higher EV, fading to yellow then red
  const getEVColor = (ev: number) => {
    if (ev >= 15) return 'bg-green-900 text-white dark:bg-green-800 dark:text-white';
    if (ev >= 10) return 'bg-green-800 text-white dark:bg-green-700 dark:text-white';
    if (ev >= 8) return 'bg-green-700 text-white dark:bg-green-600 dark:text-white';
    if (ev >= 5) return 'bg-green-600 text-white dark:bg-green-500 dark:text-white';
    if (ev >= 3) return 'bg-green-500 text-white dark:bg-green-400 dark:text-white';
    if (ev >= 1) return 'bg-yellow-500 text-white dark:bg-yellow-400 dark:text-white';
    if (ev >= 0) return 'bg-yellow-400 text-white dark:bg-yellow-300 dark:text-white';
    if (ev >= -2) return 'bg-orange-400 text-white dark:bg-orange-400 dark:text-white';
    if (ev >= -5) return 'bg-red-500 text-white dark:bg-red-500 dark:text-white';
    return 'bg-red-600 text-white dark:bg-red-600 dark:text-white';
  };

  useEffect(() => {
    if (opportunitiesData?.opportunities) {
      setOpportunities(opportunitiesData.opportunities);
    }
    setLoading(isLoadingOpportunities);
  }, [opportunitiesData, isLoadingOpportunities]);

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  // Get competitor sportsbook names (excluding main book)
  const getCompetitorBooks = (oddsComparison: SportsbookOdds[]) => {
    return oddsComparison
      .filter(book => !book.isMainBook)
      .map(book => book.sportsbook)
      .slice(0, 4); // Show first 4 competitors
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "High": return "bg-green-100 text-green-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Low": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen">
      {/* Large Page Gradient */}
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-[#D8AC35]/20 dark:from-black dark:via-gray-900 dark:to-[#00ff41]/10">
        {/* Full-screen Trading Terminal */}
        <div className="min-h-screen">
          <Tabs defaultValue="opportunities" className="w-full min-h-screen">
            {/* Trading Terminal Design */}
            <div className="min-h-screen flex flex-col">
              {/* Terminal Header */}
              <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm px-10 py-8 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-7 w-7 text-[#D8AC35] dark:text-[#00ff41]" />
                      <h2 className="text-3xl font-bold tracking-wide text-gray-900 dark:text-white">TRADING TERMINAL</h2>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-[#D8AC35] dark:bg-[#00ff41] rounded-full animate-pulse"></div>
                      <span className="text-gray-600 dark:text-gray-300 font-mono">LIVE MARKET DATA</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                      <TabsList className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50">
                        <TabsTrigger value="opportunities" className="text-xs font-mono data-[state=active]:bg-[#D8AC35] data-[state=active]:text-white dark:data-[state=active]:bg-[#00ff41] dark:data-[state=active]:text-black">LIVE OPPORTUNITIES</TabsTrigger>
                        <TabsTrigger value="calculator" className="text-xs font-mono data-[state=active]:bg-[#D8AC35] data-[state=active]:text-white dark:data-[state=active]:bg-[#00ff41] dark:data-[state=active]:text-black">EV CALCULATOR</TabsTrigger>
                        <TabsTrigger value="comparison" className="text-xs font-mono data-[state=active]:bg-[#D8AC35] data-[state=active]:text-white dark:data-[state=active]:bg-[#00ff41] dark:data-[state=active]:text-black">ODDS COMPARISON</TabsTrigger>
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
                    <div className="w-3 h-3 bg-[#D8AC35] dark:bg-[#00ff41] rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              <TabsContent value="opportunities" className="min-h-screen m-0 p-0 flex-1">

                {/* Market Stats Dashboard */}
                <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm px-10 py-10 border-b border-gray-200/50 dark:border-gray-700/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                    <div className="text-center">
                      <div className="text-gray-600 dark:text-gray-400 text-sm font-mono uppercase tracking-wider mb-3">BOOKS SCANNED</div>
                      <div className="text-4xl font-bold font-mono text-gray-900 dark:text-white">{terminalStats?.booksScanned || '--'}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 dark:text-gray-400 text-sm font-mono uppercase tracking-wider mb-3">+EV SIGNALS</div>
                      <div className="text-4xl font-bold font-mono text-[#D8AC35] dark:text-[#00ff41]">{terminalStats?.evSignals?.toLocaleString() || '--'}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 dark:text-gray-400 text-sm font-mono uppercase tracking-wider mb-3">AVG CLV</div>
                      <div className="text-4xl font-bold font-mono text-[#D8AC35] dark:text-[#00ff41]">+{terminalStats?.averageCLV || '--'}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 dark:text-gray-400 text-sm font-mono uppercase tracking-wider mb-3">WIN RATE</div>
                      <div className="text-4xl font-bold font-mono text-[#D8AC35] dark:text-[#00ff41]">{terminalStats?.winRate ? `${terminalStats.winRate}%` : '--'}</div>
                    </div>
                  </div>
                </div>

                {/* Terminal Control Panel */}
                <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm px-10 py-8 border-b border-gray-200/50 dark:border-gray-700/50">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="space-y-3">
                      <div className="text-[#D8AC35] dark:text-[#00ff41] text-sm font-mono uppercase tracking-wider mb-2">PRIMARY BOOK</div>
                      <Select value={mainSportsbook} onValueChange={setMainSportsbook}>
                        <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-mono h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                          <SelectItem value="all" className="text-gray-900 dark:text-white font-mono">ALL BOOKS</SelectItem>
                          <SelectItem value="FanDuel" className="text-gray-900 dark:text-white font-mono">FanDuel</SelectItem>
                          <SelectItem value="DraftKings" className="text-gray-900 dark:text-white font-mono">DraftKings</SelectItem>
                          <SelectItem value="Caesars" className="text-gray-900 dark:text-white font-mono">Caesars</SelectItem>
                          <SelectItem value="BetRivers" className="text-gray-900 dark:text-white font-mono">BetRivers</SelectItem>
                          <SelectItem value="ESPNBET" className="text-gray-900 dark:text-white font-mono">ESPN BET</SelectItem>
                          <SelectItem value="Fanatics" className="text-gray-900 dark:text-white font-mono">Fanatics</SelectItem>
                          <SelectItem value="BetOnline" className="text-gray-900 dark:text-white font-mono">BetOnline</SelectItem>
                          <SelectItem value="Bovada" className="text-gray-900 dark:text-white font-mono">Bovada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="text-[#D8AC35] dark:text-[#00ff41] text-sm font-mono uppercase tracking-wider mb-2">MARKET FILTER</div>
                      <Select value={selectedSport} onValueChange={setSelectedSport}>
                        <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-mono h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                          <SelectItem value="all" className="text-gray-900 dark:text-white font-mono">ALL MARKETS</SelectItem>
                          <SelectItem value="NFL" className="text-gray-900 dark:text-white font-mono">NFL</SelectItem>
                          <SelectItem value="NBA" className="text-gray-900 dark:text-white font-mono">NBA</SelectItem>
                          <SelectItem value="MLB" className="text-gray-900 dark:text-white font-mono">MLB</SelectItem>
                          <SelectItem value="NHL" className="text-gray-900 dark:text-white font-mono">NHL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="text-[#D8AC35] dark:text-[#00ff41] text-sm font-mono uppercase tracking-wider mb-2">+EV THRESHOLD</div>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <Slider
                            value={[parseFloat(minEV)]}
                            onValueChange={(value) => setMinEV(value[0].toString())}
                            max={20}
                            min={0}
                            step={0.5}
                            className="w-full"
                          />
                        </div>
                        <span className="text-[#D8AC35] dark:text-[#00ff41] font-mono text-lg font-bold min-w-16">+{minEV}%</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="text-[#D8AC35] dark:text-[#00ff41] text-sm font-mono uppercase tracking-wider mb-2">STATUS</div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-[#D8AC35] dark:bg-[#00ff41] rounded-full animate-pulse"></div>
                        <span className="text-[#D8AC35] dark:text-[#00ff41] font-mono text-lg">SCANNING LIVE</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trading Data Grid */}
                <div className="flex-1">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-700 border-t-[#D8AC35] dark:border-t-[#00ff41] rounded-full animate-spin"></div>
                        <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-800 border-t-[#D8AC35] dark:border-t-[#00ff41] rounded-full animate-spin absolute top-2 left-2" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                      </div>
                      <p className="text-[#D8AC35] dark:text-[#00ff41] font-mono text-sm mt-4 animate-pulse">ANALYZING MARKET CONDITIONS...</p>
                      <p className="text-gray-600 dark:text-gray-400 font-mono text-xs mt-1">Scanning 47 sportsbooks for arbitrage opportunities</p>
                    </div>
                  ) : (
                    <div 
                      className="overflow-x-auto"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        const container = e.currentTarget;
                        if (e.key === 'ArrowRight') container.scrollLeft += 100;
                        if (e.key === 'ArrowLeft') container.scrollLeft -= 100;
                      }}
                    >
                      <div className="min-w-[1400px] p-10">
                        

pl                        {/* Professional Trading Grid Header */}
                        <div className="mb-6">
                          {/* Header with Refresh Button */}
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-mono text-gray-800 dark:text-gray-200 font-semibold">LIVE BETTING OPPORTUNITIES</h3>
                            <button
                              onClick={async () => {
                                setLoading(true);
                                try {
                                  await new Promise(resolve => setTimeout(resolve, 500));
                                  window.location.reload();
                                } catch (error) {
                                  console.error("Failed to refresh odds:", error);
                                  setLoading(false);
                                }
                              }}
                              disabled={loading}
                              className="px-4 py-2 rounded-lg bg-[#D8AC35] dark:bg-[#00ff41] hover:bg-[#C4982A] dark:hover:bg-[#00e639] text-black font-mono font-semibold shadow-lg hover:shadow-[#D8AC35]/50 dark:hover:shadow-[#00ff41]/50 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Refresh odds data"
                            >
                              {loading ? 'REFRESHING...' : 'REFRESH'}
                            </button>
                          </div>

                          {/* Status Filter Toggle */}
                          <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
                              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                {(['all', 'prematch', 'live'] as const).map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                      statusFilter === status
                                        ? 'bg-[#D8AC35] dark:bg-[#00ff41] text-black dark:text-black shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                                  >
                                    {status === 'all' ? 'All' : status === 'prematch' ? 'Prematch' : 'Live'}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sport:</span>
                              <select
                                value={selectedSport}
                                onChange={(e) => setSelectedSport(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#D8AC35] dark:focus:ring-[#00ff41] focus:border-transparent"
                              >
                                <option value="all">All Sports</option>
                                <option value="mlb">MLB</option>
                                <option value="nba">NBA</option>
                                <option value="nfl">NFL</option>
                                <option value="nhl">NHL</option>
                                <option value="soccer">Soccer</option>
                                <option value="tennis">Tennis</option>
                                <option value="golf">Golf</option>
                                <option value="mma">MMA</option>
                                <option value="boxing">Boxing</option>
                              </select>
                            </div>
                          </div>

                          {/* Grid Header Structure */}
                          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 text-sm font-mono uppercase tracking-wider text-gray-600 dark:text-gray-400 border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
                            <div>EVENT</div>
                            <div>SPORT</div>
                            <div>BET TYPE</div>
                            <div>MARKET</div>
                            <div>LINE</div>
                            <div>IMPLIED PROB</div>
                            <div>CONSENSUS LINE</div>
                            <div>REAL-TIME EV</div>
                            <div>FAIR ODDS</div>
                          </div>
                          
                          {/* Book Logos Header - Only Once at Top */}
                          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">
                              Available Sportsbooks
                            </div>
                            <div className="flex flex-wrap gap-4 items-center">
                              {Object.keys(SPORTSBOOKS).map((book) => (
                                <div key={book} className="flex items-center gap-2">
                                  <img
                                    src={`/booklogos/${book.toLowerCase()}.png`}
                                    alt={book}
                                    className="w-6 h-6 object-contain"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                  />
                                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                                    {SPORTSBOOKS[book as keyof typeof SPORTSBOOKS].displayName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                    
                    {opportunities
                      .filter(opp => {
                        if (activeCategory === 'all') return true;
                        return opp.category === activeCategory;
                      })
                      .map((opp, index) => {
                        // 1) derive consensus probability for this row/outcome
                        // prefer server consensus only
                        const outcome = (opp as any).outcome; // "home" | "away" | "draw"
                                // Use the new consensus structure from the server
                                const consensus = (opp as any)?.consensus;
                                const consensusProb: number | undefined = consensus?.prob;
                                const hasConsensus = consensusProb !== undefined && consensusProb > 0.01 && consensusProb < 0.99;
        
        // 2) EV% using the main book odds against consensus
        const plausibleBooks = opp.oddsComparison.filter(b => isPlausibleAmerican(b.odds));
        const mainBook = mainSportsbook === 'all'
          ? plausibleBooks.find(b => b.isMainBook) ?? plausibleBooks[0]
          : plausibleBooks.find(b => b.sportsbook.toLowerCase() === mainSportsbook.toLowerCase());

        const evPct = (hasConsensus && mainBook) ? (() => {
          const dec = mainBook.odds >= 0 ? 1 + mainBook.odds/100 : 1 + 100/Math.abs(mainBook.odds);
          if (!Number.isFinite(dec) || dec <= 1) return undefined;
          const stake = 100;
          const profitIfWin = stake * (dec - 1);
          const ev = consensusProb! * profitIfWin - (1 - consensusProb!) * stake;
          return (ev / stake) * 100;
        })() : undefined;

        // 3) Field average (use corrected function)
        const fieldAverage = calculateFieldAverage(opp.oddsComparison);

        // 4) Get status for live game display
        const gameStatus = (opp as any)?.status || (opp as any)?.event?.status || 'prematch';
        const isLive = gameStatus === 'live';
        const clockInfo = (opp as any)?.clock?.time || (opp as any)?.event?.timeLeft;

        // 5) Developer diagnostics (kept in dev only)
        if (process.env.NODE_ENV !== 'production') {
          if (consensusProb !== undefined && (consensusProb <= 0.01 || consensusProb >= 0.99)) {
            console.warn('[CONSENSUS-HIDDEN]', opp.id, consensusProb, consensus?.samples);
          }
          if (!isPlausibleAmerican(mainBook?.odds)) {
            console.warn('[MAINBOOK-ODDS-IMPLAUSIBLE]', opp.id, mainBook?.odds, mainBook?.sportsbook);
          }
          
          // Dev-only consensus validation
          if (consensus && consensus.reason) {
            console.warn('[CONSENSUS-REASON]', opp.id, consensus.reason, consensus.samples);
          }
        }
                      
                        return (
                          <div key={`${opp.id}-${index}`} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center py-4 px-4 rounded-lg border-l-4 border-l-[#D8AC35] dark:border-l-[#00ff41] bg-white/60 dark:bg-gray-900/30 hover:bg-white/80 dark:hover:bg-gray-900/50 transition-all duration-300 mb-3 backdrop-blur-sm">
                            {/* Event Column */}
                            <div className="flex items-center min-h-[40px] font-mono text-sm text-gray-900 dark:text-white">
                              <div>
                                <div className="font-semibold">{opp.game}</div>
                                {/* Live Status Badge */}
                                {isLive && (
                                  <div className="mt-1 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-red-600 dark:text-red-400 font-semibold">LIVE</span>
                                    {clockInfo && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {clockInfo}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {opp.category && opp.category !== 'ev' && (
                                  <div className="mt-1">
                              {/* CategoryBadge removed - not essential for consensus fixes */}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Sport */}
                            <div className="flex items-center min-h-[40px] font-mono text-sm text-gray-600 dark:text-gray-300">{opp.sport}</div>
                            
                            {/* Bet Type */}
                            <div className="flex items-center min-h-[40px] font-mono text-sm text-gray-600 dark:text-gray-300">{opp.betType}</div>
                            
                            {/* Market */}
                            <div className="flex items-center min-h-[40px] font-mono text-sm text-gray-600 dark:text-gray-300">{opp.line}</div>
                            
                            {/* Line */}
                            <div className="flex items-center min-h-[40px] font-mono text-sm text-gray-600 dark:text-gray-300">{opp.line}</div>
                            
                            {/* Implied Prob */}
                            <div className="flex items-center min-h-[40px] font-mono text-sm text-gray-600 dark:text-gray-300">
                              {formatProbPct(consensusProb)}
                            </div>
                            
                            {/* Consensus Line */}
                            <div className="flex items-center min-h-[40px] font-mono text-sm text-gray-600 dark:text-gray-300">
                              {formatMyOdds(consensusProb)}
                            </div>
                            
                            {/* Real-Time EV */}
                            <div className={`font-mono text-sm font-bold flex items-center justify-center min-h-[36px] px-3 py-2 rounded ${evPct !== undefined ? getEVColor(evPct) : 'bg-gray-400'}`}>
                              {evPct !== undefined ? (evPct > 0 ? '+' : '') + evPct.toFixed(1) + '%' : '—'}
                            </div>
                            
                            {/* Fair Odds */}
                            <div className="flex items-center min-h-[40px] font-mono text-sm text-gray-600 dark:text-gray-300">
                              {formatMyOdds(consensusProb)}
                            </div>
                          </div>
                        );
                    })}
                    </div>
                  </div>
                )}
                </div>
            </TabsContent>

            <TabsContent value="calculator" className="min-h-screen m-0 p-0 flex-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalculatorIcon className="h-5 w-5" />
                  Professional EV Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Professional Calculator Interface matching the design */}
                <div className="bg-gray-900 text-white rounded-lg p-6">
                  {/* Header with stats */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">SHARP SHOT CALCULATOR</h2>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-300">LIVE</span>
                    </div>
                  </div>

                  {/* Status Filter Toggle */}
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                      {(['all', 'prematch', 'live'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            statusFilter === status
                              ? 'bg-[#D8AC35] dark:bg-[#00ff41] text-black dark:text-black shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          {status === 'all' ? 'All' : status === 'prematch' ? 'Prematch' : 'Live'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sport Filter */}
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sport:</span>
                    <select
                      value={selectedSport}
                      onChange={(e) => setSelectedSport(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#D8AC35] dark:focus:ring-[#00ff41] focus:border-transparent"
                    >
                      <option value="all">All Sports</option>
                      <option value="mlb">MLB</option>
                      <option value="nba">NBA</option>
                      <option value="nfl">NFL</option>
                      <option value="nhl">NHL</option>
                      <option value="soccer">Soccer</option>
                      <option value="tennis">Tennis</option>
                      <option value="golf">Golf</option>
                      <option value="mma">MMA</option>
                      <option value="boxing">Boxing</option>
                    </select>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-8 mb-8">
                    <div className="text-center">
                      <div className="text-gray-400 text-sm font-semibold mb-2">BOOKS</div>
                      <div className="text-4xl font-bold">47</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400 text-sm font-semibold mb-2">+EV FOUND</div>
                      <div className="text-4xl font-bold text-green-500">1,247</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400 text-sm font-semibold mb-2">AVG CLV</div>
                      <div className="text-4xl font-bold text-[#D8AC35]">+4.2%</div>
                    </div>
                  </div>

                  {/* Live Opportunities */}
                  <div className="space-y-3">
                    <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                      <div className="text-white">
                        <span className="font-semibold">LAL vs GSW</span>
                        <span className="text-gray-400 mx-2">•</span>
                        <span className="text-gray-300">O225.5</span>
                      </div>
                      <div className="bg-green-500 text-black px-3 py-1 rounded font-bold text-sm">
                        +8.3%
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                      <div className="text-white">
                        <span className="font-semibold">MIA vs BOS</span>
                        <span className="text-gray-400 mx-2">•</span>
                        <span className="text-gray-300">U112.5</span>
                      </div>
                      <div className="bg-green-500 text-black px-3 py-1 rounded font-bold text-sm">
                        +6.1%
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                      <div className="text-white">
                        <span className="font-semibold">DAL -3.5</span>
                        <span className="text-gray-400 mx-2">•</span>
                        <span className="text-gray-300">1H</span>
                      </div>
                      <div className="bg-green-500 text-black px-3 py-1 rounded font-bold text-sm">
                        +4.7%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Traditional Calculator Below */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="american-odds">American Odds</Label>
                      <Input id="american-odds" type="number" placeholder="-110" />
                    </div>
                    <div>
                      <Label htmlFor="true-probability">True Probability (%)</Label>
                      <Input id="true-probability" type="number" placeholder="52.4" />
                    </div>
                    <div>
                      <Label htmlFor="stake">Stake ($)</Label>
                      <Input id="stake" type="number" placeholder="100" />
                    </div>
                    <Button className="w-full bg-[#D8AC35] text-black hover:bg-[#D8AC35]/90">
                      Calculate EV
                    </Button>
                  </div>
                  <div className="col-span-2 p-6 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-4">Expected Value Result</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Implied Probability:</strong> 52.38%</p>
                      <p><strong>Expected Value:</strong> <span className="text-green-600 font-bold">+$2.18</span></p>
                      <p><strong>EV Percentage:</strong> <span className="text-green-600 font-bold">+2.18%</span></p>
                      <p><strong>Long-term Profit:</strong> $21.80 per 100 bets</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </TabsContent>

            <TabsContent value="comparison" className="min-h-screen m-0 p-0 flex-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Odds Comparison - Sample Bet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg font-semibold text-sm border-b mb-4">
                  <div>Sportsbook</div>
                  <div>Odds</div>
                  <div>+EV</div>
                  <div>Action</div>
                </div>

                <div className="space-y-4">
                  {opportunities.length > 0 && opportunities[0].oddsComparison.map((comp, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded-lg items-center">
                      <div className="flex items-center gap-2">
                        <SportsbookDot sportsbook={comp.sportsbook} size="md" />
                        <span className="font-semibold">{comp.sportsbook}</span>
                        {comp.isMainBook && <Badge className="bg-blue-100 text-blue-800">Your Book</Badge>}
                      </div>
                      <div className="font-bold">{formatOdds(comp.odds)}</div>
                      <div className={`font-semibold ${comp.ev >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {comp.ev >= 0 ? '+' : ''}{comp.ev}%
                      </div>
                      <div className="text-sm text-gray-600">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="hover:bg-[#D8AC35] hover:text-black transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Bet
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}