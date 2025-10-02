import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SportsbookLogo } from '@/components/SportsbookLogo';
import {
  Search, Calculator, TrendingUp, DollarSign, Trash2, Download, Upload,
  BarChart3, PieChart, Target, AlertTriangle, CheckCircle, Clock,
  Filter, RefreshCw, Settings, BookOpen, TrendingDown
} from 'lucide-react';
import {
  decimalToAmerican,
  americanToDecimal,
  formatOddsDisplay,
  kellyPercentFrom,
  calculateProfit,
  normalizeBookName,
  findBestOdds,
  calculateImpliedProbability,
  calculateEV,
  calculateStake
} from '@/utils/bettingUtils';

export type SavedBet = {
  id: string;
  timestamp: string;
  event: string;
  league?: string;
  prop?: string;
  market: string;
  selection: string;
  book: string;
  decimalOdds: number;
  americanOdds: string;
  evPercent: number;
  gameStatus?: 'live' | 'upcoming' | 'final';
  gameTime?: string;
  winProbability?: number;
  myOddsEuropean?: number;
  fieldOdds?: Array<{ book: string; american?: number; european?: number; odds?: number; url?: string }>;
  // Enrichment from Games API (excitement metrics)
  points?: number;
  highPoints?: number;
  pointsLevel?: string;
  rationale?: string;
  headline?: string;
  // Odds splits data (betting percentages)
  betsPercentage?: number;
  handlePercentage?: number;
};

interface EVCalculatorProps {
  savedBets: SavedBet[];
  orderedBooks: string[];
  primaryBook: string;
  selectedSportsbook: string;
  onRemove?: (id: string) => void;
}

