import React, { useState } from 'react';
import { calculateEV, validateEVInputs, safeCalculateEV } from '@shared/lib/evCalculations';
import { EVValidationLogger } from '@shared/lib/evValidationLogger';

// Create a global logger
const logger = new EVValidationLogger(100, false);

export default function EVTest() {
  const [bookOdds, setBookOdds] = useState<number>(150);
  const [fairProb, setFairProb] = useState<number>(0.6);
  const [stake, setStake] = useState<number>(100);
  const [result, setResult] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const runTest = () => {
    // Validate inputs
    const error = validateEVInputs(bookOdds, fairProb);
    setValidationError(error);

    if (error) {
      setResult(null);
      return;
    }

    // Calculate EV
    const evResult = calculateEV(bookOdds, fairProb, stake);
    setResult(evResult);

    // Log the calculation
    const log = logger.logCalculation(bookOdds, fairProb, stake, evResult);
    setLogs([log, ...logs.slice(0, 9)]); // Keep last 10 logs
  };

  const runPredefinedTests = () => {
    const tests = [
      { odds: 150, prob: 0.6, stake: 100, name: 'Positive EV (+150 at 60%)' },
      { odds: -110, prob: 0.5, stake: 100, name: 'Negative EV (-110 at 50%)' },
      { odds: 100, prob: 0.5, stake: 100, name: 'Zero EV (+100 at 50%)' },
      { odds: -500, prob: 0.85, stake: 100, name: 'Heavy Favorite' },
      { odds: 500, prob: 0.2, stake: 100, name: 'Heavy Underdog' },
    ];

    const testLogs: any[] = [];
    tests.forEach(test => {
      const evResult = calculateEV(test.odds, test.prob, test.stake);
      const log = logger.logCalculation(test.odds, test.prob, test.stake, evResult);
      testLogs.push({ ...log, testName: test.name });
    });

    setLogs(testLogs);
    console.log('✅ Ran 5 predefined tests');
    console.log('Summary:', logger.getSummary());
  };

  const getSummary = () => {
    const summary = logger.getSummary();
    console.log('=== EV Calculation Summary ===');
    console.log(summary);
    alert(JSON.stringify(summary, null, 2));
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">EV Calculation Test Suite</h1>
      
      {/* Test Input Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test EV Calculation</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Book Odds (American)</label>
            <input
              type="number"
              value={bookOdds}
              onChange={(e) => setBookOdds(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="+150 or -110"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Fair Probability (0-1)</label>
            <input
              type="number"
              step="0.01"
              value={fairProb}
              onChange={(e) => setFairProb(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="0.6 for 60%"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Stake ($)</label>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="100"
            />
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={runTest}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Calculate EV
          </button>
          
          <button
            onClick={runPredefinedTests}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Run 5 Predefined Tests
          </button>
          
          <button
            onClick={getSummary}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Get Summary
          </button>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>❌ Validation Error:</strong> {validationError}
        </div>
      )}

      {/* Result Display */}
      {result && !validationError && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Result</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">EV%</div>
              <div className={`text-2xl font-bold ${result.isPositiveEV ? 'text-green-600' : 'text-red-600'}`}>
                {result.evPercent.toFixed(2)}%
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">EV$</div>
              <div className={`text-2xl font-bold ${result.isPositiveEV ? 'text-green-600' : 'text-red-600'}`}>
                ${result.evDollars.toFixed(2)}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Profit If Win</div>
              <div className="text-2xl font-bold text-blue-600">
                ${result.profitIfWin.toFixed(2)}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Implied Probability</div>
              <div className="text-2xl font-bold text-gray-700">
                {(result.impliedProbability * 100).toFixed(2)}%
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Is Positive EV?</div>
              <div className={`text-2xl font-bold ${result.isPositiveEV ? 'text-green-600' : 'text-red-600'}`}>
                {result.isPositiveEV ? '✅ YES' : '❌ NO'}
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded">
            <div className="text-sm font-medium text-blue-900 mb-2">Calculation Breakdown:</div>
            <div className="text-sm text-blue-800 font-mono">
              <div>Fair Prob × Profit If Win = {fairProb.toFixed(2)} × ${result.profitIfWin.toFixed(2)} = ${(fairProb * result.profitIfWin).toFixed(2)}</div>
              <div>(1 - Fair Prob) × Stake = {(1 - fairProb).toFixed(2)} × ${stake} = ${((1 - fairProb) * stake).toFixed(2)}</div>
              <div className="border-t border-blue-300 mt-2 pt-2">
                EV$ = ${(fairProb * result.profitIfWin).toFixed(2)} - ${((1 - fairProb) * stake).toFixed(2)} = ${result.evDollars.toFixed(2)}
              </div>
              <div>EV% = (${result.evDollars.toFixed(2)} / ${stake}) × 100 = {result.evPercent.toFixed(2)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Display */}
      {logs.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Calculation Logs ({logs.length})</h2>
          
          <div className="space-y-4">
            {logs.map((log, idx) => (
              <div key={idx} className="border rounded p-4 bg-gray-50">
                {log.testName && (
                  <div className="font-semibold text-blue-600 mb-2">{log.testName}</div>
                )}
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Input:</span> {log.input.bookOdds} odds, {(log.input.fairProbability * 100).toFixed(1)}% prob
                  </div>
                  <div>
                    <span className="font-medium">EV:</span> {log.output.evPercent.toFixed(2)}%
                  </div>
                  <div>
                    <span className="font-medium">Valid:</span> {log.validation.inputValid ? '✅' : '❌'}
                  </div>
                </div>
                
                {log.validation.errors.length > 0 && (
                  <div className="mt-2 text-red-600 text-sm">
                    Errors: {log.validation.errors.join(', ')}
                  </div>
                )}
                
                {log.validation.warnings.length > 0 && (
                  <div className="mt-2 text-yellow-600 text-sm">
                    Warnings: {log.validation.warnings.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📝 Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Enter American odds (e.g., +150 or -110)</li>
          <li>• Enter fair probability as a decimal (e.g., 0.6 for 60%)</li>
          <li>• Enter stake amount in dollars</li>
          <li>• Click "Calculate EV" to test your inputs</li>
          <li>• Click "Run 5 Predefined Tests" to see known good values</li>
          <li>• Click "Get Summary" to see overall statistics</li>
          <li>• Open browser console (F12) to see detailed logs</li>
        </ul>
      </div>
    </div>
  );
}

