import { calculateEV, calculateEVPercent, validateEVInputs, safeCalculateEV } from '../evCalculations';
import { americanToDecimal, decimalToAmerican, americanToImpliedProb, probabilityToAmerican } from '../oddsConversion';

describe('EV Calculations', () => {
  test('positive EV with positive odds', () => {
    // +150 odds, 60% fair probability, $100 stake
    // Decimal odds: 2.5, Profit if win: $150, EV = (0.6 × 150) - (0.4 × 100) = 50
    // EV% = 50/100 × 100 = 50%
    const result = calculateEV(150, 0.6, 100);
    expect(result.evPercent).toBeCloseTo(50);
    expect(result.evDollars).toBeCloseTo(50);
    expect(result.profitIfWin).toBeCloseTo(150);
    expect(result.isPositiveEV).toBe(true);
  });

  test('negative EV with negative odds', () => {
    // -200 odds, 40% fair probability, $100 stake
    // Decimal odds: 1.5, Profit if win: $50, EV = (0.4 × 50) - (0.6 × 100) = -40
    // EV% = -40/100 × 100 = -40%
    const result = calculateEV(-200, 0.4, 100);
    expect(result.evPercent).toBeCloseTo(-40);
    expect(result.evDollars).toBeCloseTo(-40);
    expect(result.profitIfWin).toBeCloseTo(50);
    expect(result.isPositiveEV).toBe(false);
  });

  test('zero EV (fair odds)', () => {
    // +100 odds, 50% fair probability, $100 stake
    // Decimal odds: 2.0, Profit if win: $100, EV = (0.5 × 100) - (0.5 × 100) = 0
    const result = calculateEV(100, 0.5, 100);
    expect(result.evPercent).toBeCloseTo(0);
    expect(result.evDollars).toBeCloseTo(0);
    expect(result.isPositiveEV).toBe(false);
  });

  test('calculateEVPercent convenience function', () => {
    const evPercent = calculateEVPercent(150, 0.6, 100);
    expect(evPercent).toBeCloseTo(50);
  });

  test('validation functions', () => {
    expect(validateEVInputs(150, 0.6)).toBeNull();
    expect(validateEVInputs(50, 0.6)).toContain('American odds must be');
    expect(validateEVInputs(150, 1.5)).toContain('Fair probability must be between 0 and 1');
    expect(validateEVInputs(150, -0.1)).toContain('Fair probability must be between 0 and 1');
  });

  test('safe calculation wrapper', () => {
    const validResult = safeCalculateEV(150, 0.6, 100);
    expect(validResult.error).toBeNull();
    expect(validResult.evPercent).toBeCloseTo(50);

    const invalidResult = safeCalculateEV(50, 0.6, 100);
    expect(invalidResult.error).toContain('American odds must be');
    expect(invalidResult.evPercent).toBeNull();
  });
});

describe('Odds Conversion Functions', () => {
  test('americanToDecimal conversions', () => {
    expect(americanToDecimal(100)).toBeCloseTo(2.0);
    expect(americanToDecimal(150)).toBeCloseTo(2.5);
    expect(americanToDecimal(-200)).toBeCloseTo(1.5);
    expect(americanToDecimal(-150)).toBeCloseTo(1.667, 2);
  });

  test('decimalToAmerican conversions', () => {
    expect(decimalToAmerican(2.0)).toBe(100);
    expect(decimalToAmerican(2.5)).toBe(150);
    expect(decimalToAmerican(1.5)).toBe(-200);
    expect(decimalToAmerican(1.667)).toBe(-150);
  });

  test('americanToImpliedProb conversions', () => {
    expect(americanToImpliedProb(100)).toBeCloseTo(0.5);
    expect(americanToImpliedProb(-200)).toBeCloseTo(0.667, 2);
    expect(americanToImpliedProb(150)).toBeCloseTo(0.4);
  });

  test('probabilityToAmerican conversions', () => {
    expect(probabilityToAmerican(0.5)).toBe(100);
    expect(probabilityToAmerican(0.667)).toBe(-200);
    expect(probabilityToAmerican(0.4)).toBe(150);
  });

  test('round-trip conversions', () => {
    const testOdds = [100, 150, -200, -150, 250, -110];
    testOdds.forEach(odds => {
      const decimal = americanToDecimal(odds);
      const backToAmerican = decimalToAmerican(decimal);
      expect(backToAmerican).toBeCloseTo(odds, 0);
    });
  });

  test('error handling for invalid inputs', () => {
    expect(() => americanToDecimal(0)).toThrow('Invalid American odds');
    expect(() => americanToDecimal(50)).toThrow('American odds must be');
    expect(() => decimalToAmerican(1)).toThrow('Invalid decimal odds');
    expect(() => probabilityToAmerican(0)).toThrow('Probability must be between 0 and 1');
    expect(() => probabilityToAmerican(1)).toThrow('Probability must be between 0 and 1');
  });
});

  test('break-even scenario', () => {
    // -110 odds, ~52.38% fair probability
    const result = calculateEV(-110, 0.5238, 100);
    expect(result.evPercent).toBeCloseTo(0, 1);
  });
});