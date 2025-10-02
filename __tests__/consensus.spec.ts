// __tests__/consensus.spec.ts
// Comprehensive test suite for consensus calculation

import { describe, it, expect } from 'vitest';
import { 
  calculateConsensusStrict, 
  calculateFieldAverage, 
  calculateEV, 
  calculateEdge,
  type Quote 
} from '../src/server/odds/consensus';

describe('Consensus Calculation', () => {
  describe('calculateConsensusStrict', () => {
    it('should calculate consensus for even ML market', () => {
      const quotes: Quote[] = [
        {
          sportsbook: 'Book1',
          eventId: 'game1',
          marketType: 'moneyline',
          participants: { homeId: 'home1', awayId: 'away1' },
          outcomes: [
            { name: 'Home', selectionId: 'home1', price: -110, oddsFormat: 'american' },
            { name: 'Away', selectionId: 'away1', price: -110, oddsFormat: 'american' }
          ],
          lastUpdate: new Date().toISOString()
        },
        {
          sportsbook: 'Book2',
          eventId: 'game1',
          marketType: 'moneyline',
          participants: { homeId: 'home1', awayId: 'away1' },
          outcomes: [
            { name: 'Home', selectionId: 'home1', price: -115, oddsFormat: 'american' },
            { name: 'Away', selectionId: 'away1', price: -105, oddsFormat: 'american' }
          ],
          lastUpdate: new Date().toISOString()
        },
        {
          sportsbook: 'Book3',
          eventId: 'game1',
          marketType: 'moneyline',
          participants: { homeId: 'home1', awayId: 'away1' },
          outcomes: [
            { name: 'Home', selectionId: 'home1', price: -108, oddsFormat: 'american' },
            { name: 'Away', selectionId: 'away1', price: -112, oddsFormat: 'american' }
          ],
          lastUpdate: new Date().toISOString()
        }
      ];

      const result = calculateConsensusStrict(quotes);
      
      expect(result).toHaveLength(2); // home and away outcomes
      
      const homeResult = result.find(r => r.prob > 0.5);
      const awayResult = result.find(r => r.prob < 0.5);
      
      expect(homeResult).toBeDefined();
      expect(awayResult).toBeDefined();
      expect(homeResult!.prob + awayResult!.prob).toBeCloseTo(1, 2);
      expect(homeResult!.prob).toBeCloseTo(0.5, 1); // Should be close to 50%
    });

    it('should filter out absurd outlier odds', () => {
      const quotes: Quote[] = [
        {
          sportsbook: 'Book1',
          eventId: 'game1',
          marketType: 'moneyline',
          participants: { homeId: 'home1', awayId: 'away1' },
          outcomes: [
            { name: 'Home', selectionId: 'home1', price: -110, oddsFormat: 'american' },
            { name: 'Away', selectionId: 'away1', price: -110, oddsFormat: 'american' }
          ],
          lastUpdate: new Date().toISOString()
        },
        {
          sportsbook: 'Book2',
          eventId: 'game1',
          marketType: 'moneyline',
          participants: { homeId: 'home1', awayId: 'away1' },
          outcomes: [
            { name: 'Home', selectionId: 'home1', price: -5999, oddsFormat: 'american' }, // Absurd outlier
            { name: 'Away', selectionId: 'away1', price: -105, oddsFormat: 'american' }
          ],
          lastUpdate: new Date().toISOString()
        },
        {
          sportsbook: 'Book3',
          eventId: 'game1',
          marketType: 'moneyline',
          participants: { homeId: 'home1', awayId: 'away1' },
          outcomes: [
            { name: 'Home', selectionId: 'home1', price: -108, oddsFormat: 'american' },
            { name: 'Away', selectionId: 'away1', price: -112, oddsFormat: 'american' }
          ],
          lastUpdate: new Date().toISOString()
        }
      ];

      const result = calculateConsensusStrict(quotes);
      
      // Should still calculate consensus from the other two books
      expect(result).toHaveLength(2);
      
      const homeResult = result.find(r => r.prob > 0.5);
      expect(homeResult!.prob).toBeCloseTo(0.5, 1); // Should be close to 50% (not affected by outlier)
    });

    it('should require all three outcomes for three-way markets', () => {
      const quotes: Quote[] = [
        {
          sportsbook: 'Book1',
          eventId: 'game1',
          marketType: 'threeway',
          participants: { homeId: 'home1', awayId: 'away1', drawId: 'draw1' },
          outcomes: [
            { name: 'Home', selectionId: 'home1', price: -110, oddsFormat: 'american' },
            { name: 'Away', selectionId: 'away1', price: -110, oddsFormat: 'american' },
            { name: 'Draw', selectionId: 'draw1', price: 800, oddsFormat: 'american' }
          ],
          lastUpdate: new Date().toISOString()
        },
        {
          sportsbook: 'Book2',
          eventId: 'game1',
          marketType: 'threeway',
          participants: { homeId: 'home1', awayId: 'away1', drawId: 'draw1' },
          outcomes: [
            { name: 'Home', selectionId: 'home1', price: -115, oddsFormat: 'american' },
            { name: 'Away', selectionId: 'away1', price: -105, oddsFormat: 'american' }
            // Missing draw outcome
          ],
          lastUpdate: new Date().toISOString()
        }
      ];

      const result = calculateConsensusStrict(quotes);
      
      // Should not calculate consensus due to incomplete outcomes
      expect(result).toHaveLength(0);
    });

    it('should exclude stale quotes', () => {
      const staleTime = new Date(Date.now() - 400000); // 400 seconds ago (stale)
      
      const quotes: Quote[] = [
        {
          sportsbook: 'Book1',
          eventId: 'game1',
          marketType: 'moneyline',
          participants: { homeId: 'home1', awayId: 'away1' },
          outcomes: [
            { name: 'Home', selectionId: 'home1', price: -110, oddsFormat: 'american' },
            { name: 'Away', selectionId: 'away1', price: -110, oddsFormat: 'american' }
          ],
          lastUpdate: staleTime.toISOString()
        }
      ];

      const result = calculateConsensusStrict(quotes);
      
      // Should not calculate consensus from stale quotes
      expect(result).toHaveLength(0);
    });

    it('should handle decimal odds format', () => {
      const quotes: Quote[] = [
        {
          sportsbook: 'Book1',
          eventId: 'game1',
          marketType: 'moneyline',
          participants: { homeId: 'home1', awayId: 'away1' },
          outcomes: [
            { name: 'Home', selectionId: 'home1', price: 1.91, oddsFormat: 'decimal' },
            { name: 'Away', selectionId: 'away1', price: 1.91, oddsFormat: 'decimal' }
          ],
          lastUpdate: new Date().toISOString()
        },
        {
          sportsbook: 'Book2',
          eventId: 'game1',
          marketType: 'moneyline',
          participants: { homeId: 'home1', awayId: 'away1' },
          outcomes: [
            { name: 'Home', selectionId: 'home1', price: 1.87, oddsFormat: 'decimal' },
            { name: 'Away', selectionId: 'away1', price: 1.95, oddsFormat: 'american' }
          ],
          lastUpdate: new Date().toISOString()
        }
      ];

      const result = calculateConsensusStrict(quotes);
      
      // Should handle mixed formats correctly
      expect(result).toHaveLength(2);
    });
  });

  describe('calculateFieldAverage', () => {
    it('should require minimum 3 competitor books', () => {
      const oddsComparison = [
        { odds: -110, isMainBook: true },
        { odds: -105, isMainBook: false },
        { odds: -108, isMainBook: false }
      ];

      const result = calculateFieldAverage(oddsComparison);
      
      // Should return undefined due to insufficient competitor books
      expect(result).toBeUndefined();
    });

    it('should filter out main book and calculate average', () => {
      const oddsComparison = [
        { odds: -110, isMainBook: true },
        { odds: -105, isMainBook: false },
        { odds: -108, isMainBook: false },
        { odds: -112, isMainBook: false }
      ];

      const result = calculateFieldAverage(oddsComparison);
      
      expect(result).toBeDefined();
      expect(result).toBeCloseTo(-108.33, 0); // Average of -105, -108, -112
    });

    it('should handle outlier filtering', () => {
      const oddsComparison = [
        { odds: -110, isMainBook: true },
        { odds: -105, isMainBook: false },
        { odds: -108, isMainBook: false },
        { odds: -10000, isMainBook: false }, // Extreme outlier
        { odds: -112, isMainBook: false }
      ];

      const result = calculateFieldAverage(oddsComparison);
      
      // Should filter out outlier and calculate from remaining odds
      expect(result).toBeDefined();
      expect(result).toBeCloseTo(-108.33, 0); // Average of -105, -108, -112
    });
  });

  describe('calculateEV', () => {
    it('should calculate EV correctly for positive odds', () => {
      const bookAmerican = 200; // +200 odds
      const consensusProb = 0.4; // 40% probability
      const stake = 100;
      
      const ev = calculateEV(bookAmerican, consensusProb, stake);
      
      // EV = (0.4 * 200) - (0.6 * 100) = 80 - 60 = 20
      // EV% = 20 / 100 = 20%
      expect(ev).toBeCloseTo(20, 1);
    });

    it('should calculate EV correctly for negative odds', () => {
      const bookAmerican = -150; // -150 odds
      const consensusProb = 0.6; // 60% probability
      const stake = 100;
      
      const ev = calculateEV(bookAmerican, consensusProb, stake);
      
      // EV = (0.6 * 66.67) - (0.4 * 100) = 40 - 40 = 0
      // EV% = 0 / 100 = 0%
      expect(ev).toBeCloseTo(0, 1);
    });

    it('should handle edge cases', () => {
      expect(calculateEV(NaN, 0.5)).toBe(0);
      expect(calculateEV(100, NaN)).toBe(0);
      expect(calculateEV(0, 0.5)).toBe(0);
    });
  });

  describe('calculateEdge', () => {
    it('should calculate edge correctly', () => {
      const bookAmerican = -110; // -110 odds
      const consensusProb = 0.5; // 50% probability
      
      const edge = calculateEdge(bookAmerican, consensusProb);
      
      // Fair decimal = 1/0.5 = 2.0
      // Book decimal = 1 + 100/110 = 1.909
      // Edge = (1.909 - 2.0) / 2.0 * 100 = -4.55%
      expect(edge).toBeCloseTo(-4.55, 1);
    });

    it('should handle edge cases', () => {
      expect(calculateEdge(NaN, 0.5)).toBe(0);
      expect(calculateEdge(100, NaN)).toBe(0);
      expect(calculateEdge(0, 0.5)).toBe(0);
    });
  });

  describe('Edge cases and validation', () => {
    it('should reject quotes with invalid outcomes', () => {
      const quotes: Quote[] = [
        {
          sportsbook: 'Book1',
          eventId: 'game1',
          marketType: 'moneyline',
          participants: { homeId: 'home1', awayId: 'away1' },
          outcomes: [
            { name: 'Field', selectionId: 'home1', price: -110, oddsFormat: 'american' }, // Invalid name
            { name: 'Away', selectionId: 'away1', price: -110, oddsFormat: 'american' }
          ],
          lastUpdate: new Date().toISOString()
        }
      ];

      const result = calculateConsensusStrict(quotes);
      expect(result).toHaveLength(0);
    });

    it('should handle missing participant IDs gracefully', () => {
      const quotes: Quote[] = [
        {
          sportsbook: 'Book1',
          eventId: 'game1',
          marketType: 'moneyline',
          participants: {}, // Missing IDs
          outcomes: [
            { name: 'Home', selectionId: 'home1', price: -110, oddsFormat: 'american' },
            { name: 'Away', selectionId: 'away1', price: -110, oddsFormat: 'american' }
          ],
          lastUpdate: new Date().toISOString()
        }
      ];

      const result = calculateConsensusStrict(quotes);
      expect(result).toHaveLength(0);
    });
  });
});
