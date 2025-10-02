import { UiRow, NormalizedProp } from './types';
import { impliedFromAmerican, americanToDecimal, devigBinary, clamp01, median } from './math';
import { calculateEV } from '../lib/evCalculations.ts';

export function calcUiRow(n: NormalizedProp): UiRow {
  const myBookLc = n.myBook?.toLowerCase?.() ?? '';
  const isA = n.rowSide === 'A';
  const mySide = isA ? n.sideA : n.sideB;
  const oppSide = isA ? n.sideB : n.sideA;

  // Build book→quotes map to ensure we only use books that offer BOTH sides
  const mapA = new Map(n.sideA.quotes.map(q => [q.sportsbook.toLowerCase(), q]));
  const mapB = new Map(n.sideB.quotes.map(q => [q.sportsbook.toLowerCase(), q]));
  const books = new Set([...mapA.keys(), ...mapB.keys()]);

  const fairPs: number[] = [];
  const fieldChips: { sportsbook: string; american: number }[] = [];
  let newestTs = 0;

  for (const b of books) {
    const qA = mapA.get(b), qB = mapB.get(b);
    if (!qA || !qB) continue;
    // convert → raw implied
    const pA = impliedFromAmerican(qA.price);
    const pB = impliedFromAmerican(qB.price);
    const { p1, p2 } = devigBinary(pA, pB);
    const pRow = isA ? p1 : p2;
    if (!isFinite(pRow)) continue;

    const tsA = qA.lastUpdate ? Date.parse(qA.lastUpdate) : 0;
    const tsB = qB.lastUpdate ? Date.parse(qB.lastUpdate) : 0;
    newestTs = Math.max(newestTs, tsA, tsB);

    // exclude My Odds from consensus:
    if (b !== myBookLc) {
      fairPs.push(clamp01(pRow));
      const qRow = isA ? qA : qB;
      fieldChips.push({ sportsbook: qRow.sportsbook, american: qRow.price });
    }
  }

  const winProbability = fairPs.length ? clamp01(median(fairPs)) : null;

  // My Odds
  const myQuote = mySide.quotes.find(q => q.sportsbook.toLowerCase() === myBookLc) ?? null;
  const myAmerican = myQuote ? myQuote.price : null;

  // EV per unit - Use canonical EV calculation
  let evPct: number | null = null;
  if (winProbability !== null && myAmerican !== null) {
    // Use canonical EV calculation from shared library
    const result = calculateEV(myAmerican, winProbability, 100);
    // Convert from percentage to decimal for consistency with existing code
    evPct = result.evPercent / 100;
  }

  // sort field odds by best payout for the row side
  fieldChips.sort((a, b) => americanToDecimal(b.american) - americanToDecimal(a.american));

  // freshness
  const ageSeconds = newestTs ? Math.max(0, Math.round((Date.now() - newestTs) / 1000)) : undefined;

  return {
    event: n.eventLabel,
    league: n.league,
    market: n.market,
    prop: n.propLabel,
    myBook: n.myBook,
    myOddsAmerican: myAmerican,
    winProbability,
    evPct,
    fieldOdds: fieldChips,
    status: n.status,
    ageSeconds
  };
}
