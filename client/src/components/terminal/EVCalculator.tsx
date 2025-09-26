import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, DollarSign, Percent, Filter, Search, BarChart3 } from 'lucide-react';

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

interface EVCalculatorProps {
  savedBets: SavedBet[];
}

export function EVCalculator({ savedBets }: EVCalculatorProps) {
  const [selectedBet, setSelectedBet] = useState<SavedBet | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'pre-match' | 'live'>('pre-match');

  const formatOdds = (odds: number): string => {
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  const formatEV = (ev: number): string => {
    return ev >= 0 ? `+${ev.toFixed(1)}%` : `${ev.toFixed(1)}%`;
  };

  const getEVColor = (ev: number): string => {
    if (ev > 0) return 'text-green-400';
    if (ev < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getEVBgColor = (ev: number): string => {
    if (ev > 0) return 'bg-green-500';
    if (ev < 0) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const filteredBets = savedBets.filter(bet =>
    bet.game.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bet.selection.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bet.market.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-lg font-semibold">PROP PROFESSOR</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Texas</span>
            <Button variant="outline" size="sm" className="text-xs">
              Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 min-h-screen">
          <div className="p-4">
            <div className="space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Sportsbook</div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>+EV</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                <span>Arbitrage</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Fantasy</div>
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4" />
                <span>Optimizer</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>Alt Optimizer</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4" />
                <span>Comparison</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calculator className="w-4 h-4" />
                <span>Slip Gen</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-wide">More</div>
              <div className="flex items-center gap-2 text-sm">
                <span>Screen</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>Hidden</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>Notifications</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>Discord Alerts</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Resources</div>
              <div className="flex items-center gap-2 text-sm">
                <Calculator className="w-4 h-4" />
                <span>Calculators</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>Learn</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Management</div>
              <div className="flex items-center gap-2 text-sm">
                <span>Settings</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>Subscription</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>Purchase</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>Affiliate</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {/* Top Controls */}
          <div className="bg-gray-800 border-b border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" className="text-xs">
                  <Filter className="w-4 h-4 mr-1" />
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Search className="w-4 h-4 mr-1" />
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <BarChart3 className="w-4 h-4 mr-1" />
                </Button>
                <Button variant="outline" size="sm" className="text-xs bg-red-600 text-white border-red-600">
                  Reset Column Sort
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Stability</span>
                <div className="w-4 h-4 bg-gray-600 rounded-full"></div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Card View</span>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'pre-match' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setViewMode('pre-match')}
                >
                  Pre-match
                </Button>
                <Button
                  variant={viewMode === 'live' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setViewMode('live')}
                >
                  Live
                </Button>
              </div>
            </div>
          </div>

          {/* Subscription Notice */}
          <div className="bg-red-900/20 border border-red-500/30 p-4 m-4 rounded">
            <div className="text-red-400 text-sm">
              You do not have an active sportsbook subscription
            </div>
            <div className="text-red-300 text-xs mt-1">
              You are being shown a free preview, with which you can only access 2 responses at a time
            </div>
          </div>

          {/* Bets Table */}
          <div className="p-4">
            {filteredBets.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No saved bets yet</p>
                <p className="text-sm">Click on bets in the terminal to save them here</p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-gray-700 text-xs font-medium text-gray-300 uppercase tracking-wide">
                  <div className="col-span-2">Game</div>
                  <div className="col-span-2">Selection</div>
                  <div className="col-span-2">Market</div>
                  <div className="col-span-1">Limit</div>
                  <div className="col-span-1">Kelly</div>
                  <div className="col-span-1">Book</div>
                  <div className="col-span-1">EV</div>
                  <div className="col-span-1">Odds</div>
                  <div className="col-span-1">P</div>
                </div>

                {/* Table Rows */}
                {filteredBets.map((bet, index) => (
                  <div
                    key={bet.id}
                    className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer ${
                      index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
                    }`}
                    onClick={() => setSelectedBet(bet)}
                  >
                    <div className="col-span-2 text-sm">{bet.game}</div>
                    <div className="col-span-2 text-sm text-gray-300">{bet.selection}</div>
                    <div className="col-span-2 text-sm text-gray-300">{bet.market}</div>
                    <div className="col-span-1 text-sm">$4.0</div>
                    <div className="col-span-1 text-sm">$6.2</div>
                    <div className="col-span-1">
                      <div className={`px-2 py-1 rounded text-xs text-center text-white ${getEVBgColor(bet.ev)}`}>
                        {bet.book.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className={`px-2 py-1 rounded text-xs text-center ${getEVBgColor(bet.ev)} text-white`}>
                        {formatEV(bet.ev)}
                      </div>
                    </div>
                    <div className="col-span-1 text-sm font-mono">{formatOdds(bet.odds)}</div>
                    <div className="col-span-1 text-sm text-gray-300">
                      {bet.book.includes('DK') && '🏀'}
                      {bet.book.includes('FD') && '⚽'}
                      {bet.book.includes('MGM') && '🏈'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
