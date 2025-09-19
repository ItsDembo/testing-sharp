import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FeatureGate } from '@/components/FeatureGate';
import { Target, TrendingUp, AlertCircle, Zap } from 'lucide-react';

interface MiddlingCalculatorProps {
  className?: string;
}

interface MiddlingResult {
  isMiddleOpportunity: boolean;
  middleRange: { min: number; max: number };
  middleProbability: number;
  winBothProbability: number;
  loseBothProbability: number;
  expectedValue: number;
  profitIfMiddle: number;
  lossIfNoMiddle: number;
  stake1: number;
  stake2: number;
  recommendation: 'strong-middle' | 'middle' | 'weak-middle' | 'no-middle';
}

export function MiddlingCalculator({ className }: MiddlingCalculatorProps) {
  const [line1, setLine1] = useState<string>('');
  const [odds1, setOdds1] = useState<string>('');
  const [line2, setLine2] = useState<string>('');
  const [odds2, setOdds2] = useState<string>('');
  const [totalStake, setTotalStake] = useState<string>('200');
  const [book1, setBook1] = useState<string>('Book A');
  const [book2, setBook2] = useState<string>('Book B');

  const result = useMemo((): MiddlingResult | null => {
    const line1Num = parseFloat(line1);
    const odds1Num = parseFloat(odds1);
    const line2Num = parseFloat(line2);
    const odds2Num = parseFloat(odds2);
    const totalStakeNum = parseFloat(totalStake);

    if (isNaN(line1Num) || isNaN(odds1Num) || isNaN(line2Num) || isNaN(odds2Num) || isNaN(totalStakeNum)) {
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

    // Determine if there's a middle opportunity
    const isMiddleOpportunity = Math.abs(line1Num - line2Num) >= 1;
    
    // Calculate middle range
    const middleRange = {
      min: Math.min(line1Num, line2Num),
      max: Math.max(line1Num, line2Num)
    };

    // Estimate middle probability (simplified - in reality this would use more sophisticated models)
    const lineSpread = Math.abs(line1Num - line2Num);
    const middleProbability = Math.min(lineSpread * 0.15, 0.25); // Rough estimate
    
    // Calculate optimal stakes (equal profit method)
    const stake1 = totalStakeNum / 2;
    const stake2 = totalStakeNum / 2;

    // Calculate potential outcomes
    const profitIfMiddle = (stake1 * (decimal1 - 1)) + (stake2 * (decimal2 - 1));
    const lossIfNoMiddle = totalStakeNum; // Lose both bets
    
    // Calculate expected value
    const winBothProbability = 0; // Can't win both sides of a spread
    const loseBothProbability = 1 - middleProbability;
    const expectedValue = (middleProbability * profitIfMiddle) - (loseBothProbability * lossIfNoMiddle);

    // Determine recommendation
    let recommendation: MiddlingResult['recommendation'];
    if (expectedValue > totalStakeNum * 0.1) recommendation = 'strong-middle';
    else if (expectedValue > 0) recommendation = 'middle';
    else if (expectedValue > -totalStakeNum * 0.05) recommendation = 'weak-middle';
    else recommendation = 'no-middle';

    return {
      isMiddleOpportunity,
      middleRange,
      middleProbability: middleProbability * 100,
      winBothProbability: winBothProbability * 100,
      loseBothProbability: loseBothProbability * 100,
      expectedValue,
      profitIfMiddle,
      lossIfNoMiddle,
      stake1,
      stake2,
      recommendation
    };
  }, [line1, odds1, line2, odds2, totalStake]);

  const getRecommendationColor = (rec: MiddlingResult['recommendation']) => {
    switch (rec) {
      case 'strong-middle': return 'bg-green-500 text-white';
      case 'middle': return 'bg-green-400 text-white';
      case 'weak-middle': return 'bg-yellow-500 text-black';
      case 'no-middle': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRecommendationText = (rec: MiddlingResult['recommendation']) => {
    switch (rec) {
      case 'strong-middle': return 'Strong Middle';
      case 'middle': return 'Good Middle';
      case 'weak-middle': return 'Weak Middle';
      case 'no-middle': return 'No Middle';
      default: return 'Unknown';
    }
  };

  const CalculatorContent = () => (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-[#D8AC35]" />
          <span>Middling Calculator</span>
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

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="line1">{book1} Line</Label>
              <Input
                id="line1"
                type="number"
                placeholder="-3.5"
                step="0.5"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="odds1">{book1} Odds</Label>
              <Input
                id="odds1"
                type="number"
                placeholder="-110"
                value={odds1}
                onChange={(e) => setOdds1(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="line2">{book2} Line</Label>
              <Input
                id="line2"
                type="number"
                placeholder="-2.5"
                step="0.5"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="odds2">{book2} Odds</Label>
              <Input
                id="odds2"
                type="number"
                placeholder="-110"
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
                placeholder="200"
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
            {/* Middle Status */}
            <div className="flex items-center justify-center space-x-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
              <Badge className={result.isMiddleOpportunity ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                {result.isMiddleOpportunity ? 'Middle Opportunity' : 'No Middle'}
              </Badge>
              <Badge className={getRecommendationColor(result.recommendation)}>
                {getRecommendationText(result.recommendation)}
              </Badge>
            </div>

            {result.isMiddleOpportunity && (
              <>
                <Separator />

                {/* Middle Range */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">Middle Range</div>
                    <div className="text-3xl font-mono font-bold text-blue-800 dark:text-blue-200">
                      {result.middleRange.min} to {result.middleRange.max}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      Win both bets if final margin falls in this range
                    </div>
                  </div>
                </div>

                {/* Probability Breakdown */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                    <div className="text-sm text-green-600 dark:text-green-400">Middle Hits</div>
                    <div className="text-lg font-mono font-semibold text-green-800 dark:text-green-200">
                      {result.middleProbability.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                    <div className="text-sm text-red-600 dark:text-red-400">Lose Both</div>
                    <div className="text-lg font-mono font-semibold text-red-800 dark:text-red-200">
                      {result.loseBothProbability.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Expected Value</div>
                    <div className={`text-lg font-mono font-semibold ${
                      result.expectedValue >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${result.expectedValue >= 0 ? '+' : ''}{result.expectedValue.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Stake Allocation */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-center">Stake Allocation</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                          {book1} ({parseFloat(line1) > 0 ? '+' : ''}{line1})
                        </div>
                        <div className="text-2xl font-mono font-bold text-blue-800 dark:text-blue-200">
                          ${result.stake1.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                          {book2} ({parseFloat(line2) > 0 ? '+' : ''}{line2})
                        </div>
                        <div className="text-2xl font-mono font-bold text-green-800 dark:text-green-200">
                          ${result.stake2.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Outcome Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-sm text-green-600 dark:text-green-400 font-medium">If Middle Hits</div>
                      <div className="text-2xl font-mono font-bold text-green-800 dark:text-green-200">
                        +${result.profitIfMiddle.toFixed(2)}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">Win both bets</div>
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-sm text-red-600 dark:text-red-400 font-medium">If No Middle</div>
                      <div className="text-2xl font-mono font-bold text-red-800 dark:text-red-200">
                        -${result.lossIfNoMiddle.toFixed(2)}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">Lose both bets</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Explanation */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Middling Strategy:</strong> Bet opposite sides of the same game at different lines. 
                  If the final margin falls between your lines, you win both bets. This is a high-risk, 
                  high-reward strategy that requires careful line shopping and timing.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <FeatureGate 
      feature="middlingCalculator" 
      requiredPlan="pro"
      featureName="Middling Calculator"
      featureDescription="Calculate middle opportunities on spreads and totals"
    >
      <CalculatorContent />
    </FeatureGate>
  );
}
