import { describe, it, expect } from 'vitest';
import { calculateEV } from '../evCalculations';

describe('EV Calculation - Known Good Values', () => {
  describe('Test Case 1: Positive EV with Positive Odds', () => {
    // Book Odds: +150, Fair Probability: 60%, Stake: $100
    // Decimal: 2.5, Profit: $150
    // EV = (0.6 × 150) - (0.4 × 100) = 90 - 40 = $50
    // EV% = 50%
    
    it('should calculate +150 odds at 60% fair probability correctly', () => {
      const result = calculateEV(150, 0.6, 100);
      
      console.log('Test Case 1 - Positive EV with Positive Odds:');
      console.log('  Input: +150 odds, 60% fair probability, $100 stake');
      console.log('  Output:', result);
      
      expect(result.evPercent).toBeCloseTo(50, 1);
      expect(result.evDollars).toBeCloseTo(50, 1);
      expect(result.profitIfWin).toBeCloseTo(150, 1);
      expect(result.isPositiveEV).toBe(true);
      expect(result.impliedProbability).toBeCloseTo(0.4, 2);
    });
  });

  describe('Test Case 2: Negative EV with Negative Odds', () => {
    // Book Odds: -110, Fair Probability: 50%, Stake: $100
    // Decimal: 1.909, Profit: $90.91
    // EV = (0.5 × 90.91) - (0.5 × 100) = 45.45 - 50 = -$4.55
    // EV% = -4.55%
    
    it('should calculate -110 odds at 50% fair probability correctly', () => {
      const result = calculateEV(-110, 0.5, 100);
      
      console.log('Test Case 2 - Negative EV with Negative Odds:');
      console.log('  Input: -110 odds, 50% fair probability, $100 stake');
      console.log('  Output:', result);
      
      expect(result.evPercent).toBeCloseTo(-4.55, 1);
      expect(result.evDollars).toBeCloseTo(-4.55, 1);
      expect(result.profitIfWin).toBeCloseTo(90.91, 1);
      expect(result.isPositiveEV).toBe(false);
      expect(result.impliedProbability).toBeCloseTo(0.524, 2);
    });
  });

  describe('Test Case 3: Zero EV (Fair Odds)', () => {
    // Book Odds: +100, Fair Probability: 50%, Stake: $100
    // Decimal: 2.0, Profit: $100
    // EV = (0.5 × 100) - (0.5 × 100) = 50 - 50 = $0
    // EV% = 0%
    
    it('should calculate +100 odds at 50% fair probability as zero EV', () => {
      const result = calculateEV(100, 0.5, 100);
      
      console.log('Test Case 3 - Zero EV (Fair Odds):');
      console.log('  Input: +100 odds, 50% fair probability, $100 stake');
      console.log('  Output:', result);
      
      expect(result.evPercent).toBeCloseTo(0, 1);
      expect(result.evDollars).toBeCloseTo(0, 1);
      expect(result.profitIfWin).toBeCloseTo(100, 1);
      expect(result.isPositiveEV).toBe(false);
      expect(result.impliedProbability).toBeCloseTo(0.5, 2);
    });
  });

  describe('Test Case 4: Heavy Favorite', () => {
    // Book Odds: -500, Fair Probability: 85%, Stake: $100
    // Decimal: 1.2, Profit: $20
    // EV = (0.85 × 20) - (0.15 × 100) = 17 - 15 = $2
    // EV% = 2%
    
    it('should calculate -500 odds at 85% fair probability correctly', () => {
      const result = calculateEV(-500, 0.85, 100);
      
      console.log('Test Case 4 - Heavy Favorite:');
      console.log('  Input: -500 odds, 85% fair probability, $100 stake');
      console.log('  Output:', result);
      
      expect(result.evPercent).toBeCloseTo(2, 1);
      expect(result.evDollars).toBeCloseTo(2, 1);
      expect(result.profitIfWin).toBeCloseTo(20, 1);
      expect(result.isPositiveEV).toBe(true);
      expect(result.impliedProbability).toBeCloseTo(0.833, 2);
    });
  });

  describe('Test Case 5: Heavy Underdog', () => {
    // Book Odds: +500, Fair Probability: 20%, Stake: $100
    // Decimal: 6.0, Profit: $500
    // EV = (0.2 × 500) - (0.8 × 100) = 100 - 80 = $20
    // EV% = 20%
    
    it('should calculate +500 odds at 20% fair probability correctly', () => {
      const result = calculateEV(500, 0.2, 100);
      
      console.log('Test Case 5 - Heavy Underdog:');
      console.log('  Input: +500 odds, 20% fair probability, $100 stake');
      console.log('  Output:', result);
      
      expect(result.evPercent).toBeCloseTo(20, 1);
      expect(result.evDollars).toBeCloseTo(20, 1);
      expect(result.profitIfWin).toBeCloseTo(500, 1);
      expect(result.isPositiveEV).toBe(true);
      expect(result.impliedProbability).toBeCloseTo(0.167, 2);
    });
  });

  describe('Real-World Scenario 1: FanDuel Standard Line', () => {
    // Typical FanDuel line with vig
    // Book Odds: -110, Fair Probability: 52.4% (after devigging)
    // Actually shows TINY positive EV because 52.4% is slightly better than the 52.38% implied

    it('should show very small EV for typical vigged line', () => {
      const result = calculateEV(-110, 0.524, 100);

      console.log('Real-World Scenario 1 - FanDuel Standard Line:');
      console.log('  Input: -110 odds, 52.4% fair probability (devigged), $100 stake');
      console.log('  Output:', result);

      // 52.4% vs 52.38% implied = tiny positive EV
      expect(Math.abs(result.evPercent)).toBeLessThan(1); // Very small EV
      expect(result.evPercent).toBeCloseTo(0.036, 2); // Approximately 0.036%
    });
  });

  describe('Real-World Scenario 2: Positive EV Opportunity', () => {
    // DraftKings offering better odds than fair value
    // Book Odds: +120, Fair Probability: 50%
    // Should show positive EV
    
    it('should show positive EV for favorable line', () => {
      const result = calculateEV(120, 0.5, 100);
      
      console.log('Real-World Scenario 2 - Positive EV Opportunity:');
      console.log('  Input: +120 odds, 50% fair probability, $100 stake');
      console.log('  Output:', result);
      
      expect(result.evPercent).toBeGreaterThan(0);
      expect(result.evPercent).toBeCloseTo(10, 1);
      expect(result.isPositiveEV).toBe(true);
    });
  });

  describe('Real-World Scenario 3: Arbitrage Situation', () => {
    // Book A: +110, Fair Probability: 47.6% (from devigging)
    // Actually shows TINY negative EV because 47.6% is slightly worse than the 47.62% implied

    it('should show very small EV in arbitrage scenario', () => {
      const result = calculateEV(110, 0.476, 100);

      console.log('Real-World Scenario 3 - Arbitrage Situation:');
      console.log('  Input: +110 odds, 47.6% fair probability, $100 stake');
      console.log('  Output:', result);

      // 47.6% vs 47.62% implied = tiny negative EV
      expect(Math.abs(result.evPercent)).toBeLessThan(1); // Very small EV
      expect(result.evPercent).toBeCloseTo(-0.04, 2); // Approximately -0.04%
    });
  });

  describe('Manual Calculation Verification', () => {
    it('should match manual calculation for +200 at 40%', () => {
      // Manual calculation:
      // Decimal = 1 + 200/100 = 3.0
      // Profit = 100 × (3.0 - 1) = 200
      // EV = (0.4 × 200) - (0.6 × 100) = 80 - 60 = 20
      // EV% = 20%
      
      const result = calculateEV(200, 0.4, 100);
      
      console.log('Manual Calculation Verification - +200 at 40%:');
      console.log('  Expected: EV% = 20%, EV$ = $20, Profit = $200');
      console.log('  Actual:', result);
      
      expect(result.evPercent).toBeCloseTo(20, 1);
      expect(result.evDollars).toBeCloseTo(20, 1);
      expect(result.profitIfWin).toBeCloseTo(200, 1);
    });

    it('should match manual calculation for -200 at 70%', () => {
      // Manual calculation:
      // Decimal = 1 + 100/200 = 1.5
      // Profit = 100 × (1.5 - 1) = 50
      // EV = (0.7 × 50) - (0.3 × 100) = 35 - 30 = 5
      // EV% = 5%
      
      const result = calculateEV(-200, 0.7, 100);
      
      console.log('Manual Calculation Verification - -200 at 70%:');
      console.log('  Expected: EV% = 5%, EV$ = $5, Profit = $50');
      console.log('  Actual:', result);
      
      expect(result.evPercent).toBeCloseTo(5, 1);
      expect(result.evDollars).toBeCloseTo(5, 1);
      expect(result.profitIfWin).toBeCloseTo(50, 1);
    });
  });

  describe('Symmetry Tests', () => {
    it('should have symmetric EV for opposite sides of fair market', () => {
      // If +100 at 50% has 0% EV, then -100 at 50% should also have 0% EV
      const resultPositive = calculateEV(100, 0.5, 100);
      const resultNegative = calculateEV(-100, 0.5, 100);
      
      console.log('Symmetry Test - Fair Market:');
      console.log('  +100 at 50%:', resultPositive);
      console.log('  -100 at 50%:', resultNegative);
      
      expect(resultPositive.evPercent).toBeCloseTo(0, 1);
      expect(resultNegative.evPercent).toBeCloseTo(0, 1);
    });
  });

  describe('Boundary Value Tests', () => {
    it('should handle minimum valid positive odds correctly', () => {
      const result = calculateEV(100, 0.45, 100);

      console.log('Boundary Test - Minimum Positive Odds (+100):');
      console.log('  Input: +100 odds, 45% fair probability');
      console.log('  Output:', result);

      expect(Number.isFinite(result.evPercent)).toBe(true);
      expect(result.profitIfWin).toBeCloseTo(100, 1);
    });

    it('should handle minimum valid negative odds correctly', () => {
      const result = calculateEV(-100, 0.55, 100);

      console.log('Boundary Test - Minimum Negative Odds (-100):');
      console.log('  Input: -100 odds, 55% fair probability');
      console.log('  Output:', result);

      expect(Number.isFinite(result.evPercent)).toBe(true);
      expect(result.profitIfWin).toBeCloseTo(100, 1);
    });
  });
});

