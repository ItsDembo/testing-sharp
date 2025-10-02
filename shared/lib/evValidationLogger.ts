// EV Calculation Validation Logger
// Tracks inputs, intermediate steps, and outputs for debugging

import { americanToDecimal } from './oddsConversion';

export interface EVCalculationLog {
  timestamp: string;
  input: {
    bookOdds: number;
    fairProbability: number;
    stake: number;
  };
  intermediate: {
    decimalOdds: number;
    profitIfWin: number;
    lossIfLose: number;
    winComponent: number;    // fairProb × profitIfWin
    lossComponent: number;   // (1 - fairProb) × stake
    evDollars: number;
  };
  output: {
    evPercent: number;
    evDollars: number;
    profitIfWin: number;
    impliedProbability: number;
    isPositiveEV: boolean;
  };
  validation: {
    inputValid: boolean;
    outputValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export class EVValidationLogger {
  private logs: EVCalculationLog[] = [];
  private maxLogs: number = 1000;
  private enableConsoleLog: boolean = false;

  constructor(maxLogs: number = 1000, enableConsoleLog: boolean = false) {
    this.maxLogs = maxLogs;
    this.enableConsoleLog = enableConsoleLog;
  }

  /**
   * Log an EV calculation with full details
   */
  logCalculation(
    bookOdds: number,
    fairProbability: number,
    stake: number,
    result: any
  ): EVCalculationLog {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate inputs
    if (!Number.isFinite(bookOdds)) {
      errors.push(`Invalid bookOdds: ${bookOdds}`);
    }
    if (!Number.isFinite(fairProbability)) {
      errors.push(`Invalid fairProbability: ${fairProbability}`);
    }
    if (fairProbability <= 0 || fairProbability >= 1) {
      errors.push(`fairProbability out of range: ${fairProbability} (must be 0 < p < 1)`);
    }
    if (!Number.isFinite(stake) || stake <= 0) {
      errors.push(`Invalid stake: ${stake}`);
    }
    if (Math.abs(bookOdds) < 100 && bookOdds !== 100 && bookOdds !== -100) {
      errors.push(`Invalid American odds: ${bookOdds} (must be >= 100 or <= -100)`);
    }

    // Calculate intermediate values
    const decimalOdds = americanToDecimal(bookOdds);
    const profitIfWin = stake * (decimalOdds - 1);
    const lossIfLose = stake;
    const winComponent = fairProbability * profitIfWin;
    const lossComponent = (1 - fairProbability) * stake;
    const evDollars = winComponent - lossComponent;

    // Validate outputs
    if (!Number.isFinite(result.evPercent)) {
      errors.push(`Invalid evPercent output: ${result.evPercent}`);
    }
    if (!Number.isFinite(result.evDollars)) {
      errors.push(`Invalid evDollars output: ${result.evDollars}`);
    }
    if (!Number.isFinite(result.profitIfWin)) {
      errors.push(`Invalid profitIfWin output: ${result.profitIfWin}`);
    }
    if (result.profitIfWin < 0) {
      errors.push(`Negative profitIfWin: ${result.profitIfWin}`);
    }
    if (result.impliedProbability <= 0 || result.impliedProbability >= 1) {
      warnings.push(`impliedProbability out of normal range: ${result.impliedProbability}`);
    }
    if (result.isPositiveEV !== (result.evPercent > 0)) {
      errors.push(`isPositiveEV mismatch: ${result.isPositiveEV} vs evPercent: ${result.evPercent}`);
    }

    // Check for extreme values
    if (Math.abs(result.evPercent) > 100) {
      warnings.push(`Extreme EV%: ${result.evPercent}%`);
    }
    if (Math.abs(bookOdds) > 10000) {
      warnings.push(`Extreme odds: ${bookOdds}`);
    }

    const log: EVCalculationLog = {
      timestamp: new Date().toISOString(),
      input: {
        bookOdds,
        fairProbability,
        stake,
      },
      intermediate: {
        decimalOdds,
        profitIfWin,
        lossIfLose,
        winComponent,
        lossComponent,
        evDollars,
      },
      output: {
        evPercent: result.evPercent,
        evDollars: result.evDollars,
        profitIfWin: result.profitIfWin,
        impliedProbability: result.impliedProbability,
        isPositiveEV: result.isPositiveEV,
      },
      validation: {
        inputValid: errors.length === 0,
        outputValid: errors.filter(e => e.includes('output')).length === 0,
        errors,
        warnings,
      },
    };

    // Store log
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Console log if enabled
    if (this.enableConsoleLog) {
      this.printLog(log);
    }

    return log;
  }

  /**
   * Print a log entry to console
   */
  private printLog(log: EVCalculationLog): void {
    console.log('\n=== EV Calculation Log ===');
    console.log(`Timestamp: ${log.timestamp}`);
    console.log('\nINPUT:');
    console.log(`  Book Odds: ${log.input.bookOdds}`);
    console.log(`  Fair Probability: ${(log.input.fairProbability * 100).toFixed(2)}%`);
    console.log(`  Stake: $${log.input.stake}`);
    
    console.log('\nINTERMEDIATE:');
    console.log(`  Decimal Odds: ${log.intermediate.decimalOdds.toFixed(3)}`);
    console.log(`  Profit If Win: $${log.intermediate.profitIfWin.toFixed(2)}`);
    console.log(`  Loss If Lose: $${log.intermediate.lossIfLose.toFixed(2)}`);
    console.log(`  Win Component: ${(log.input.fairProbability * 100).toFixed(2)}% × $${log.intermediate.profitIfWin.toFixed(2)} = $${log.intermediate.winComponent.toFixed(2)}`);
    console.log(`  Loss Component: ${((1 - log.input.fairProbability) * 100).toFixed(2)}% × $${log.intermediate.lossIfLose.toFixed(2)} = $${log.intermediate.lossComponent.toFixed(2)}`);
    console.log(`  EV Dollars: $${log.intermediate.winComponent.toFixed(2)} - $${log.intermediate.lossComponent.toFixed(2)} = $${log.intermediate.evDollars.toFixed(2)}`);
    
    console.log('\nOUTPUT:');
    console.log(`  EV%: ${log.output.evPercent.toFixed(2)}%`);
    console.log(`  EV$: $${log.output.evDollars.toFixed(2)}`);
    console.log(`  Profit If Win: $${log.output.profitIfWin.toFixed(2)}`);
    console.log(`  Implied Probability: ${(log.output.impliedProbability * 100).toFixed(2)}%`);
    console.log(`  Is Positive EV: ${log.output.isPositiveEV}`);
    
    console.log('\nVALIDATION:');
    console.log(`  Input Valid: ${log.validation.inputValid}`);
    console.log(`  Output Valid: ${log.validation.outputValid}`);
    
    if (log.validation.errors.length > 0) {
      console.log('\n  ERRORS:');
      log.validation.errors.forEach(err => console.log(`    ❌ ${err}`));
    }
    
    if (log.validation.warnings.length > 0) {
      console.log('\n  WARNINGS:');
      log.validation.warnings.forEach(warn => console.log(`    ⚠️  ${warn}`));
    }
    
    console.log('========================\n');
  }

  /**
   * Get all logs
   */
  getLogs(): EVCalculationLog[] {
    return [...this.logs];
  }

  /**
   * Get logs with errors
   */
  getErrorLogs(): EVCalculationLog[] {
    return this.logs.filter(log => log.validation.errors.length > 0);
  }

  /**
   * Get logs with warnings
   */
  getWarningLogs(): EVCalculationLog[] {
    return this.logs.filter(log => log.validation.warnings.length > 0);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalCalculations: number;
    validCalculations: number;
    invalidCalculations: number;
    calculationsWithWarnings: number;
    averageEV: number;
    positiveEVCount: number;
    negativeEVCount: number;
  } {
    const validLogs = this.logs.filter(log => log.validation.inputValid && log.validation.outputValid);
    const invalidLogs = this.logs.filter(log => !log.validation.inputValid || !log.validation.outputValid);
    const warningLogs = this.getWarningLogs();
    const positiveEVLogs = validLogs.filter(log => log.output.isPositiveEV);
    const negativeEVLogs = validLogs.filter(log => !log.output.isPositiveEV);
    
    const averageEV = validLogs.length > 0
      ? validLogs.reduce((sum, log) => sum + log.output.evPercent, 0) / validLogs.length
      : 0;

    return {
      totalCalculations: this.logs.length,
      validCalculations: validLogs.length,
      invalidCalculations: invalidLogs.length,
      calculationsWithWarnings: warningLogs.length,
      averageEV,
      positiveEVCount: positiveEVLogs.length,
      negativeEVCount: negativeEVLogs.length,
    };
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Export summary as text
   */
  exportSummaryText(): string {
    const summary = this.getSummary();
    const errorLogs = this.getErrorLogs();
    const warningLogs = this.getWarningLogs();

    let text = '=== EV Calculation Summary ===\n\n';
    text += `Total Calculations: ${summary.totalCalculations}\n`;
    text += `Valid Calculations: ${summary.validCalculations}\n`;
    text += `Invalid Calculations: ${summary.invalidCalculations}\n`;
    text += `Calculations with Warnings: ${summary.calculationsWithWarnings}\n`;
    text += `Average EV%: ${summary.averageEV.toFixed(2)}%\n`;
    text += `Positive EV Count: ${summary.positiveEVCount}\n`;
    text += `Negative EV Count: ${summary.negativeEVCount}\n\n`;

    if (errorLogs.length > 0) {
      text += '=== Error Logs ===\n\n';
      errorLogs.forEach((log, i) => {
        text += `Error ${i + 1} (${log.timestamp}):\n`;
        text += `  Input: ${log.input.bookOdds} odds, ${(log.input.fairProbability * 100).toFixed(2)}% prob\n`;
        log.validation.errors.forEach(err => text += `  ❌ ${err}\n`);
        text += '\n';
      });
    }

    if (warningLogs.length > 0) {
      text += '=== Warning Logs ===\n\n';
      warningLogs.forEach((log, i) => {
        text += `Warning ${i + 1} (${log.timestamp}):\n`;
        text += `  Input: ${log.input.bookOdds} odds, ${(log.input.fairProbability * 100).toFixed(2)}% prob\n`;
        log.validation.warnings.forEach(warn => text += `  ⚠️  ${warn}\n`);
        text += '\n';
      });
    }

    return text;
  }
}

// Global logger instance (optional)
export const globalEVLogger = new EVValidationLogger(1000, false);

