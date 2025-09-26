/********************************************
 * STANDARDIZED ERROR HANDLING - USE EVERYWHERE
 * Consistent error patterns across the application
 ********************************************/

/**
 * Custom error class for betting-related errors
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
 * Error codes for different types of betting errors
 */
export const ERROR_CODES = {
  // Input validation errors
  INVALID_ODDS: 'INVALID_ODDS',
  INVALID_PROBABILITY: 'INVALID_PROBABILITY',
  INVALID_STAKE: 'INVALID_STAKE',
  
  // Calculation errors
  CALCULATION_FAILED: 'CALCULATION_FAILED',
  DIVISION_BY_ZERO: 'DIVISION_BY_ZERO',
  OVERFLOW: 'OVERFLOW',
  
  // Data errors
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  STALE_DATA: 'STALE_DATA',
  MISSING_CONSENSUS: 'MISSING_CONSENSUS',
  
  // API errors
  API_TIMEOUT: 'API_TIMEOUT',
  API_ERROR: 'API_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Configuration errors
  INVALID_CONFIG: 'INVALID_CONFIG',
  MISSING_CONFIG: 'MISSING_CONFIG'
} as const;

/**
 * Result type for operations that can fail
 */
export type Result<T, E = BettingError> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

/**
 * Safe wrapper for calculations that might fail
 */
export function safeCalculation<T>(
  operation: () => T,
  context: string,
  errorCode: string = ERROR_CODES.CALCULATION_FAILED
): Result<T> {
  try {
    const result = operation();
    return { success: true, data: result };
  } catch (error) {
    const bettingError = error instanceof BettingError 
      ? error 
      : new BettingError(
          `${context}: ${error instanceof Error ? error.message : String(error)}`,
          errorCode,
          { originalError: error, context }
        );
    
    return { success: false, error: bettingError };
  }
}

/**
 * Handle calculation errors with consistent logging and fallback
 */
export function handleCalculationError(
  error: unknown, 
  context: string,
  fallbackValue: any = null
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`${context}:`, errorMessage);
  
  return {
    error: errorMessage,
    result: fallbackValue
  };
}

/**
 * Validate American odds
 */
export function validateAmericanOdds(odds: number): Result<number> {
  if (!Number.isFinite(odds)) {
    return {
      success: false,
      error: new BettingError('Odds must be a finite number', ERROR_CODES.INVALID_ODDS, { odds })
    };
  }
  
  if (odds === 0) {
    return {
      success: false,
      error: new BettingError('Odds cannot be zero', ERROR_CODES.INVALID_ODDS, { odds })
    };
  }
  
  if (Math.abs(odds) < 100) {
    return {
      success: false,
      error: new BettingError('American odds must be <= -100 or >= +100', ERROR_CODES.INVALID_ODDS, { odds })
    };
  }
  
  if (Math.abs(odds) > 10000) {
    return {
      success: false,
      error: new BettingError('Odds are unreasonably extreme', ERROR_CODES.INVALID_ODDS, { odds })
    };
  }
  
  return { success: true, data: odds };
}

/**
 * Validate probability (0-1)
 */
export function validateProbability(prob: number): Result<number> {
  if (!Number.isFinite(prob)) {
    return {
      success: false,
      error: new BettingError('Probability must be a finite number', ERROR_CODES.INVALID_PROBABILITY, { prob })
    };
  }
  
  if (prob <= 0 || prob >= 1) {
    return {
      success: false,
      error: new BettingError('Probability must be between 0 and 1', ERROR_CODES.INVALID_PROBABILITY, { prob })
    };
  }
  
  return { success: true, data: prob };
}

/**
 * Validate stake amount
 */
export function validateStake(stake: number): Result<number> {
  if (!Number.isFinite(stake)) {
    return {
      success: false,
      error: new BettingError('Stake must be a finite number', ERROR_CODES.INVALID_STAKE, { stake })
    };
  }
  
  if (stake <= 0) {
    return {
      success: false,
      error: new BettingError('Stake must be positive', ERROR_CODES.INVALID_STAKE, { stake })
    };
  }
  
  return { success: true, data: stake };
}

/**
 * Create a safe version of any function that validates inputs
 */
export function makeSafe<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  validators: Array<(arg: any) => Result<any>>,
  context: string
) {
  return (...args: TArgs): Result<TReturn> => {
    // Validate all inputs
    for (let i = 0; i < validators.length && i < args.length; i++) {
      const validation = validators[i](args[i]);
      if (!validation.success) {
        return validation as Result<TReturn>;
      }
    }
    
    // Execute the function safely
    return safeCalculation(() => fn(...args), context);
  };
}

/**
 * Log error with context for debugging
 */
export function logError(error: BettingError | Error, context?: string) {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` [${context}]` : '';
  
  if (error instanceof BettingError) {
    console.error(`${timestamp}${contextStr} BettingError [${error.code}]: ${error.message}`, error.context);
  } else {
    console.error(`${timestamp}${contextStr} Error: ${error.message}`, error);
  }
}
