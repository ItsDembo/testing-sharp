export type OddsFormat = 'american' | 'decimal';

export type BookQuote = {
  sportsbook: string;
  odds: number;            // raw price as provided (american or decimal depending on oddsFormat)
  oddsFormat: OddsFormat;  // 'american' | 'decimal'
  lastUpdate?: string;     // ISO, for freshness checks if needed
};

export type BinaryPair = {
  // both sides of the SAME market+prop (e.g., Over 147.5 vs Under 147.5)
  sideA: { label: string; quotes: BookQuote[] };
  sideB: { label: string; quotes: BookQuote[] };
};

export type BossCalcInput = {
  eventId: string;
  league: string;
  eventLabel: string;     // "Celtics @ Lakers (2025-10-12 7:00p)"
  market: string;         // e.g., "Total Points"
  propLabel: string;      // e.g., "Under 147.5"
  myBook: string;         // sportsbook chosen by user
  myOdds: BookQuote | null;   // the chosen book's quote for THIS prop side (not the other side)
  pair: BinaryPair;           // both sides (for de-vig)
  nowIso?: string;
};

export type BossCalcOutput = {
  eventLabel: string;
  league: string;
  propLabel: string;
  market: string;
  myOdds: number | null;          // american for display
  winProbability: number | null;  // 0..1 (field consensus fair)
  evPct: number | null;           // per-unit stake EV
  fieldOdds: { sportsbook: string; american: number }[]; // other books (same prop side)
  debug?: Record<string, unknown>;
};

const P_MIN = 1e-6;
const P_MAX = 1 - 1e-6;

function clamp01(p: number) {
  return Math.min(P_MAX, Math.max(P_MIN, p));
}

function americanToDecimal(a: number): number {
  return a >= 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
}

function decimalToImplied(d: number): number {
  return 1 / d;
}

function impliedFromAmerican(a: number): number {
  return a >= 0 ? 100 / (a + 100) : Math.abs(a) / (Math.abs(a) + 100);
}

function toImplied(q: BookQuote): number {
  if (q.oddsFormat === 'decimal') return decimalToImplied(q.odds);
  return impliedFromAmerican(q.odds);
}

function toAmericanFromDecimal(d: number): number {
  return d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1));
}

function removeVigBinary(pRawA: number, pRawB: number) {
  const s = pRawA + pRawB;
  if (!isFinite(s) || s <= 0) return { pA: NaN, pB: NaN };
  const pA = clamp01(pRawA / s);
  const pB = clamp01(pRawB / s);
  return { pA, pB };
}

function median(xs: number[]) {
  const a = xs.slice().sort((x, y) => x - y);
  const n = a.length;
  if (n === 0) return NaN;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

export function calcBossRow(input: BossCalcInput): BossCalcOutput {
  const {
    eventLabel, league, market, propLabel, myBook, myOdds, pair,
  } = input;

  // Build per-book fair probability for THIS prop side (propLabel must match sideA.label OR sideB.label)
  const sideIsA = propLabel === pair.sideA.label;
  const side = sideIsA ? pair.sideA : pair.sideB;
  const opp  = sideIsA ? pair.sideB : pair.sideA;

  // We need the same books on both sides to de-vig; but boss spec says "binary" general renorm is OK.
  // For each book that has both sides: compute fair p for THIS side; exclude myBook for consensus.
  const fairPs: number[] = [];
  const fieldOdds: { sportsbook: string; american: number }[] = [];

  const quotesByBookA = new Map(pair.sideA.quotes.map(q => [q.sportsbook.toLowerCase(), q]));
  const quotesByBookB = new Map(pair.sideB.quotes.map(q => [q.sportsbook.toLowerCase(), q]));

  const books = new Set<string>([
    ...Array.from(quotesByBookA.keys()),
    ...Array.from(quotesByBookB.keys()),
  ]);

  for (const book of books) {
    const qA = quotesByBookA.get(book);
    const qB = quotesByBookB.get(book);
    if (!qA || !qB) continue; // need both sides for de-vig

    const pRawA = toImplied(qA);
    const pRawB = toImplied(qB);
    if (!isFinite(pRawA) || !isFinite(pRawB)) continue;

    const { pA, pB } = removeVigBinary(pRawA, pRawB);
    const pThis = sideIsA ? pA : pB;

    // collect field consensus: exclude myBook for THIS prop side
    if (book !== myBook.toLowerCase()) {
      fairPs.push(clamp01(pThis));
      // field odds list shows the price for THIS side at each other book
      const qThis = sideIsA ? qA : qB;
      const dec = qThis.oddsFormat === 'decimal' ? qThis.odds : americanToDecimal(qThis.odds);
      const am  = qThis.oddsFormat === 'american' ? qThis.odds : toAmericanFromDecimal(dec);
      fieldOdds.push({ sportsbook: qThis.sportsbook, american: am });
    }
  }

  const winProbability = fairPs.length ? clamp01(median(fairPs)) : null;

  // My Odds
  const myAmerican = myOdds
    ? (myOdds.oddsFormat === 'american'
        ? myOdds.odds
        : toAmericanFromDecimal(myOdds.odds))
    : null;

  // +EV%
  let evPct: number | null = null;
  if (winProbability !== null && myAmerican !== null) {
    const myDecimal = americanToDecimal(myAmerican);
    const payout = myDecimal - 1; // per unit risk
    const risk = 1;
    evPct = (winProbability * payout) - ((1 - winProbability) * risk);
  }

  // Sort field odds by best price for this side (descending for plus odds, ascending for minus)
  fieldOdds.sort((a, b) => {
    const ap = a.american;
    const bp = b.american;
    // normalize to decimal payout for comparison
    const ad = americanToDecimal(ap);
    const bd = americanToDecimal(bp);
    return bd - ad;
  });

  return {
    eventLabel,
    league,
    propLabel,
    market,
    myOdds: myAmerican,
    winProbability,
    evPct,
    fieldOdds,
  };
}
