import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Target, DollarSign, Percent, AlertTriangle } from 'lucide-react';

interface ArbitrageCalculatorProps {
  className?: string;
}

interface ArbitrageResult {
  isArbitrage: boolean;
  profitMargin: number;
  totalStake: number;
  stake1: number;
  stake2: number;
  profit: number;
  impliedProb1: number;
  impliedProb2: number;
  totalImpliedProb: number;
}

export function ArbitrageCalculator({ className }: ArbitrageCalculatorProps) {
  const [odds1, setOdds1] = useState<string>('');
  const [odds2, setOdds2] = useState<string>('');
  const [totalStake, setTotalStake] = useState<string>('1000');
  const [book1, setBook1] = useState<string>('Book A');
  const [book2, setBook2] = useState<string>('Book B');

  const result = useMemo((): ArbitrageResult | null => {
    const odds1Num = parseFloat(odds1);
    const odds2Num = parseFloat(odds2);
    const totalStakeNum = parseFloat(totalStake);

    if (isNaN(odds1Num) || isNaN(odds2Num) || isNaN(totalStakeNum) || totalStakeNum <= 0) {
      return null;
    }

    // Convert American odds to decimal
    const toDecimal = (americanOdds: number) => {
      if (americanOdds > 0) {
        return (americanOdds / 100) + 1;
      } else {
        return (100 / Math.abs(americanOdds)) + 1;
      }
    };

    const decimal1 = toDecimal(odds1Num);
    const decimal2 = toDecimal(odds2Num);

    const impliedProb1 = (1 / decimal1) * 100;
    const impliedProb2 = (1 / decimal2) * 100;
    const totalImpliedProb = impliedProb1 + impliedProb2;

    const isArbitrage = totalImpliedProb < 100;
    const profitMargin = isArbitrage ? ((100 - totalImpliedProb) / 100) * 100 : 0;

    // Calculate optimal stakes
    const stake1 = totalStakeNum / decimal1;
    const stake2 = totalStakeNum / decimal2;
    const actualTotalStake = stake1 + stake2;
    
    // Normalize stakes to match desired total
    const normalizedStake1 = (stake1 / actualTotalStake) * totalStakeNum;
    const normalizedStake2 = (stake2 / actualTotalStake) * totalStakeNum;

    const profit = isArbitrage ? totalStakeNum * (profitMargin / 100) : 0;

    return {
      isArbitrage,
      profitMargin,
      totalStake: totalStakeNum,
      stake1: normalizedStake1,
      stake2: normalizedStake2,
      profit,
      impliedProb1,
      impliedProb2,
      totalImpliedProb
    };
  }, [odds1, odds2, totalStake]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-[#D8AC35]" />
          <span>Arbitrage Calculator</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="book1">Sportsbook 1</Label>
              <Input
                id="book1"
                placeholder="FanDuel"
                value={book1}
                onChange={(e) => setBook1(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="book2">Sportsbook 2</Label>
              <Input
                id="book2"
                placeholder="DraftKings"
                value={book2}
                onChange={(e) => setBook2(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="odds1">{book1} Odds</Label>
              <Input
                id="odds1"
                type="number"
                placeholder="+150"
                value={odds1}
                onChange={(e) => setOdds1(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="odds2">{book2} Odds</Label>
              <Input
                id="odds2"
                type="number"
                placeholder="-120"
                value={odds2}
                onChange={(e) => setOdds2(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalStake">Total Stake ($)</Label>
              <Input
                id="totalStake"
                type="number"
                placeholder="1000"
                min="0"
                step="1"
                value={totalStake}
                onChange={(e) => setTotalStake(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-4">
            {/* Arbitrage Status */}
            <div className="flex items-center justify-center space-x-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
              <Badge className={result.isArbitrage ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                {result.isArbitrage ? 'Arbitrage Opportunity' : 'No Arbitrage'}
              </Badge>
              {result.isArbitrage && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {result.profitMargin.toFixed(2)}% Profit
                </Badge>
              )}
            </div>

            <Separator />

            {/* Probability Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">{book1} Implied</div>
                <div className="text-lg font-mono font-semibold">
                  {result.impliedProb1.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">{book2} Implied</div>
                <div className="text-lg font-mono font-semibold">
                  {result.impliedProb2.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Implied</div>
                <div className={`text-lg font-mono font-semibold ${
                  result.totalImpliedProb < 100 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.totalImpliedProb.toFixed(1)}%
                </div>
              </div>
            </div>

            {result.isArbitrage && (
              <>
                <Separator />
                
                {/* Stake Allocation */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-center">Optimal Stake Allocation</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">{book1}</div>
                        <div className="text-2xl font-mono font-bold text-blue-800 dark:text-blue-200">
                          ${result.stake1.toFixed(2)}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          {((result.stake1 / result.totalStake) * 100).toFixed(1)}% of total
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium">{book2}</div>
                        <div className="text-2xl font-mono font-bold text-green-800 dark:text-green-200">
                          ${result.stake2.toFixed(2)}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400">
                          {((result.stake2 / result.totalStake) * 100).toFixed(1)}% of total
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profit Summary */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                        Guaranteed Profit
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono font-bold text-yellow-800 dark:text-yellow-200">
                        ${result.profit.toFixed(2)}
                      </div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">
                        {result.profitMargin.toFixed(2)}% return
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Warning for non-arbitrage */}
            {!result.isArbitrage && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <strong>No arbitrage opportunity detected.</strong> The combined implied probabilities 
                    exceed 100%, meaning the sportsbooks have built in enough margin to prevent guaranteed profit.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