export default function EVCalculator({ savedBets, orderedBooks, primaryBook, selectedSportsbook, onRemove }: EVCalculatorProps) {
  console.log('🔍 [EV CALCULATOR] Component rendered with props:', {
    savedBetsCount: savedBets?.length || 0,
    orderedBooksCount: orderedBooks?.length || 0,
    primaryBook,
    selectedSportsbook,
    sampleBet: savedBets?.[0],
    allSavedBets: savedBets
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'ev' | 'kelly' | 'timestamp' | 'odds' | 'profit' | 'risk'>('ev');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [bankroll, setBankroll] = useState<number>(1000);
  const [kellyFraction, setKellyFraction] = useState<number>(0.25);
  const [showCalculator, setShowCalculator] = useState(false);
  const [activeTab, setActiveTab] = useState('bets');

  // Advanced filters
  const [filterSport, setFilterSport] = useState('all');
  const [filterMarket, setFilterMarket] = useState('all');
  const [filterEVRange, setFilterEVRange] = useState({ min: -100, max: 100 });
  const [filterKellyRange, setFilterKellyRange] = useState({ min: 0, max: 50 });
  const [showOnlyPositiveEV, setShowOnlyPositiveEV] = useState(false);
  const [showOnlyLive, setShowOnlyLive] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);

  // Risk management
  const [maxRiskPerBet, setMaxRiskPerBet] = useState<number>(5); // % of bankroll
  const [totalRiskLimit, setTotalRiskLimit] = useState<number>(25); // % of bankroll

  // Track changes to savedBets
  useEffect(() => {
    console.log('🔍 [EV CALCULATOR] savedBets changed:', {
      count: savedBets?.length || 0,
      bets: savedBets
    });
  }, [savedBets]);

  // Get all available sportsbooks from the saved bets data
  const allAvailableBooks = useMemo(() => {
    const booksSet = new Set<string>();
    savedBets.forEach(bet => {
      if (bet.fieldOdds && Array.isArray(bet.fieldOdds)) {
        bet.fieldOdds.forEach(odds => {
          if (odds.book) {
            booksSet.add(odds.book);
          }
        });
      }
    });
    const allBooks = Array.from(booksSet);
    console.log('🔍 [EV CALCULATOR] Found sportsbooks in data:', allBooks);
    // Order them with primary book first, then the rest alphabetically
    return [primaryBook, ...allBooks.filter(book => book !== primaryBook).sort()];
  }, [savedBets, primaryBook]);

  // Use all available books instead of just the predefined ordered books
  const displayBooks = allAvailableBooks.length > 0 ? allAvailableBooks : orderedBooks;

  // Get unique values for filters
  const uniqueSports = useMemo(() => {
    const sports = [...new Set(savedBets.map(bet => bet.league).filter(Boolean))];
    return sports.sort();
  }, [savedBets]);

  const uniqueMarkets = useMemo(() => {
    const markets = [...new Set(savedBets.map(bet => bet.market))];
    return markets.sort();
  }, [savedBets]);

  // Helper function to calculate proper EV percentage for a bet
  const calculateBetEV = (bet: SavedBet): number => {
    const winProb = bet.winProbability || 0; // This is our model's probability
    const p = winProb / 100; // Convert to decimal
    const b = bet.decimalOdds - 1; // Net payout per $1
    const evPerDollar = p * b - (1 - p); // EV per $1 staked
    return evPerDollar * 100; // Convert to percentage
  };

  // Debug logging for received props
  useEffect(() => {
    console.log('🔍 [EV CALCULATOR] Received props:', {
      savedBetsCount: savedBets?.length || 0,
      firstBet: savedBets?.[0] ? {
        id: savedBets[0].id,
        event: savedBets[0].event,
        winProbability: savedBets[0].winProbability,
        evPercent: savedBets[0].evPercent,
        decimalOdds: savedBets[0].decimalOdds,
        calculatedEV: savedBets[0] ? calculateBetEV(savedBets[0]) : 'N/A'
      } : null
    });
  }, [savedBets]);

  // Advanced filter and sort logic
  const filteredAndSortedBets = useMemo(() => {
    console.log('🔍 [EV CALCULATOR] Starting filter process with savedBets:', savedBets);

    let filtered = savedBets.filter(bet => {
      console.log('🔍 [EV CALCULATOR] Processing bet:', bet);

      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          bet.event.toLowerCase().includes(query) ||
          bet.selection.toLowerCase().includes(query) ||
          bet.market.toLowerCase().includes(query) ||
          (bet.league && bet.league.toLowerCase().includes(query))
        );
        if (!matchesSearch) {
          console.log('🔍 [EV CALCULATOR] Bet filtered out by search query');
          return false;
        }
      }

      // Sport filter
      if (filterSport !== 'all' && bet.league !== filterSport) {
        console.log('🔍 [EV CALCULATOR] Bet filtered out by sport filter');
        return false;
      }

      // Market filter
      if (filterMarket !== 'all' && bet.market !== filterMarket) {
        console.log('🔍 [EV CALCULATOR] Bet filtered out by market filter');
        return false;
      }

      // EV range filter
      const betEV = calculateBetEV(bet);
      console.log('🔍 [EV CALCULATOR] Bet EV:', betEV, 'Range:', filterEVRange);
      if (betEV < filterEVRange.min || betEV > filterEVRange.max) {
        console.log('🔍 [EV CALCULATOR] Bet filtered out by EV range');
        return false;
      }

      // Kelly range filter
      const kelly = kellyPercentFrom(bet.winProbability, bet.decimalOdds) || 0;
      console.log('🔍 [EV CALCULATOR] Bet Kelly:', kelly, 'Range:', filterKellyRange);
      if (kelly < filterKellyRange.min || kelly > filterKellyRange.max) {
        console.log('🔍 [EV CALCULATOR] Bet filtered out by Kelly range');
        return false;
      }

      // Positive EV only filter
      if (showOnlyPositiveEV && betEV <= 0) {
        console.log('🔍 [EV CALCULATOR] Bet filtered out by positive EV filter');
        return false;
      }

      // Live games only filter
      if (showOnlyLive && bet.gameStatus !== 'live') {
        console.log('🔍 [EV CALCULATOR] Bet filtered out by live games filter');
        return false;
      }

      // Selected books filter
      if (selectedBooks.length > 0 && !selectedBooks.includes(bet.book)) {
        console.log('🔍 [EV CALCULATOR] Bet filtered out by books filter');
        return false;
      }

      console.log('🔍 [EV CALCULATOR] Bet passed all filters');
      return true;
    });

    return filtered.sort((a, b) => {
      let aVal: number, bVal: number;

      switch (sortBy) {
        case 'ev':
          aVal = calculateBetEV(a);
          bVal = calculateBetEV(b);
          break;
        case 'kelly':
          const aKelly = kellyPercentFrom(a.winProbability, a.decimalOdds) || 0;
          const bKelly = kellyPercentFrom(b.winProbability, b.decimalOdds) || 0;
          aVal = aKelly;
          bVal = bKelly;
          break;
        case 'timestamp':
          aVal = new Date(a.timestamp).getTime();
          bVal = new Date(b.timestamp).getTime();
          break;
        case 'odds':
          aVal = a.decimalOdds;
          bVal = b.decimalOdds;
          break;
        case 'profit':
          const aProfit = calculateProfit(bankroll * (kellyPercentFrom(a.winProbability, a.decimalOdds) || 0) / 100 * kellyFraction, a.decimalOdds);
          const bProfit = calculateProfit(bankroll * (kellyPercentFrom(b.winProbability, b.decimalOdds) || 0) / 100 * kellyFraction, b.decimalOdds);
          aVal = aProfit;
          bVal = bProfit;
          break;
        case 'risk':
          const aRisk = (bankroll * (kellyPercentFrom(a.winProbability, a.decimalOdds) || 0) / 100 * kellyFraction) / bankroll * 100;
          const bRisk = (bankroll * (kellyPercentFrom(b.winProbability, b.decimalOdds) || 0) / 100 * kellyFraction) / bankroll * 100;
          aVal = aRisk;
          bVal = bRisk;
          break;
        default:
          return 0;
      }

      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [savedBets, searchQuery, sortBy, sortOrder, filterSport, filterMarket, filterEVRange, filterKellyRange, showOnlyPositiveEV, showOnlyLive, selectedBooks, bankroll, kellyFraction]);

  // Calculate comprehensive portfolio statistics
  const portfolioStats = useMemo(() => {
    if (filteredAndSortedBets.length === 0) return null;

    const totalEV = filteredAndSortedBets.reduce((sum, bet) => sum + calculateBetEV(bet), 0);
    const avgEV = totalEV / filteredAndSortedBets.length;
    const positiveBets = filteredAndSortedBets.filter(bet => calculateBetEV(bet) > 0).length;
    const liveBets = filteredAndSortedBets.filter(bet => bet.gameStatus === 'live').length;

    const totalKelly = filteredAndSortedBets.reduce((sum, bet) => {
      const kelly = kellyPercentFrom(bet.winProbability, bet.decimalOdds) || 0;
      return sum + kelly;
    }, 0);
    const avgKelly = totalKelly / filteredAndSortedBets.length;

    const totalStake = filteredAndSortedBets.reduce((sum, bet) => {
      const kelly = kellyPercentFrom(bet.winProbability, bet.decimalOdds) || 0;
      const stake = bankroll * (kelly / 100) * kellyFraction;
      return sum + Math.min(stake, bankroll * maxRiskPerBet / 100);
    }, 0);

    const totalPotentialProfit = filteredAndSortedBets.reduce((sum, bet) => {
      const kelly = kellyPercentFrom(bet.winProbability, bet.decimalOdds) || 0;
      const stake = Math.min(
        bankroll * (kelly / 100) * kellyFraction,
        bankroll * maxRiskPerBet / 100
      );
      return sum + calculateProfit(stake, bet.decimalOdds);
    }, 0);

    const riskExposure = (totalStake / bankroll) * 100;
    const expectedReturn = filteredAndSortedBets.reduce((sum, bet) => {
      const kelly = kellyPercentFrom(bet.winProbability, bet.decimalOdds) || 0;
      const stake = Math.min(
        bankroll * (kelly / 100) * kellyFraction,
        bankroll * maxRiskPerBet / 100
      );
      const winProb = (bet.winProbability || 0) / 100;
      return sum + (stake * bet.decimalOdds * winProb - stake);
    }, 0);

    const sharpeRatio = avgEV > 0 ? avgEV / Math.sqrt(avgKelly) : 0;

    return {
      totalBets: filteredAndSortedBets.length,
      avgEV,
      positiveBets,
      liveBets,
      positiveRate: (positiveBets / filteredAndSortedBets.length) * 100,
      avgKelly,
      totalKelly,
      totalStake,
      totalPotentialProfit,
      riskExposure,
      expectedReturn,
      sharpeRatio,
      riskAdjustedReturn: expectedReturn / Math.max(riskExposure, 1)
    };
  }, [filteredAndSortedBets, bankroll, kellyFraction, maxRiskPerBet]);

  if (!savedBets || savedBets.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="w-full bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              EV Calculator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No Saved Bets</h3>
              <p className="text-sm text-gray-400 mb-4">
                Save betting opportunities from the Live Terminal to analyze their expected value and calculate optimal stakes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="p-4 bg-gray-800 rounded-lg">
                  <Target className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <h4 className="font-medium text-white mb-1">Kelly Criterion</h4>
                  <p className="text-xs text-gray-400">Optimal stake sizing based on edge and bankroll</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <h4 className="font-medium text-white mb-1">Portfolio Analysis</h4>
                  <p className="text-xs text-gray-400">Track performance and risk across all bets</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                  <h4 className="font-medium text-white mb-1">Risk Management</h4>
                  <p className="text-xs text-gray-400">Set limits and monitor exposure</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Portfolio Statistics */}
      {portfolioStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-white">{portfolioStats.totalBets}</div>
              <div className="text-xs text-gray-400">Total Bets</div>
              {portfolioStats.liveBets > 0 && (
                <div className="text-xs text-red-400 mt-1">{portfolioStats.liveBets} Live</div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-3">
              <div className={`text-xl font-bold ${portfolioStats.avgEV > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {portfolioStats.avgEV > 0 ? '+' : ''}{portfolioStats.avgEV.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">Avg EV</div>
              <div className="text-xs text-gray-500">{portfolioStats.positiveRate.toFixed(0)}% positive</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-yellow-400">{portfolioStats.avgKelly.toFixed(1)}%</div>
              <div className="text-xs text-gray-400">Avg Kelly</div>
              <div className="text-xs text-gray-500">Max: {Math.max(...filteredAndSortedBets.map(b => kellyPercentFrom(b.winProbability, b.decimalOdds) || 0)).toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-purple-400">${portfolioStats.totalStake.toFixed(0)}</div>
              <div className="text-xs text-gray-400">Total Stake</div>
              <div className="text-xs text-gray-500">{portfolioStats.riskExposure.toFixed(1)}% of bankroll</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-green-400">${portfolioStats.totalPotentialProfit.toFixed(0)}</div>
              <div className="text-xs text-gray-400">Max Profit</div>
              <div className="text-xs text-gray-500">{((portfolioStats.totalPotentialProfit / bankroll) * 100).toFixed(1)}% ROI</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-3">
              <div className={`text-xl font-bold ${portfolioStats.expectedReturn > 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${portfolioStats.expectedReturn.toFixed(0)}
              </div>
              <div className="text-xs text-gray-400">Expected Return</div>
              <div className="text-xs text-gray-500">{((portfolioStats.expectedReturn / bankroll) * 100).toFixed(1)}% EV</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-3">
              <div className={`text-xl font-bold ${portfolioStats.riskExposure > totalRiskLimit ? 'text-red-400' : portfolioStats.riskExposure > totalRiskLimit * 0.8 ? 'text-yellow-400' : 'text-green-400'}`}>
                {portfolioStats.riskExposure.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">Risk Exposure</div>
              <div className="text-xs text-gray-500">Limit: {totalRiskLimit}%</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-blue-400">{portfolioStats.sharpeRatio.toFixed(2)}</div>
              <div className="text-xs text-gray-400">Sharpe Ratio</div>
              <div className="text-xs text-gray-500">Risk-adj return</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800">
          <TabsTrigger value="bets" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Saved Bets ({filteredAndSortedBets.length})
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risk Management
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bets" className="space-y-4">
          {/* Search and Filter Controls */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search bets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gray-800 border-gray-600"
                  />
                </div>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[140px] bg-gray-800 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ev">Sort by EV</SelectItem>
                    <SelectItem value="kelly">Sort by Kelly</SelectItem>
                    <SelectItem value="profit">Sort by Profit</SelectItem>
                    <SelectItem value="risk">Sort by Risk</SelectItem>
                    <SelectItem value="timestamp">Sort by Time</SelectItem>
                    <SelectItem value="odds">Sort by Odds</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="px-3"
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCalculator(!showCalculator)}
                  className="flex items-center gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  {showCalculator ? 'Hide' : 'Show'} Calculator
                </Button>
              </div>

              {/* Advanced Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Sport</label>
                  <Select value={filterSport} onValueChange={setFilterSport}>
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sports</SelectItem>
                      {uniqueSports.map(sport => (
                        <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Market</label>
                  <Select value={filterMarket} onValueChange={setFilterMarket}>
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Markets</SelectItem>
                      {uniqueMarkets.map(market => (
                        <SelectItem key={market} value={market}>{market}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="positive-ev"
                    checked={showOnlyPositiveEV}
                    onCheckedChange={setShowOnlyPositiveEV}
                  />
                  <label htmlFor="positive-ev" className="text-xs text-gray-400">+EV Only</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="live-only"
                    checked={showOnlyLive}
                    onCheckedChange={setShowOnlyLive}
                  />
                  <label htmlFor="live-only" className="text-xs text-gray-400">Live Only</label>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Min EV %</label>
                  <Input
                    type="number"
                    value={filterEVRange.min}
                    onChange={(e) => setFilterEVRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                    className="bg-gray-800 border-gray-600"
                    placeholder="-100"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Max Kelly %</label>
                  <Input
                    type="number"
                    value={filterKellyRange.max}
                    onChange={(e) => setFilterKellyRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                    className="bg-gray-800 border-gray-600"
                    placeholder="50"
                  />
                </div>
              </div>

              {/* Kelly Calculator */}
              {showCalculator && (
                <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Kelly Criterion Calculator
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Bankroll ($)</label>
                      <Input
                        type="number"
                        value={bankroll}
                        onChange={(e) => setBankroll(Number(e.target.value))}
                        className="bg-gray-700 border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Kelly Fraction</label>
                      <Select value={kellyFraction.toString()} onValueChange={(value) => setKellyFraction(Number(value))}>
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.1">10% (Conservative)</SelectItem>
                          <SelectItem value="0.25">25% (Moderate)</SelectItem>
                          <SelectItem value="0.5">50% (Aggressive)</SelectItem>
                          <SelectItem value="1">100% (Full Kelly)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Max Risk per Bet (%)</label>
                      <Input
                        type="number"
                        value={maxRiskPerBet}
                        onChange={(e) => setMaxRiskPerBet(Number(e.target.value))}
                        className="bg-gray-700 border-gray-600"
                        min="0.1"
                        max="25"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Total Risk Limit (%)</label>
                      <Input
                        type="number"
                        value={totalRiskLimit}
                        onChange={(e) => setTotalRiskLimit(Number(e.target.value))}
                        className="bg-gray-700 border-gray-600"
                        min="1"
                        max="100"
                        step="1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Simple Bets Table */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Saved Bets ({filteredAndSortedBets.length || savedBets.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const list = filteredAndSortedBets.length ? filteredAndSortedBets : savedBets;
                if (!list || list.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-400">No saved bets to display</div>
                  );
                }

                const toDecimal = (fo?: { american?: number; european?: number; odds?: number }) => {
                  if (!fo) return undefined;
                  if (typeof fo.european === 'number') return fo.european;
                  if (typeof fo.american === 'number') return americanToDecimal(fo.american);
                  if (typeof fo.odds === 'number') return (fo.odds > 0 && fo.odds < 100) ? fo.odds : americanToDecimal(fo.odds);
                };

                return (
                  <div className="overflow-x-auto rounded-xl">
                    <table className="w-full text-xs min-w-[1400px]">
                      <thead className="sticky top-0 backdrop-blur-md bg-black/70 z-10">
                        <tr className="border-b border-gray-600">
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-300 uppercase tracking-wide min-w-[180px]">MATCHUP & STATUS</th>
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-300 uppercase tracking-wide min-w-[70px]">SPORT</th>
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-300 uppercase tracking-wide min-w-[160px]">BET SELECTION</th>
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-300 uppercase tracking-wide min-w-[100px]">BEST PRICE</th>
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-300 uppercase tracking-wide min-w-[100px]">MY BOOK</th>
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-300 uppercase tracking-wide min-w-[80px]">IMPLIED %</th>
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-300 uppercase tracking-wide min-w-[120px]">EXPECTED VALUE</th>
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-300 uppercase tracking-wide min-w-[80px]">KELLY %</th>
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-300 uppercase tracking-wide min-w-[80px]">STAKE</th>
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-300 uppercase tracking-wide min-w-[80px]">PROFIT</th>
                          {orderedBooks.map((book) => (
                            <th key={book} className="text-center px-2 py-2 text-xs font-bold text-gray-300 uppercase tracking-wide min-w-[80px]">
                              {book}
                            </th>
                          ))}
                          <th className="text-center px-3 py-2 text-xs font-bold text-gray-300 uppercase tracking-wide min-w-[80px]">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((bet, index) => {
                          const myDec = toDecimal(bet.myOdds);
                          const bestDec = toDecimal(bet.bestOdds);
                          const impliedProb = myDec ? (1 / myDec) * 100 : 0;
                          const evPerDollar = bet.winProbability && myDec ?
                            (bet.winProbability * (myDec - 1)) - (1 - bet.winProbability) : 0;
                          const evPercent = evPerDollar * 100;
                          const kelly = kellyPercentFrom(bet.winProbability, myDec || bet.decimalOdds) || 0;

                          return (
                            <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                              <td className="px-3 py-3">
                                <div className="flex flex-col">
                                  <div className="font-medium text-gray-200 text-xs">
                                    {bet.team1} vs {bet.team2}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {bet.status || 'Upcoming'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <span className="text-xs text-gray-300 uppercase font-medium">
                                  {bet.league}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex flex-col">
                                  <div className="text-xs text-gray-200 font-medium">
                                    {bet.market}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {bet.selection}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex flex-col">
                                  <div className="text-xs font-bold text-green-400">
                                    {bestDec ? bestDec.toFixed(2) : 'N/A'}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {bet.bestOdds?.american ? formatOddsDisplay(bet.bestOdds.american, bet.bestOdds.european, bestDec) : 'N/A'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex flex-col">
                                  <div className="text-xs font-bold text-blue-400">
                                    {myDec ? myDec.toFixed(2) : 'N/A'}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {bet.myOdds?.american ? formatOddsDisplay(bet.myOdds.american, bet.myOdds.european, myDec) : 'N/A'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <span className="text-xs text-gray-300">
                                  {impliedProb.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex flex-col">
                                  <div className={`text-xs font-bold ${evPercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {evPercent > 0 ? '+' : ''}{evPercent.toFixed(1)}%
                                  </div>
                                  <div className={`text-xs ${evPerDollar > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ${(evPerDollar * (bet.stake || 0)).toFixed(2)}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <span className="text-xs text-gray-300">
                                  {kelly.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <span className="text-xs text-gray-300">
                                  ${bet.stake || 0}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <span className="text-xs text-green-400 font-medium">
                                  ${myDec && bet.stake ? ((myDec - 1) * bet.stake).toFixed(2) : '0.00'}
                                </span>
                              </td>
                              {orderedBooks.map((book) => {
                                const bookOdds = bet.fieldOdds?.find(fo => normalizeBookName(fo.book) === book);
                                const dec = toDecimal(bookOdds);
                                const isBest = bet.bestBook && normalizeBookName(bet.bestBook) === book;

                                return (
                                  <td key={book} className="px-2 py-3 text-center">
                                    {bookOdds ? (
                                      <button
                                        onClick={() => bookOdds.url && window.open(bookOdds.url, '_blank')}
                                        className={`w-full px-2 py-1 rounded text-xs font-medium transition-colors ${
                                          isBest
                                            ? 'bg-green-600 text-white ring-2 ring-green-400'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                        }`}
                                      >
                                        <div className="text-xs font-bold">{dec ? dec.toFixed(2) : 'N/A'}</div>
                                        <div className="text-[8px] opacity-75">
                                          {formatOddsDisplay(bookOdds?.american, bookOdds?.european, dec)}
                                        </div>
                                      </button>
                                    ) : (
                                      <span className="text-xs text-gray-500">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-3 text-center">
                                <button
                                  onClick={() => removeSavedBet(index)}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Performance Breakdown */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Performance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {portfolioStats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-800 rounded">
                        <div className="text-sm text-gray-400">Win Rate (Est.)</div>
                        <div className="text-xl font-bold text-green-400">
                          {(filteredAndSortedBets.reduce((sum, bet) => sum + (bet.winProbability || 0), 0) / filteredAndSortedBets.length).toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-3 bg-gray-800 rounded">
                        <div className="text-sm text-gray-400">Avg Odds</div>
                        <div className="text-xl font-bold text-blue-400">
                          {(filteredAndSortedBets.reduce((sum, bet) => sum + bet.decimalOdds, 0) / filteredAndSortedBets.length).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Positive EV Bets</span>
                        <span className="text-green-400">{portfolioStats.positiveBets} ({portfolioStats.positiveRate.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${portfolioStats.positiveRate}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Risk Exposure</span>
                        <span className={portfolioStats.riskExposure > totalRiskLimit ? 'text-red-400' : 'text-green-400'}>
                          {portfolioStats.riskExposure.toFixed(1)}% / {totalRiskLimit}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${portfolioStats.riskExposure > totalRiskLimit ? 'bg-red-500' : portfolioStats.riskExposure > totalRiskLimit * 0.8 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(portfolioStats.riskExposure / totalRiskLimit * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Market Distribution */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Market Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uniqueMarkets.slice(0, 6).map(market => {
                    const marketBets = filteredAndSortedBets.filter(bet => bet.market === market);
                    const percentage = (marketBets.length / filteredAndSortedBets.length) * 100;
                    const avgEV = marketBets.reduce((sum, bet) => sum + bet.evPercent, 0) / marketBets.length;

                    return (
                      <div key={market} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">{market}</span>
                          <span className="text-gray-400">{marketBets.length} bets ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-medium ${avgEV > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {avgEV > 0 ? '+' : ''}{avgEV.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Risk Alerts */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {portfolioStats && portfolioStats.riskExposure > totalRiskLimit && (
                    <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                      <div className="flex items-center gap-2 text-red-400 mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Risk Limit Exceeded</span>
                      </div>
                      <p className="text-sm text-gray-300">
                        Current exposure ({portfolioStats.riskExposure.toFixed(1)}%) exceeds your limit ({totalRiskLimit}%)
                      </p>
                    </div>
                  )}

                  {filteredAndSortedBets.some(bet => {
                    const kelly = kellyPercentFrom(bet.winProbability, bet.decimalOdds) || 0;
                    const stake = bankroll * (kelly / 100) * kellyFraction;
                    return (stake / bankroll * 100) > maxRiskPerBet;
                  }) && (
                    <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-400 mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">High Risk Bets</span>
                      </div>
                      <p className="text-sm text-gray-300">
                        Some bets exceed your per-bet risk limit ({maxRiskPerBet}%)
                      </p>
                    </div>
                  )}

                  {portfolioStats && portfolioStats.avgKelly > 10 && (
                    <div className="p-3 bg-orange-900/20 border border-orange-700 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-400 mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-medium">High Kelly Average</span>
                      </div>
                      <p className="text-sm text-gray-300">
                        Average Kelly ({portfolioStats.avgKelly.toFixed(1)}%) is quite high. Consider reducing Kelly fraction.
                      </p>
                    </div>
                  )}

                  {portfolioStats && portfolioStats.positiveRate < 50 && (
                    <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-400 mb-1">
                        <TrendingDown className="h-4 w-4" />
                        <span className="font-medium">Low Positive EV Rate</span>
                      </div>
                      <p className="text-sm text-gray-300">
                        Only {portfolioStats.positiveRate.toFixed(0)}% of bets have positive EV. Consider stricter filtering.
                      </p>
                    </div>
                  )}

                  {(!portfolioStats || (portfolioStats.riskExposure <= totalRiskLimit && portfolioStats.avgKelly <= 10 && portfolioStats.positiveRate >= 50)) && (
                    <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
                      <div className="flex items-center gap-2 text-green-400 mb-1">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Risk Profile Healthy</span>
                      </div>
                      <p className="text-sm text-gray-300">
                        Your current betting portfolio is within acceptable risk parameters.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Risk Metrics */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Risk Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {portfolioStats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-800 rounded">
                        <div className="text-sm text-gray-400">Sharpe Ratio</div>
                        <div className="text-xl font-bold text-purple-400">
                          {portfolioStats.sharpeRatio.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {portfolioStats.sharpeRatio > 1 ? 'Excellent' : portfolioStats.sharpeRatio > 0.5 ? 'Good' : 'Poor'}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-800 rounded">
                        <div className="text-sm text-gray-400">Risk-Adj Return</div>
                        <div className="text-xl font-bold text-cyan-400">
                          {portfolioStats.riskAdjustedReturn.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">Per % risk</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Kelly Diversification</span>
                          <span className="text-gray-300">
                            {(portfolioStats.avgKelly / Math.max(...filteredAndSortedBets.map(b => kellyPercentFrom(b.winProbability, b.decimalOdds) || 0)) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">Lower is better (more diversified)</div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Market Concentration</span>
                          <span className="text-gray-300">
                            {((Math.max(...uniqueMarkets.map(market =>
                              filteredAndSortedBets.filter(bet => bet.market === market).length
                            )) / filteredAndSortedBets.length) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">Largest market exposure</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Calculator Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-white">Bankroll Management</h4>
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Bankroll Amount ($)</label>
                    <Input
                      type="number"
                      value={bankroll}
                      onChange={(e) => setBankroll(Number(e.target.value))}
                      className="bg-gray-800 border-gray-600"
                      min="1"
                      step="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Your total betting bankroll</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Kelly Fraction</label>
                    <Select value={kellyFraction.toString()} onValueChange={(value) => setKellyFraction(Number(value))}>
                      <SelectTrigger className="bg-gray-800 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.05">5% (Very Conservative)</SelectItem>
                        <SelectItem value="0.1">10% (Conservative)</SelectItem>
                        <SelectItem value="0.25">25% (Moderate)</SelectItem>
                        <SelectItem value="0.5">50% (Aggressive)</SelectItem>
                        <SelectItem value="1">100% (Full Kelly)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Fraction of Kelly recommendation to bet</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-white">Risk Limits</h4>
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Max Risk per Bet (%)</label>
                    <Input
                      type="number"
                      value={maxRiskPerBet}
                      onChange={(e) => setMaxRiskPerBet(Number(e.target.value))}
                      className="bg-gray-800 border-gray-600"
                      min="0.1"
                      max="25"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum percentage of bankroll per bet</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Total Risk Limit (%)</label>
                    <Input
                      type="number"
                      value={totalRiskLimit}
                      onChange={(e) => setTotalRiskLimit(Number(e.target.value))}
                      className="bg-gray-800 border-gray-600"
                      min="1"
                      max="100"
                      step="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum total exposure across all bets</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white">Export/Import</h4>
                    <p className="text-sm text-gray-400">Save or load your betting data</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Import
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
