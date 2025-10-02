import { calcUiRow } from '../shared/market/calc';
import { NormalizedProp } from '../shared/market/types';
import { americanToDecimal, impliedFromAmerican, devigBinary, median } from '../shared/market/math';

describe('New EV Logic System', () => {
  describe('Math Utilities', () => {
    test('americanToDecimal converts correctly', () => {
      expect(americanToDecimal(100)).toBe(2.0);
      expect(americanToDecimal(-110)).toBeCloseTo(1.909, 3);
      expect(americanToDecimal(200)).toBe(3.0);
      expect(americanToDecimal(-200)).toBe(1.5);
    });

    test('impliedFromAmerican calculates probabilities correctly', () => {
      expect(impliedFromAmerican(100)).toBe(0.5);
      expect(impliedFromAmerican(-110)).toBeCloseTo(0.524, 3);
      expect(impliedFromAmerican(200)).toBeCloseTo(0.333, 3);
      expect(impliedFromAmerican(-200)).toBeCloseTo(0.667, 3);
    });

    test('devigBinary removes vig correctly', () => {
      const result = devigBinary(0.55, 0.48); // 103% total
      expect(result.p1).toBeCloseTo(0.534, 3);
      expect(result.p2).toBeCloseTo(0.466, 3);
      expect(result.p1 + result.p2).toBeCloseTo(1.0, 3);
    });

    test('median calculates correctly', () => {
      expect(median([1, 2, 3])).toBe(2);
      expect(median([1, 2, 3, 4])).toBe(2.5);
      expect(median([5, 2, 8, 1, 9])).toBe(5);
      expect(median([])).toBeNaN();
    });
  });

  describe('EV Calculation', () => {
    test('calculates EV correctly for single book scenario', () => {
      const prop: NormalizedProp = {
        eventId: 'test-1',
        eventLabel: 'Celtics @ Lakers',
        league: 'NBA',
        market: 'Moneyline',
        propLabel: 'Celtics Moneyline',
        status: 'upcoming',
        myBook: 'fanduel',
        sideA: {
          label: 'Celtics ML',
          quotes: [
            { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        sideB: {
          label: 'Lakers ML',
          quotes: [
            { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        rowSide: 'A'
      };

      const result = calcUiRow(prop);
      
      expect(result.myOddsAmerican).toBe(-110);
      // When only one book exists, consensus is null (no field books to compare against)
      expect(result.winProbability).toBeNull();
      expect(result.evPct).toBeNull();
    });

    test('calculates EV correctly with field consensus', () => {
      const prop: NormalizedProp = {
        eventId: 'test-2',
        eventLabel: 'Yankees @ Red Sox',
        league: 'MLB',
        market: 'Moneyline',
        propLabel: 'Yankees Moneyline',
        status: 'upcoming',
        myBook: 'fanduel',
        sideA: {
          label: 'Yankees ML',
          quotes: [
            { sportsbook: 'FanDuel', price: -120, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
            { sportsbook: 'DraftKings', price: -118, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        sideB: {
          label: 'Red Sox ML',
          quotes: [
            { sportsbook: 'FanDuel', price: +100, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
            { sportsbook: 'DraftKings', price: +102, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        rowSide: 'A'
      };

      const result = calcUiRow(prop);
      
      expect(result.myOddsAmerican).toBe(-120);
      // Consensus from DraftKings only (excluding FanDuel)
      expect(result.winProbability).toBeCloseTo(0.522, 3); // Actual calculated value
      expect(result.evPct).toBeCloseTo(-0.042, 3); // Actual calculated EV value
    });

    test('excludes my book from consensus calculation', () => {
      const prop: NormalizedProp = {
        eventId: 'test-3',
        eventLabel: 'Chiefs @ Bills',
        league: 'NFL',
        market: 'Spread',
        propLabel: 'Chiefs -3.5',
        status: 'upcoming',
        myBook: 'fanduel',
        sideA: {
          label: 'Chiefs -3.5',
          quotes: [
            { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
            { sportsbook: 'DraftKings', price: -108, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        sideB: {
          label: 'Bills +3.5',
          quotes: [
            { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
            { sportsbook: 'DraftKings', price: -112, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        rowSide: 'A'
      };

      const result = calcUiRow(prop);
      
      // Consensus should only use DraftKings odds (excluding FanDuel)
      expect(result.winProbability).toBeCloseTo(0.496, 3); // Actual calculated value from DraftKings only
      expect(result.fieldOdds).toHaveLength(1);
      expect(result.fieldOdds[0].sportsbook).toBe('DraftKings');
    });

    test('handles missing field books gracefully', () => {
      const prop: NormalizedProp = {
        eventId: 'test-4',
        eventLabel: 'Lakers @ Warriors',
        league: 'NBA',
        market: 'Total',
        propLabel: 'Over 220.5',
        status: 'upcoming',
        myBook: 'fanduel',
        sideA: {
          label: 'Over 220.5',
          quotes: [
            { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        sideB: {
          label: 'Under 220.5',
          quotes: [
            { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        rowSide: 'A'
      };

      const result = calcUiRow(prop);
      
      // No field books available, so consensus and EV should be null
      expect(result.winProbability).toBeNull();
      expect(result.evPct).toBeNull();
      expect(result.fieldOdds).toHaveLength(0);
    });

    test('calculates freshness correctly', () => {
      const oldTime = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
      const recentTime = new Date(Date.now() - 30000).toISOString(); // 30 seconds ago
      
      const prop: NormalizedProp = {
        eventId: 'test-5',
        eventLabel: 'Heat @ Knicks',
        league: 'NBA',
        market: 'Moneyline',
        propLabel: 'Heat Moneyline',
        status: 'live',
        myBook: 'fanduel',
        sideA: {
          label: 'Heat ML',
          quotes: [
            { sportsbook: 'FanDuel', price: -105, oddsFormat: 'american', lastUpdate: recentTime }
          ]
        },
        sideB: {
          label: 'Knicks ML',
          quotes: [
            { sportsbook: 'FanDuel', price: -115, oddsFormat: 'american', lastUpdate: oldTime }
          ]
        },
        rowSide: 'A'
      };

      const result = calcUiRow(prop);
      
      expect(result.ageSeconds).toBeGreaterThan(0);
      expect(result.ageSeconds).toBeLessThan(120); // Should be closer to 30 seconds
    });
  });

  describe('Edge Cases', () => {
    test('handles extreme odds gracefully', () => {
      const prop: NormalizedProp = {
        eventId: 'test-6',
        eventLabel: 'Underdog @ Favorite',
        league: 'MLB',
        market: 'Moneyline',
        propLabel: 'Underdog Moneyline',
        status: 'upcoming',
        myBook: 'fanduel',
        sideA: {
          label: 'Underdog ML',
          quotes: [
            { sportsbook: 'FanDuel', price: +500, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        sideB: {
          label: 'Favorite ML',
          quotes: [
            { sportsbook: 'FanDuel', price: -800, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        rowSide: 'A'
      };

      const result = calcUiRow(prop);
      
      expect(result.myOddsAmerican).toBe(+500);
      // Single book scenario - no consensus available
      expect(result.winProbability).toBeNull();
      expect(result.evPct).toBeNull();
    });

    test('handles missing timestamps gracefully', () => {
      const prop: NormalizedProp = {
        eventId: 'test-7',
        eventLabel: 'Game Without Timestamps',
        league: 'NHL',
        market: 'Moneyline',
        propLabel: 'Home Moneyline',
        status: 'upcoming',
        myBook: 'fanduel',
        sideA: {
          label: 'Home ML',
          quotes: [
            { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american' }
          ]
        },
        sideB: {
          label: 'Away ML',
          quotes: [
            { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american' }
          ]
        },
        rowSide: 'A'
      };

      const result = calcUiRow(prop);
      
      expect(result.ageSeconds).toBeUndefined();
      expect(result.myOddsAmerican).toBe(-110);
    });
  });

  describe('Integration Tests', () => {
    test('full workflow with multiple books', () => {
      const prop: NormalizedProp = {
        eventId: 'test-8',
        eventLabel: 'Multi-Book Game',
        league: 'NFL',
        market: 'Spread',
        propLabel: 'Home -7.5',
        status: 'upcoming',
        myBook: 'fanduel',
        sideA: {
          label: 'Home -7.5',
          quotes: [
            { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
            { sportsbook: 'DraftKings', price: -108, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
            { sportsbook: 'BetMGM', price: -112, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        sideB: {
          label: 'Away +7.5',
          quotes: [
            { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
            { sportsbook: 'DraftKings', price: -112, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
            { sportsbook: 'BetMGM', price: -108, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
          ]
        },
        rowSide: 'A'
      };

      const result = calcUiRow(prop);
      
      // Should have consensus from DraftKings and BetMGM (excluding FanDuel)
      expect(result.fieldOdds).toHaveLength(2);
      expect(result.fieldOdds.map(o => o.sportsbook)).toContain('DraftKings');
      expect(result.fieldOdds.map(o => o.sportsbook)).toContain('BetMGM');
      expect(result.fieldOdds.map(o => o.sportsbook)).not.toContain('FanDuel');
      
      // Should have valid EV calculation
      expect(result.winProbability).toBeGreaterThan(0);
      expect(result.winProbability).toBeLessThan(1);
      expect(result.evPct).toBeDefined();
    });
  });
});
