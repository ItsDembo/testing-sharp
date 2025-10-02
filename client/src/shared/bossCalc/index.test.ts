import { describe, it, expect } from 'vitest';
import { calcBossRow, type BossCalcInput, type BookQuote } from './index';

describe('Boss Calculation Module', () => {
  const mockBookQuote = (sportsbook: string, odds: number, format: 'american' | 'decimal' = 'american'): BookQuote => ({
    sportsbook,
    odds,
    oddsFormat: format,
    lastUpdate: new Date().toISOString()
  });

  describe('calcBossRow', () => {
    it('should calculate correct win probability and EV for favorite vs underdog', () => {
      const input: BossCalcInput = {
        eventId: 'test-1',
        league: 'NBA',
        eventLabel: 'Celtics @ Lakers (2025-10-12 7:00p)',
        market: 'Moneyline',
        propLabel: 'Celtics Moneyline',
        myBook: 'FanDuel',
        myOdds: mockBookQuote('FanDuel', -110),
        pair: {
          sideA: {
            label: 'Celtics Moneyline',
            quotes: [
              mockBookQuote('FanDuel', -110),
              mockBookQuote('DraftKings', -115),
              mockBookQuote('BetMGM', -108)
            ]
          },
          sideB: {
            label: 'Lakers Moneyline',
            quotes: [
              mockBookQuote('FanDuel', -110),
              mockBookQuote('DraftKings', -105),
              mockBookQuote('BetMGM', -112)
            ]
          }
        }
      };

      const result = calcBossRow(input);

      // Should exclude FanDuel from field consensus
      expect(result.fieldOdds).toHaveLength(2);
      expect(result.fieldOdds.map(f => f.sportsbook)).toEqual(['BetMGM', 'DraftKings']);
      
      // Win probability should be median of field (excluding FanDuel)
      expect(result.winProbability).toBeGreaterThan(0.4);
      expect(result.winProbability).toBeLessThan(0.6);
      
      // EV should be calculated correctly
      expect(result.evPct).toBeDefined();
      expect(result.myOdds).toBe(-110);
    });

    it('should handle positive American odds correctly', () => {
      const input: BossCalcInput = {
        eventId: 'test-2',
        league: 'NFL',
        eventLabel: 'Chiefs @ Bills (2025-10-12 1:00p)',
        market: 'Moneyline',
        propLabel: 'Bills Moneyline',
        myBook: 'FanDuel',
        myOdds: mockBookQuote('FanDuel', +150),
        pair: {
          sideA: {
            label: 'Bills Moneyline',
            quotes: [
              mockBookQuote('FanDuel', +150),
              mockBookQuote('DraftKings', +145),
              mockBookQuote('BetMGM', +155)
            ]
          },
          sideB: {
            label: 'Chiefs Moneyline',
            quotes: [
              mockBookQuote('FanDuel', -180),
              mockBookQuote('DraftKings', -175),
              mockBookQuote('BetMGM', -185)
            ]
          }
        }
      };

      const result = calcBossRow(input);

      expect(result.myOdds).toBe(150);
      expect(result.winProbability).toBeDefined();
      expect(result.evPct).toBeDefined();
    });

    it('should handle decimal odds format', () => {
      const input: BossCalcInput = {
        eventId: 'test-3',
        league: 'MLB',
        eventLabel: 'Yankees @ Red Sox (2025-10-12 7:00p)',
        market: 'Total Points',
        propLabel: 'Over 8.5',
        myBook: 'Bet365',
        myOdds: mockBookQuote('Bet365', 1.91, 'decimal'),
        pair: {
          sideA: {
            label: 'Over 8.5',
            quotes: [
              mockBookQuote('Bet365', 1.91, 'decimal'),
              mockBookQuote('FanDuel', 1.95, 'decimal')
            ]
          },
          sideB: {
            label: 'Under 8.5',
            quotes: [
              mockBookQuote('Bet365', 1.91, 'decimal'),
              mockBookQuote('FanDuel', 1.85, 'decimal')
            ]
          }
        }
      };

      const result = calcBossRow(input);

      expect(result.myOdds).toBe(-110); // Converted from decimal
      expect(result.winProbability).toBeDefined();
      expect(result.evPct).toBeDefined();
    });

    it('should return null for win probability and EV when no field books available', () => {
      const input: BossCalcInput = {
        eventId: 'test-4',
        league: 'NBA',
        eventLabel: 'Test Game',
        market: 'Moneyline',
        propLabel: 'Team A Moneyline',
        myBook: 'FanDuel',
        myOdds: mockBookQuote('FanDuel', -110),
        pair: {
          sideA: {
            label: 'Team A Moneyline',
            quotes: [mockBookQuote('FanDuel', -110)]
          },
          sideB: {
            label: 'Team B Moneyline',
            quotes: [mockBookQuote('FanDuel', -110)]
          }
        }
      };

      const result = calcBossRow(input);

      expect(result.winProbability).toBeNull();
      expect(result.evPct).toBeNull();
      expect(result.fieldOdds).toHaveLength(0);
      expect(result.myOdds).toBe(-110);
    });

    it('should handle missing one side at a book', () => {
      const input: BossCalcInput = {
        eventId: 'test-5',
        league: 'NFL',
        eventLabel: 'Test Game',
        market: 'Spread',
        propLabel: 'Team A -3.5',
        myBook: 'FanDuel',
        myOdds: mockBookQuote('FanDuel', -110),
        pair: {
          sideA: {
            label: 'Team A -3.5',
            quotes: [
              mockBookQuote('FanDuel', -110),
              mockBookQuote('DraftKings', -115)
            ]
          },
          sideB: {
            label: 'Team B +3.5',
            quotes: [
              mockBookQuote('FanDuel', -110)
              // DraftKings missing this side
            ]
          }
        }
      };

      const result = calcBossRow(input);

      // Should only use FanDuel for consensus since it has both sides
      expect(result.fieldOdds).toHaveLength(0);
      expect(result.winProbability).toBeNull();
      expect(result.evPct).toBeNull();
    });

    it('should clamp probabilities to safe range', () => {
      const input: BossCalcInput = {
        eventId: 'test-6',
        league: 'Test',
        eventLabel: 'Test Game',
        market: 'Test',
        propLabel: 'Test Side',
        myBook: 'FanDuel',
        myOdds: mockBookQuote('FanDuel', -10000), // Very extreme odds
        pair: {
          sideA: {
            label: 'Test Side',
            quotes: [
              mockBookQuote('FanDuel', -10000),
              mockBookQuote('DraftKings', -10000)
            ]
          },
          sideB: {
            label: 'Other Side',
            quotes: [
              mockBookQuote('FanDuel', +10000),
              mockBookQuote('DraftKings', +10000)
            ]
          }
        }
      };

      const result = calcBossRow(input);

      // Should handle extreme odds gracefully
      expect(result.myOdds).toBe(-10000);
      expect(result.winProbability).toBeDefined();
      expect(result.evPct).toBeDefined();
    });
  });
});
