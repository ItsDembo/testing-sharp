/********************************************
 * STANDARDIZED ERROR HANDLING - USE EVERYWHERE
 * Consistent error patterns across the entire codebase
 ********************************************/

import { CONFIG } from '../config';

/**
 * Base error class for all betting-related errors
 */
export class BettingError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'BettingError';
  }
}

/**
 * Specific error types
 */
export class ValidationError extends BettingError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class CalculationError extends BettingError {
  constructor(message: string, context?: any) {
    super(message, 'CALCULATION_ERROR', context);
    this.name = 'CalculationError';
  }
}

export class APIError extends BettingError {
  constructor(message: string, context?: any) {
    super(message, 'API_ERROR', context);
    this.name = 'APIError';
  }
}

export class DataError extends BettingError {
  constructor(message: string, context?: any) {
    super(message, 'DATA_ERROR', context);
    this.name = 'DataError';
  }
}

/**
 * Result wrapper for safe operations
 */
export type Result<T, E = BettingError> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

/**
 * Create a successful result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function failure<E extends BettingError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Safe calculation wrapper
 */
export function safeCalculation<T>(
  operation: () => T,
  context: string
): Result<T, CalculationError> {
  try {
    const result = operation();
    return success(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown calculation error';
    return failure(new CalculationError(`${context}: ${message}`, { originalError: error }));
  }
}

/**
 * Validation functions
 */
export function validateAmericanOdds(odds: number): Result<number, ValidationError> {
  if (!Number.isFinite(odds)) {
    return failure(new ValidationError('American odds must be a finite number', { odds }));
  }
  if (odds === 0) {
    return failure(new ValidationError('American odds cannot be zero', { odds }));
  }
  if (Math.abs(odds) < CONFIG.ODDS.MIN_AMERICAN_ODDS) {
    return failure(new ValidationError(
      `American odds must be <= -${CONFIG.ODDS.MIN_AMERICAN_ODDS} or >= +${CONFIG.ODDS.MIN_AMERICAN_ODDS}`,
      { odds, min: CONFIG.ODDS.MIN_AMERICAN_ODDS }
    ));
  }
  if (Math.abs(odds) > CONFIG.ODDS.MAX_AMERICAN_ODDS) {
    return failure(new ValidationError(
      `American odds must be between -${CONFIG.ODDS.MAX_AMERICAN_ODDS} and +${CONFIG.ODDS.MAX_AMERICAN_ODDS}`,
      { odds, max: CONFIG.ODDS.MAX_AMERICAN_ODDS }
    ));
  }
  return success(odds);
}

export function validateDecimalOdds(odds: number): Result<number, ValidationError> {
  if (!Number.isFinite(odds)) {
    return failure(new ValidationError('Decimal odds must be a finite number', { odds }));
  }
  if (odds <= 1) {
    return failure(new ValidationError('Decimal odds must be greater than 1', { odds }));
  }
  if (odds < CONFIG.ODDS.MIN_DECIMAL_ODDS || odds > CONFIG.ODDS.MAX_DECIMAL_ODDS) {
    return failure(new ValidationError(
      `Decimal odds must be between ${CONFIG.ODDS.MIN_DECIMAL_ODDS} and ${CONFIG.ODDS.MAX_DECIMAL_ODDS}`,
      { odds, min: CONFIG.ODDS.MIN_DECIMAL_ODDS, max: CONFIG.ODDS.MAX_DECIMAL_ODDS }
    ));
  }
  return success(odds);
}

export function validateProbability(prob: number): Result<number, ValidationError> {
  if (!Number.isFinite(prob)) {
    return failure(new ValidationError('Probability must be a finite number', { prob }));
  }
  if (prob <= 0 || prob >= 1) {
    return failure(new ValidationError('Probability must be between 0 and 1 (exclusive)', { prob }));
  }
  if (prob < CONFIG.ODDS.MIN_PROBABILITY || prob > CONFIG.ODDS.MAX_PROBABILITY) {
    return failure(new ValidationError(
      `Probability must be between ${CONFIG.ODDS.MIN_PROBABILITY} and ${CONFIG.ODDS.MAX_PROBABILITY}`,
      { prob, min: CONFIG.ODDS.MIN_PROBABILITY, max: CONFIG.ODDS.MAX_PROBABILITY }
    ));
  }
  return success(prob);
}

export function validateStake(stake: number): Result<number, ValidationError> {
  if (!Number.isFinite(stake)) {
    return failure(new ValidationError('Stake must be a finite number', { stake }));
  }
  if (stake <= 0) {
    return failure(new ValidationError('Stake must be positive', { stake }));
  }
  return success(stake);
}

/**
 * Generic error handler for consistent logging
 */
export function handleError(error: unknown, context: string): BettingError {
  if (error instanceof BettingError) {
    console.error(`${context}:`, error.message, error.context);
    return error;
  }
  
  if (error instanceof Error) {
    console.error(`${context}:`, error.message);
    return new BettingError(error.message, 'UNKNOWN_ERROR', { originalError: error });
  }
  
  console.error(`${context}:`, error);
  return new BettingError('Unknown error occurred', 'UNKNOWN_ERROR', { originalError: error });
}

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: string
): Promise<Result<T, BettingError>> {
  try {
    const result = await operation();
    return success(result);
  } catch (error) {
    return failure(handleError(error, context));
  }
}
