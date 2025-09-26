import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { calculateEV, safeCalculateEV } from '@shared/lib/evCalculations';

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

    // Use canonical EV calculation
    const evResult = safeCalculateEV(oddsNum, fairProbNum, stakeNum);

    if (evResult.error || evResult.evPercent === null) {
      return null;
    }

    const evPercent = evResult.evPercent!;
    const ev = evResult.evDollars! / stakeNum;
    const expectedReturn = evResult.evDollars!;
    const impliedProbability = evResult.impliedProbability!;

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
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Calculator className="h-5 w-5 text-[#D8AC35]" />
          <span>EV Calculator</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section - Simplified */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="odds" className="text-xs text-muted-foreground">Odds</Label>
            <Input
              id="odds"
              type="number"
              placeholder="-110"
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
              className="font-mono text-sm h-8"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fairProb" className="text-xs text-muted-foreground">Fair %</Label>
            <Input
              id="fairProb"
              type="number"
              placeholder="52.5"
              min="0"
              max="100"
              step="0.1"
              value={fairProb}
              onChange={(e) => setFairProb(e.target.value)}
              className="font-mono text-sm h-8"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="stake" className="text-xs text-muted-foreground">Stake</Label>
            <Input
              id="stake"
              type="number"
              placeholder="100"
              min="0"
              step="1"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="font-mono text-sm h-8"
            />
          </div>
        </div>

        {/* Results Section - Simplified */}
        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">EV%</div>
                <div className={`text-lg font-mono font-bold ${
                  result.evPercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.evPercent >= 0 ? '+' : ''}{result.evPercent.toFixed(2)}%
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Expected Return</div>
                <div className={`text-lg font-mono font-bold ${
                  result.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${result.expectedReturn >= 0 ? '+' : ''}{result.expectedReturn.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="text-center">
              <Badge className={getRecommendationColor(result.recommendation)}>
                {getRecommendationText(result.recommendation)}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
