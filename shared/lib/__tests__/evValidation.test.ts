import { describe, it, expect } from 'vitest';
import { calculateEV, validateEVInputs, safeCalculateEV } from '../evCalculations';

describe('EV Calculation Input Validation', () => {
  describe('Valid Inputs - Should Calculate Correctly', () => {
    it('should accept positive odds with valid probability', () => {
      const result = calculateEV(150, 0.6, 100);
      expect(result.evPercent).toBeCloseTo(50, 1);
      expect(result.evDollars).toBeCloseTo(50, 1);
      expect(result.isPositiveEV).toBe(true);
    });

    it('should accept negative odds with valid probability', () => {
      const result = calculateEV(-110, 0.5, 100);
      expect(result.evPercent).toBeCloseTo(-4.55, 1);
      expect(result.evDollars).toBeCloseTo(-4.55, 1);
      expect(result.isPositiveEV).toBe(false);
    });

    it('should accept minimum valid positive odds (+100)', () => {
      const result = calculateEV(100, 0.5, 100);
      expect(result.evPercent).toBeCloseTo(0, 1);
    });

    it('should accept minimum valid negative odds (-100)', () => {
      const result = calculateEV(-100, 0.5, 100);
      expect(result.evPercent).toBeCloseTo(0, 1);
    });

    it('should accept very small probability (1%)', () => {
      const result = calculateEV(10000, 0.01, 100);
      expect(Number.isFinite(result.evPercent)).toBe(true);
      expect(Number.isFinite(result.evDollars)).toBe(true);
    });

    it('should accept very large probability (99%)', () => {
      const result = calculateEV(-10000, 0.99, 100);
      expect(Number.isFinite(result.evPercent)).toBe(true);
      expect(Number.isFinite(result.evDollars)).toBe(true);
    });
  });

  describe('Invalid Probability - Should Reject', () => {
    it('should reject probability > 1', () => {
      const error = validateEVInputs(150, 1.5);
      expect(error).toContain('probability');
      expect(error).toContain('less than 1');
    });

    it('should reject probability = 1', () => {
      const error = validateEVInputs(150, 1.0);
      expect(error).toContain('probability');
      expect(error).toContain('less than 1');
    });

    it('should reject probability = 0', () => {
      const error = validateEVInputs(150, 0);
      expect(error).toContain('probability');
      expect(error).toContain('greater than 0');
    });

    it('should reject negative probability', () => {
      const error = validateEVInputs(150, -0.2);
      expect(error).toContain('probability');
      expect(error).toContain('greater than 0');
    });

    it('should reject NaN probability', () => {
      const error = validateEVInputs(150, NaN);
      expect(error).toContain('probability');
      expect(error).toContain('NaN');
    });

    it('should reject Infinity probability', () => {
      const error = validateEVInputs(150, Infinity);
      expect(error).toContain('probability');
      expect(error).toContain('finite');
    });
  });

  describe('Invalid Odds - Should Reject', () => {
    it('should reject odds between -100 and +100 (invalid range)', () => {
      const error1 = validateEVInputs(-50, 0.5);
      expect(error1).toContain('odds');
      
      const error2 = validateEVInputs(50, 0.5);
      expect(error2).toContain('odds');
    });

    it('should reject NaN odds', () => {
      const error = validateEVInputs(NaN, 0.5);
      expect(error).toContain('odds');
      expect(error).toContain('NaN');
    });

    it('should reject Infinity odds', () => {
      const error = validateEVInputs(Infinity, 0.5);
      expect(error).toContain('odds');
      expect(error).toContain('finite');
    });

    it('should reject zero odds', () => {
      const error = validateEVInputs(0, 0.5);
      expect(error).toContain('odds');
    });
  });

  describe('safeCalculateEV - Error Handling', () => {
    it('should return error for invalid probability', () => {
      const result = safeCalculateEV(150, 1.5, 100);
      expect(result.error).toBeTruthy();
      expect(result.evPercent).toBeNull();
      expect(result.evDollars).toBeNull();
    });

    it('should return error for invalid odds', () => {
      const result = safeCalculateEV(50, 0.5, 100);
      expect(result.error).toBeTruthy();
      expect(result.evPercent).toBeNull();
      expect(result.evDollars).toBeNull();
    });

    it('should return valid result for good inputs', () => {
      const result = safeCalculateEV(150, 0.6, 100);
      expect(result.error).toBeNull();
      expect(result.evPercent).toBeCloseTo(50, 1);
      expect(result.evDollars).toBeCloseTo(50, 1);
    });
  });

  describe('Output Validation', () => {
    it('should return finite numbers for all outputs', () => {
      const result = calculateEV(150, 0.6, 100);
      expect(Number.isFinite(result.evPercent)).toBe(true);
      expect(Number.isFinite(result.evDollars)).toBe(true);
      expect(Number.isFinite(result.profitIfWin)).toBe(true);
      expect(Number.isFinite(result.impliedProbability)).toBe(true);
    });

    it('should return non-NaN values', () => {
      const result = calculateEV(150, 0.6, 100);
      expect(Number.isNaN(result.evPercent)).toBe(false);
      expect(Number.isNaN(result.evDollars)).toBe(false);
      expect(Number.isNaN(result.profitIfWin)).toBe(false);
      expect(Number.isNaN(result.impliedProbability)).toBe(false);
    });

    it('should return positive profitIfWin', () => {
      const result = calculateEV(150, 0.6, 100);
      expect(result.profitIfWin).toBeGreaterThan(0);
    });

    it('should return impliedProbability between 0 and 1', () => {
      const result = calculateEV(150, 0.6, 100);
      expect(result.impliedProbability).toBeGreaterThan(0);
      expect(result.impliedProbability).toBeLessThan(1);
    });

    it('should have isPositiveEV match evPercent sign', () => {
      const positiveResult = calculateEV(150, 0.6, 100);
      expect(positiveResult.isPositiveEV).toBe(true);
      expect(positiveResult.evPercent).toBeGreaterThan(0);

      const negativeResult = calculateEV(-110, 0.5, 100);
      expect(negativeResult.isPositiveEV).toBe(false);
      expect(negativeResult.evPercent).toBeLessThan(0);
    });
  });

  describe('Stake Validation', () => {
    it('should accept positive stake', () => {
      const result = calculateEV(150, 0.6, 100);
      expect(Number.isFinite(result.evPercent)).toBe(true);
    });

    it('should scale correctly with different stakes', () => {
      const result100 = calculateEV(150, 0.6, 100);
      const result1000 = calculateEV(150, 0.6, 1000);

      // EV% should be the same regardless of stake
      expect(result100.evPercent).toBeCloseTo(result1000.evPercent, 1);

      // EV$ should scale with stake
      expect(result1000.evDollars).toBeCloseTo(result100.evDollars * 10, 1);
    });

    it('should handle very small stakes', () => {
      const result = calculateEV(150, 0.6, 0.01);
      expect(Number.isFinite(result.evPercent)).toBe(true);
      expect(Number.isFinite(result.evDollars)).toBe(true);
    });

    it('should handle very large stakes', () => {
      const result = calculateEV(150, 0.6, 1000000);
      expect(Number.isFinite(result.evPercent)).toBe(true);
      expect(Number.isFinite(result.evDollars)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme underdog odds (+10000)', () => {
      const result = calculateEV(10000, 0.01, 100);
      expect(Number.isFinite(result.evPercent)).toBe(true);
      expect(result.profitIfWin).toBe(10000);
    });

    it('should handle extreme favorite odds (-10000)', () => {
      const result = calculateEV(-10000, 0.99, 100);
      expect(Number.isFinite(result.evPercent)).toBe(true);
      expect(result.profitIfWin).toBeCloseTo(1, 1);
    });

    it('should handle probability very close to 0', () => {
      const result = calculateEV(10000, 0.001, 100);
      expect(Number.isFinite(result.evPercent)).toBe(true);
      expect(result.isPositiveEV).toBeDefined();
    });

    it('should handle probability very close to 1', () => {
      const result = calculateEV(-10000, 0.999, 100);
      expect(Number.isFinite(result.evPercent)).toBe(true);
      expect(result.isPositiveEV).toBeDefined();
    });
  });

  describe('Consistency Checks', () => {
    it('should have evDollars = (evPercent / 100) * stake', () => {
      const stake = 100;
      const result = calculateEV(150, 0.6, stake);
      const expectedDollars = (result.evPercent / 100) * stake;
      expect(result.evDollars).toBeCloseTo(expectedDollars, 2);
    });

    it('should have consistent results for same inputs', () => {
      const result1 = calculateEV(150, 0.6, 100);
      const result2 = calculateEV(150, 0.6, 100);
      
      expect(result1.evPercent).toBe(result2.evPercent);
      expect(result1.evDollars).toBe(result2.evDollars);
      expect(result1.profitIfWin).toBe(result2.profitIfWin);
    });
  });
});

