import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface EVCalculatorProps {
  className?: string;
}

interface EVResult {
  ev: number;
  evPercent: number;
  impliedProbability: number;
  fairProbability: number;
  expectedReturn: number;
  recommendation: 'strong-bet' | 'bet' | 'avoid' | 'strong-avoid';
}

export function EVCalculator({ className }: EVCalculatorProps) {
  const [odds, setOdds] = useState<string>('');
  const [fairProb, setFairProb] = useState<string>('');
  const [stake, setStake] = useState<string>('100');

  const result = useMemo((): EVResult | null => {
    const oddsNum = parseFloat(odds);
    const fairProbNum = parseFloat(fairProb) / 100;
    const stakeNum = parseFloat(stake);

    if (isNaN(oddsNum) || isNaN(fairProbNum) || isNaN(stakeNum) || fairProbNum <= 0 || fairProbNum >= 1) {
      return null;
    }

    // Convert American odds to decimal
    let decimalOdds: number;
    if (oddsNum > 0) {
      decimalOdds = (oddsNum / 100) + 1;
    } else {
      decimalOdds = (100 / Math.abs(oddsNum)) + 1;
    }

    const impliedProbability = 1 / decimalOdds;
    const ev = (fairProbNum * (decimalOdds - 1)) - (1 - fairProbNum);
    const evPercent = ev * 100;
    const expectedReturn = stakeNum * ev;

    let recommendation: EVResult['recommendation'];
    if (evPercent >= 5) recommendation = 'strong-bet';
    else if (evPercent >= 1) recommendation = 'bet';
    else if (evPercent >= -2) recommendation = 'avoid';
    else recommendation = 'strong-avoid';

    return {
      ev,
      evPercent,
      impliedProbability: impliedProbability * 100,
      fairProbability: fairProbNum * 100,
      expectedReturn,
      recommendation
    };
  }, [odds, fairProb, stake]);

  const getRecommendationColor = (rec: EVResult['recommendation']) => {
    switch (rec) {
      case 'strong-bet': return 'bg-green-500 text-white';
      case 'bet': return 'bg-green-400 text-white';
      case 'avoid': return 'bg-yellow-500 text-black';
      case 'strong-avoid': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRecommendationText = (rec: EVResult['recommendation']) => {
    switch (rec) {
      case 'strong-bet': return 'Strong Bet';
      case 'bet': return 'Bet';
      case 'avoid': return 'Avoid';
      case 'strong-avoid': return 'Strong Avoid';
      default: return 'Unknown';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-[#D8AC35]" />
          <span>Expected Value Calculator</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="odds">American Odds</Label>
            <Input
              id="odds"
              type="number"
              placeholder="-110"
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fairProb">Fair Probability (%)</Label>
            <Input
              id="fairProb"
              type="number"
              placeholder="52.5"
              min="0"
              max="100"
              step="0.1"
              value={fairProb}
              onChange={(e) => setFairProb(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stake">Stake ($)</Label>
            <Input
              id="stake"
              type="number"
              placeholder="100"
              min="0"
              step="1"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">Implied Prob</div>
                <div className="text-lg font-mono font-semibold">
                  {result.impliedProbability.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">Fair Prob</div>
                <div className="text-lg font-mono font-semibold">
                  {result.fairProbability.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">EV%</div>
                <div className={`text-lg font-mono font-semibold flex items-center justify-center space-x-1 ${
                  result.evPercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.evPercent >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{result.evPercent >= 0 ? '+' : ''}{result.evPercent.toFixed(2)}%</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">Expected Return</div>
                <div className={`text-lg font-mono font-semibold ${
                  result.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${result.expectedReturn >= 0 ? '+' : ''}{result.expectedReturn.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="flex items-center justify-center space-x-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Recommendation:</span>
              <Badge className={getRecommendationColor(result.recommendation)}>
                {getRecommendationText(result.recommendation)}
              </Badge>
            </div>

            {/* Explanation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>How it works:</strong> Expected Value (EV) compares the fair probability of an outcome 
                  to the implied probability from the odds. Positive EV indicates a profitable bet over time, 
                  while negative EV suggests the bet favors the sportsbook.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
