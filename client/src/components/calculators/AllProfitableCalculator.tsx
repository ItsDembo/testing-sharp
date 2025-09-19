import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { FeatureGate } from '@/components/FeatureGate';
import { 
  Calculator, 
  TrendingUp, 
  Target, 
  Zap, 
  DollarSign,
  Percent,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface AllProfitableCalculatorProps {
  className?: string;
}

interface CalculationResult {
  type: 'ev' | 'arbitrage' | 'middling';
  profit: number;
  profitPercent: number;
  recommendation: 'strong' | 'good' | 'weak' | 'avoid';
  stakes: { [key: string]: number };
  description: string;
}

export function AllProfitableCalculator({ className }: AllProfitableCalculatorProps) {
  const [activeTab, setActiveTab] = useState('multi-way');
  const [totalStake, setTotalStake] = useState<string>('1000');
  
  // Multi-way arbitrage inputs
  const [outcomes, setOutcomes] = useState([
    { name: 'Outcome 1', odds: '', book: 'Book A' },
    { name: 'Outcome 2', odds: '', book: 'Book B' },
    { name: 'Outcome 3', odds: '', book: 'Book C' }
  ]);

  // EV calculation inputs
  const [evOdds, setEvOdds] = useState<string>('');
  const [fairProb, setFairProb] = useState<string>('');
  
  // Middling inputs
  const [line1, setLine1] = useState<string>('');
  const [odds1, setOdds1] = useState<string>('');
  const [line2, setLine2] = useState<string>('');
  const [odds2, setOdds2] = useState<string>('');

  const results = useMemo((): CalculationResult[] => {
    const results: CalculationResult[] = [];
    const totalStakeNum = parseFloat(totalStake) || 1000;

    // Multi-way Arbitrage Calculation
    if (activeTab === 'multi-way' && outcomes.every(o => o.odds && !isNaN(parseFloat(o.odds)))) {
      const decimalOdds = outcomes.map(o => {
        const odds = parseFloat(o.odds);
        return odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
      });

      const totalImpliedProb = decimalOdds.reduce((sum, odds) => sum + (1 / odds), 0);
      
      if (totalImpliedProb < 1) {
        const profitMargin = (1 - totalImpliedProb) * 100;
        const stakes: { [key: string]: number } = {};
        
        outcomes.forEach((outcome, i) => {
          stakes[outcome.name] = totalStakeNum / decimalOdds[i];
        });

        const actualTotal = Object.values(stakes).reduce((sum, stake) => sum + stake, 0);
        Object.keys(stakes).forEach(key => {
          stakes[key] = (stakes[key] / actualTotal) * totalStakeNum;
        });

        results.push({
          type: 'arbitrage',
          profit: totalStakeNum * (profitMargin / 100),
          profitPercent: profitMargin,
          recommendation: profitMargin > 3 ? 'strong' : profitMargin > 1 ? 'good' : 'weak',
          stakes,
          description: `${outcomes.length}-way arbitrage opportunity with ${profitMargin.toFixed(2)}% guaranteed profit`
        });
      }
    }

    // EV Calculation
    if (evOdds && fairProb) {
      const oddsNum = parseFloat(evOdds);
      const fairProbNum = parseFloat(fairProb) / 100;
      
      if (!isNaN(oddsNum) && !isNaN(fairProbNum) && fairProbNum > 0 && fairProbNum < 1) {
        const decimalOdds = oddsNum > 0 ? (oddsNum / 100) + 1 : (100 / Math.abs(oddsNum)) + 1;
        const ev = (fairProbNum * (decimalOdds - 1)) - (1 - fairProbNum);
        const evPercent = ev * 100;
        const expectedReturn = totalStakeNum * ev;

        if (evPercent > -5) {
          results.push({
            type: 'ev',
            profit: expectedReturn,
            profitPercent: evPercent,
            recommendation: evPercent > 5 ? 'strong' : evPercent > 1 ? 'good' : evPercent > -2 ? 'weak' : 'avoid',
            stakes: { 'Single Bet': totalStakeNum },
            description: `Expected value bet with ${evPercent.toFixed(2)}% edge`
          });
        }
      }
    }

    // Middling Calculation
    if (line1 && odds1 && line2 && odds2) {
      const line1Num = parseFloat(line1);
      const odds1Num = parseFloat(odds1);
      const line2Num = parseFloat(line2);
      const odds2Num = parseFloat(odds2);

      if (!isNaN(line1Num) && !isNaN(odds1Num) && !isNaN(line2Num) && !isNaN(odds2Num)) {
        const lineSpread = Math.abs(line1Num - line2Num);
        
        if (lineSpread >= 1) {
          const decimal1 = odds1Num > 0 ? (odds1Num / 100) + 1 : (100 / Math.abs(odds1Num)) + 1;
          const decimal2 = odds2Num > 0 ? (odds2Num / 100) + 1 : (100 / Math.abs(odds2Num)) + 1;
          
          const stake1 = totalStakeNum / 2;
          const stake2 = totalStakeNum / 2;
          const profitIfMiddle = (stake1 * (decimal1 - 1)) + (stake2 * (decimal2 - 1));
          const middleProbability = Math.min(lineSpread * 0.15, 0.25);
          const expectedValue = (middleProbability * profitIfMiddle) - ((1 - middleProbability) * totalStakeNum);

          if (expectedValue > -totalStakeNum * 0.1) {
            results.push({
              type: 'middling',
              profit: expectedValue,
              profitPercent: (expectedValue / totalStakeNum) * 100,
              recommendation: expectedValue > totalStakeNum * 0.05 ? 'strong' : expectedValue > 0 ? 'good' : 'weak',
              stakes: { [`Line ${line1}`]: stake1, [`Line ${line2}`]: stake2 },
              description: `Middling opportunity with ${(middleProbability * 100).toFixed(1)}% chance of hitting both bets`
            });
          }
        }
      }
    }

    return results.sort((a, b) => b.profitPercent - a.profitPercent);
  }, [activeTab, outcomes, totalStake, evOdds, fairProb, line1, odds1, line2, odds2]);

  const addOutcome = () => {
    setOutcomes(prev => [...prev, { 
      name: `Outcome ${prev.length + 1}`, 
      odds: '', 
      book: `Book ${String.fromCharCode(65 + prev.length)}` 
    }]);
  };

  const removeOutcome = (index: number) => {
    if (outcomes.length > 2) {
      setOutcomes(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateOutcome = (index: number, field: string, value: string) => {
    setOutcomes(prev => prev.map((outcome, i) => 
      i === index ? { ...outcome, [field]: value } : outcome
    ));
  };

  const getRecommendationColor = (rec: CalculationResult['recommendation']) => {
    switch (rec) {
      case 'strong': return 'bg-green-500 text-white';
      case 'good': return 'bg-green-400 text-white';
      case 'weak': return 'bg-yellow-500 text-black';
      case 'avoid': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTypeIcon = (type: CalculationResult['type']) => {
    switch (type) {
      case 'ev': return <TrendingUp className="h-4 w-4" />;
      case 'arbitrage': return <Target className="h-4 w-4" />;
      case 'middling': return <Zap className="h-4 w-4" />;
      default: return <Calculator className="h-4 w-4" />;
    }
  };

  const CalculatorContent = () => (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-[#D8AC35]" />
          <span>All Profitable Bets Calculator</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="multi-way">Multi-Way Arbitrage</TabsTrigger>
            <TabsTrigger value="ev">Expected Value</TabsTrigger>
            <TabsTrigger value="middling">Middling</TabsTrigger>
          </TabsList>

          {/* Total Stake Input */}
          <div className="space-y-2">
            <Label htmlFor="totalStake">Total Stake ($)</Label>
            <Input
              id="totalStake"
              type="number"
              placeholder="1000"
              value={totalStake}
              onChange={(e) => setTotalStake(e.target.value)}
              className="font-mono"
            />
          </div>

          <TabsContent value="multi-way" className="space-y-4">
            <div className="space-y-4">
              {outcomes.map((outcome, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Outcome</Label>
                    <Input
                      placeholder={`Outcome ${index + 1}`}
                      value={outcome.name}
                      onChange={(e) => updateOutcome(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Odds</Label>
                    <Input
                      type="number"
                      placeholder="+150"
                      value={outcome.odds}
                      onChange={(e) => updateOutcome(index, 'odds', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Book</Label>
                    <Input
                      placeholder="Sportsbook"
                      value={outcome.book}
                      onChange={(e) => updateOutcome(index, 'book', e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-1">
                    {outcomes.length > 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeOutcome(index)}
                        className="px-2"
                      >
                        -
                      </Button>
                    )}
                    {index === outcomes.length - 1 && outcomes.length < 6 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addOutcome}
                        className="px-2"
                      >
                        +
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ev" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="evOdds">American Odds</Label>
                <Input
                  id="evOdds"
                  type="number"
                  placeholder="-110"
                  value={evOdds}
                  onChange={(e) => setEvOdds(e.target.value)}
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
            </div>
          </TabsContent>

          <TabsContent value="middling" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="font-semibold">First Bet</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Line</Label>
                    <Input
                      type="number"
                      placeholder="-3.5"
                      step="0.5"
                      value={line1}
                      onChange={(e) => setLine1(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Odds</Label>
                    <Input
                      type="number"
                      placeholder="-110"
                      value={odds1}
                      onChange={(e) => setOdds1(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold">Second Bet</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Line</Label>
                    <Input
                      type="number"
                      placeholder="-2.5"
                      step="0.5"
                      value={line2}
                      onChange={(e) => setLine2(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Odds</Label>
                    <Input
                      type="number"
                      placeholder="-110"
                      value={odds2}
                      onChange={(e) => setOdds2(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <h3 className="font-semibold">Profitable Opportunities</h3>
            <div className="space-y-3">
              {results.map((result, index) => (
                <Card key={index} className="border-l-4 border-l-[#D8AC35]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(result.type)}
                        <span className="font-semibold capitalize">{result.type}</span>
                        <Badge className={getRecommendationColor(result.recommendation)}>
                          {result.recommendation}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-mono font-bold ${
                          result.profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${result.profit >= 0 ? '+' : ''}{result.profit.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {result.profitPercent >= 0 ? '+' : ''}{result.profitPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{result.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(result.stakes).map(([name, stake]) => (
                        <div key={name} className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-center">
                          <div className="text-xs text-gray-600 dark:text-gray-400">{name}</div>
                          <div className="font-mono font-semibold">${stake.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Enter values above to calculate profitable opportunities</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <FeatureGate 
      feature="exportToCsv" 
      requiredPlan="pro"
      featureName="All Profitable Bets Calculator"
      featureDescription="Advanced multi-strategy calculator for finding all types of profitable betting opportunities"
    >
      <CalculatorContent />
    </FeatureGate>
  );
}
