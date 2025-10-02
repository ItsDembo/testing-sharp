/********************************************
 * CANONICAL EV CALCULATIONS - USE EVERYWHERE
 * EV% = ((Pwin * ProfitWin) - ((1-Pwin) * Stake)) / Stake * 100
 ********************************************/

import { americanToDecimal, decimalToImpliedProb } from './oddsConversion';

export interface EVResult {
  evPercent: number;
  evDollars: number;
  profitIfWin: number;
  impliedProbability: number;
  isPositiveEV: boolean;
}

// MASTER EV CALCULATION (canonical)
export function calculateEV(bookOdds: number, fairProbability: number, stake: number = 100): EVResult {
  if (!Number.isFinite(bookOdds)) {
    throw new Error('Invalid book odds');
  }
  if (!Number.isFinite(fairProbability) || fairProbability <= 0 || fairProbability >= 1) {
    throw new Error('Fair probability must be a decimal in (0,1)');
  }
  if (!Number.isFinite(stake) || stake <= 0) {
    throw new Error('Stake must be positive');
  }

  const decimal = americanToDecimal(bookOdds);
  const profitIfWin = stake * (decimal - 1);
  const lossIfLose = stake;

  // EV in dollars
  const evDollars = (fairProbability * profitIfWin) - ((1 - fairProbability) * lossIfLose);
  // EV as percent of stake
  const evPercent = (evDollars / stake) * 100;

  const impliedProbability = decimalToImpliedProb(decimal);

  return {
    evPercent,
    evDollars,
    profitIfWin,
    impliedProbability,
    isPositiveEV: evPercent > 0,
  };
}

// Convenience wrapper returning only EV%
export function calculateEVPercent(bookOdds: number, fairProb: number, stake: number = 100): number {
  return calculateEV(bookOdds, fairProb, stake).evPercent;
}

// Validation helpers for safe UI usage
export function validateEVInputs(bookOdds: number, fairProb: number): string | null {
  // Validate odds
  if (typeof bookOdds !== 'number') {
    return `Book odds must be a number, got ${typeof bookOdds}`;
  }
  if (Number.isNaN(bookOdds)) {
    return 'Book odds is NaN (Not a Number) - invalid input';
  }
  if (!Number.isFinite(bookOdds)) {
    return `Book odds must be a finite number, got ${bookOdds}`;
  }
  if (bookOdds === 0) {
    return 'Book odds cannot be zero';
  }
  if (Math.abs(bookOdds) < 100 && bookOdds !== 100 && bookOdds !== -100) {
    return `American odds must be >= 100 or <= -100, got ${bookOdds}`;
  }

  // Validate probability
  if (typeof fairProb !== 'number') {
    return `Fair probability must be a number, got ${typeof fairProb}`;
  }
  if (Number.isNaN(fairProb)) {
    return 'Fair probability is NaN (Not a Number) - invalid input';
  }
  if (!Number.isFinite(fairProb)) {
    return `Fair probability must be a finite number, got ${fairProb}`;
  }
  if (fairProb <= 0) {
    return `Fair probability must be greater than 0, got ${fairProb}`;
  }
  if (fairProb >= 1) {
    return `Fair probability must be less than 1, got ${fairProb}`;
  }

  return null;
}

export function safeCalculateEV(bookOdds: number, fairProb: number, stake: number = 100) {
  const error = validateEVInputs(bookOdds, fairProb);
  if (error) {
    return { error, evPercent: null as number | null, evDollars: null as number | null };
  }
  try {
    const res = calculateEV(bookOdds, fairProb, stake);
    return { ...res, error: null as string | null };
  } catch (e: any) {
    return { error: String(e?.message ?? e), evPercent: null as number | null, evDollars: null as number | null };
  }
}

