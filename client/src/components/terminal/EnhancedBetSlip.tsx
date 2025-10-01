import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, TrendingUp, Calculator, ExternalLink, DollarSign, Target, Percent } from 'lucide-react';
import { SportsbookLogo } from '@/components/SportsbookLogo';
import { getSportsbookHomepage } from '@/shared/lib/sportsbookHomepages';

export interface BetSlipData {
  id: string;
  event: string;
  market: string;
  prop: string;
  playerName?: string;
  line?: number;
  sportsbook: string;
  odds: number; // American odds
  evPercent: number;
  winProbability?: number;
  url?: string;
  sport?: string;
  league?: string;
  gameTime?: string;
}

interface EnhancedBetSlipProps {
  isOpen: boolean;
  onClose: () => void;
  bet: BetSlipData | null;
  className?: string;
}

export function EnhancedBetSlip({ isOpen, onClose, bet, className = '' }: EnhancedBetSlipProps) {
  const [stake, setStake] = useState<number>(50);
  const [bankroll] = useState<number>(1000); // This could be user configurable

  // Calculate Kelly Criterion suggestion
  const kellyData = React.useMemo(() => {
    if (!bet || !bet.winProbability) return { kelly: 0, suggested: 0, fraction: 0 };
    
    const p = bet.winProbability / 100; // Convert percentage to decimal
    const decimalOdds = bet.odds > 0 ? (bet.odds / 100) + 1 : (100 / Math.abs(bet.odds)) + 1;
    const b = decimalOdds - 1; // Net odds
    
    const kelly = (p * (b + 1) - 1) / b; // Full Kelly
    const halfKelly = kelly / 2; // Conservative half-Kelly
    const suggested = Math.max(0, Math.min(bankroll * halfKelly, bankroll * 0.1)); // Max 10% of bankroll
    
    return {
      kelly: kelly * 100,
      suggested: Math.round(suggested),
      fraction: halfKelly * 100
    };
  }, [bet, bankroll]);

  // Calculate potential returns
  const returns = React.useMemo(() => {
    if (!bet || !stake) return { profit: 0, total: 0 };
    
    const decimalOdds = bet.odds > 0 ? (bet.odds / 100) + 1 : (100 / Math.abs(bet.odds)) + 1;
    const profit = stake * (decimalOdds - 1);
    const total = stake + profit;
    
    return { profit, total };
  }, [bet, stake]);

  // Handle place bet
  const handlePlaceBet = () => {
    if (!bet) return;
    
    const homepageUrl = getSportsbookHomepage(bet.sportsbook);
    window.open(homepageUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 transform transition-transform duration-300 ease-in-out ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
        <div className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Bet Slip</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!bet ? (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Target className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Bet Selected</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Click on any bet to see details and place your wager</p>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Bet Details */}
          <div className="p-4 space-y-4">
            {/* Event Info */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-blue-200 dark:border-gray-600">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                      {bet.event}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {bet.market} • {bet.prop}
                    </p>
                    {bet.playerName && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                        {bet.playerName}
                      </p>
                    )}
                    {bet.line && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Line: {bet.line}
                      </p>
                    )}
                  </div>
                  {bet.gameTime && (
                    <Badge variant="outline" className="text-xs">
                      {new Date(bet.gameTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sportsbook & Odds */}
            <Card className="border-green-200 dark:border-green-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <SportsbookLogo sportsbook={bet.sportsbook} size="md" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{bet.sportsbook}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Sportsbook</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">American Odds</p>
                  </div>
                </div>
                
                {/* EV Badge */}
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={bet.evPercent > 0 ? "default" : "secondary"}
                    className={`${bet.evPercent > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}`}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {bet.evPercent > 0 ? '+' : ''}{bet.evPercent.toFixed(1)}% EV
                  </Badge>
                  {bet.winProbability && (
                    <Badge variant="outline">
                      <Percent className="h-3 w-3 mr-1" />
                      {bet.winProbability.toFixed(1)}% Win
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Stake Input */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-900 dark:text-white">Stake Amount</label>
              </div>
              
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={stake}
                  onChange={(e) => setStake(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter stake amount"
                  min="0"
                  step="1"
                />
              </div>

              {/* Kelly Suggestion */}
              {kellyData.suggested > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Calculator className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Kelly Suggestion</span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Recommended: <span className="font-bold">${kellyData.suggested}</span>
                    <span className="text-xs ml-1">({kellyData.fraction.toFixed(1)}% of bankroll)</span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStake(kellyData.suggested)}
                    className="mt-2 text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
                  >
                    Use Kelly
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Potential Returns */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Potential Returns</h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Stake:</span>
                  <span className="font-medium">${stake.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Potential Profit:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">${returns.profit.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span className="text-gray-900 dark:text-white">Total Return:</span>
                  <span className="text-green-600 dark:text-green-400">${returns.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Place Bet Button */}
          <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <Button
              onClick={handlePlaceBet}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg"
              disabled={!stake || stake <= 0}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Place Bet on {bet.sportsbook}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              Opens {bet.sportsbook} in new tab
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
