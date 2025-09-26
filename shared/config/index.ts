/********************************************
 * CENTRALIZED CONFIGURATION - USE EVERYWHERE
 * Single source of truth for all application settings
 ********************************************/

export const CONFIG = {
  // EV Calculation Settings
  EV: {
    DEFAULT_STAKE: 100,
    MIN_EV_THRESHOLD: -5,
    MIN_CONSENSUS_SAMPLES: 3,
    DECIMAL_PLACES: 1,
  },

  // Odds Filtering and Validation
  ODDS: {
    MIN_AMERICAN_ODDS: 100,
    MAX_AMERICAN_ODDS: 10000,
    MIN_DECIMAL_ODDS: 1.01,
    MAX_DECIMAL_ODDS: 101.0,
    MIN_PROBABILITY: 0.01,
    MAX_PROBABILITY: 0.99,
  },

  // API Settings
  API: {
    REFRESH_INTERVAL: 30000, // 30 seconds
    STALE_TIME: 25000, // 25 seconds
    TIMEOUT: 10000, // 10 seconds
    MAX_RETRIES: 3,
  },

  // UI Settings
  UI: {
    CURRENCY_FORMAT: 'USD',
    DATE_FORMAT: 'MM/dd/yyyy HH:mm',
    TIMEZONE: 'America/New_York',
    ITEMS_PER_PAGE: 50,
  },

  // Sportsbook Settings
  SPORTSBOOKS: {
    MAIN_BOOKS: ['FanDuel', 'DraftKings', 'BetMGM', 'Caesars'],
    ALL_BOOKS: [
      'FanDuel', 'DraftKings', 'BetMGM', 'Caesars', 
      'Barstool', 'PointsBet', 'BetRivers', 'Hard Rock',
      'WynnBET', 'Unibet', 'TwinSpires', 'FOX Bet'
    ],
    BOOK_WEIGHTS: {
      'FanDuel': 1.2,
      'DraftKings': 1.2,
      'BetMGM': 1.1,
      'Caesars': 1.1,
      'default': 1.0
    }
  },

  // Validation Thresholds
  VALIDATION: {
    MIN_CONSENSUS_BOOKS: 3,
    MAX_ODDS_DEVIATION: 0.2, // 20%
    STALE_DATA_THRESHOLD: 300000, // 5 minutes
    MIN_GAME_TIME_BUFFER: 900000, // 15 minutes before game
  },

  // Error Handling
  ERRORS: {
    MAX_ERROR_LOG_SIZE: 1000,
    ERROR_RETRY_DELAY: 1000, // 1 second
    CIRCUIT_BREAKER_THRESHOLD: 5,
  }
} as const;

// Type definitions for configuration
export type ConfigType = typeof CONFIG;
export type EVConfig = typeof CONFIG.EV;
export type OddsConfig = typeof CONFIG.ODDS;
export type APIConfig = typeof CONFIG.API;
export type UIConfig = typeof CONFIG.UI;
export type SportsbookConfig = typeof CONFIG.SPORTSBOOKS;
export type ValidationConfig = typeof CONFIG.VALIDATION;
export type ErrorConfig = typeof CONFIG.ERRORS;

// Helper functions for common config access
export const getDefaultStake = () => CONFIG.EV.DEFAULT_STAKE;
export const getRefreshInterval = () => CONFIG.API.REFRESH_INTERVAL;
export const getMainSportsbooks = () => CONFIG.SPORTSBOOKS.MAIN_BOOKS;
export const getAllSportsbooks = () => CONFIG.SPORTSBOOKS.ALL_BOOKS;
export const getBookWeight = (book: string) => 
  CONFIG.SPORTSBOOKS.BOOK_WEIGHTS[book as keyof typeof CONFIG.SPORTSBOOKS.BOOK_WEIGHTS] || 
  CONFIG.SPORTSBOOKS.BOOK_WEIGHTS.default;

// Validation helpers
export const isValidAmericanOdds = (odds: number): boolean => 
  Math.abs(odds) >= CONFIG.ODDS.MIN_AMERICAN_ODDS && 
  Math.abs(odds) <= CONFIG.ODDS.MAX_AMERICAN_ODDS;

export const isValidDecimalOdds = (odds: number): boolean => 
  odds >= CONFIG.ODDS.MIN_DECIMAL_ODDS && 
  odds <= CONFIG.ODDS.MAX_DECIMAL_ODDS;

export const isValidProbability = (prob: number): boolean => 
  prob >= CONFIG.ODDS.MIN_PROBABILITY && 
  prob <= CONFIG.ODDS.MAX_PROBABILITY;
