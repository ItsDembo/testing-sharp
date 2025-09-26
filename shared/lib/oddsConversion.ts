/********************************************
 * CANONICAL ODDS CONVERSION FUNCTIONS - USE EVERYWHERE
 * Replaces all duplicate conversion functions across the codebase
 ********************************************/

/**
 * Convert American odds to decimal odds
 * @param american - American odds (e.g., -150, +130)
 * @returns Decimal odds (e.g., 1.67, 2.30)
 */
export function americanToDecimal(american: number): number {
  if (!Number.isFinite(american) || american === 0) {
    throw new Error('Invalid American odds: must be finite and non-zero');
  }
  if (Math.abs(american) < 100) {
    throw new Error('American odds must be <= -100 or >= +100');
  }

  return american > 0
    ? 1 + (american / 100)
    : 1 + (100 / Math.abs(american));
}

/**
 * Convert decimal odds to American odds
 * @param decimal - Decimal odds (e.g., 1.67, 2.30)
 * @returns American odds (e.g., -150, +130)
 */
export function decimalToAmerican(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 1) {
    throw new Error('Invalid decimal odds: must be finite and > 1');
  }

  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100);
  } else {
    return Math.round(-100 / (decimal - 1));
  }
}

/**
 * Convert American odds to implied probability
 * @param american - American odds (e.g., -150, +130)
 * @returns Implied probability as decimal (0-1)
 */
export function americanToImpliedProb(american: number): number {
  const decimal = americanToDecimal(american);
  return 1 / decimal;
}

/**
 * Convert probability to American odds
 * @param probability - Probability as decimal (0-1)
 * @returns American odds
 */
export function probabilityToAmerican(probability: number): number {
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) {
    throw new Error('Probability must be between 0 and 1');
  }

  const decimal = 1 / probability;
  return decimalToAmerican(decimal);
}

/**
 * Convert probability to decimal odds
 * @param probability - Probability as decimal (0-1)
 * @returns Decimal odds
 */
export function probabilityToDecimal(probability: number): number {
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) {
    throw new Error('Probability must be between 0 and 1');
  }

  return 1 / probability;
}

/**
 * Convert decimal odds to implied probability
 * @param decimal - Decimal odds (e.g., 1.67, 2.30)
 * @returns Implied probability as decimal (0-1)
 */
export function decimalToImpliedProb(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 1) {
    throw new Error('Invalid decimal odds: must be finite and > 1');
  }
  return 1 / decimal;
}