import { XMLParser } from "fast-xml-parser";
import { Quote, OutcomeQuote, OddsFormat, Canonical } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
});

// ---- Helpers ----
const AMERICAN_HARD_MIN = -5000;
const AMERICAN_HARD_MAX = +5000;

function parseAmerican(raw: string | number): number | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // accept "+120", "-110", "120" (treat bare positive as +120)
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const val = n > 0 && !s.startsWith("+") && !s.startsWith("-") ? +n : n;
  if (val === 0) return null;
  if (val < AMERICAN_HARD_MIN || val > AMERICAN_HARD_MAX) return null;
  return Math.trunc(val);
}

function parseDecimal(raw: string | number): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 1.01 || n > 101) return null; // guard nonsense
  return n;
}

function americanOrDecimal(rawOdds: any, fmtHint?: OddsFormat): { price: number; oddsFormat: OddsFormat } | null {
  // Try american first, then decimal
  if (fmtHint !== "decimal") {
    const am = parseAmerican(rawOdds);
    if (am !== null) return { price: am, oddsFormat: "american" };
  }
  const dec = parseDecimal(rawOdds);
  if (dec !== null) return { price: dec, oddsFormat: "decimal" };
  return null;
}

function toISO(ts?: string | number): string | undefined {
  if (!ts) return undefined;
  const d = new Date(ts);
  return isNaN(+d) ? undefined : d.toISOString();
}

// Map outcome to canonical using IDs first, then position, then label
function mapRole({
  outcomeName,
  participantId,
  homeId,
  awayId,
  idx,
  marketType,
}: {
  outcomeName?: string;
  participantId?: string;
  homeId?: string;
  awayId?: string;
  idx: number; // position in market
  marketType: "moneyline" | "threeway";
}): Canonical | null {
  if (participantId && homeId && participantId === homeId) return "home";
  if (participantId && awayId && participantId === awayId) return "away";
  const s = (outcomeName || "").toLowerCase();
  if (s.includes("draw") || s === "x") return "draw";

  // fallback by position for 3-way + common vendor ordering:
  if (marketType === "threeway") {
    if (idx === 0) return "home";
    if (idx === 1) return "draw";
    if (idx === 2) return "away";
  }
  // fallback by position for 2-way moneyline:
  if (marketType === "moneyline") {
    return idx === 0 ? "home" : "away";
  }
  return null;
}

// Adapter entry (adjust XPath-ish paths to your XML):
export function xmlToQuotes(xml: string, sportsbookName: string): Quote[] {
  const doc = parser.parse(xml);

  // ---- Shape assumptions (edit to match your feed) ----
  // doc.Feed.Events.Event[]
  // Event: { id, startTime, Home: { id, name }, Away: { id, name }, Markets: { Market[] } }
  // Market: { type: 'Moneyline'|'3Way', lastUpdate, Outcomes: { Outcome[] } }
  // Outcome: { name, participantId, price, oddsFormat? }

  const events: any[] = doc?.Feed?.Events?.Event ?? [];
  const quotes: Quote[] = [];

  for (const ev of events) {
    const eventId = String(ev.id ?? ev.eventId ?? "");
    if (!eventId) continue;

    const homeId = ev?.Home?.id ? String(ev.Home.id) : undefined;
    const awayId = ev?.Away?.id ? String(ev.Away.id) : undefined;

    const markets: any[] = ev?.Markets?.Market ?? [];
    for (const mkt of markets) {
      const rawType = String(mkt?.type || mkt?.name || "").toLowerCase();
      const marketType =
        rawType.includes("3") || rawType.includes("three") || rawType.includes("1x2")
          ? "threeway"
          : rawType.includes("moneyline") || rawType.includes("ml")
          ? "moneyline"
          : null;

      if (!marketType) continue;

      const lastUpdate = toISO(mkt?.lastUpdate || ev?.startTime);
      const rawOutcomes: any[] = mkt?.Outcomes?.Outcome ?? [];
      // enforce shape: exact 2 for ML, exact 3 for 3-way
      const needed = marketType === "moneyline" ? 2 : 3;
      if (!Array.isArray(rawOutcomes) || rawOutcomes.length !== needed) continue;

      const outcomes: OutcomeQuote[] = [];
      for (let i = 0; i < rawOutcomes.length; i++) {
        const o = rawOutcomes[i];
        const name = String(o?.name ?? o?.label ?? "");
        const participantId = o?.participantId ? String(o.participantId) : undefined;

        // odds: accept American or Decimal; prefer feed's attribute if present
        const fmtHint: OddsFormat | undefined = o?.oddsFormat === "decimal" ? "decimal" : undefined;
        const oddsNode = o?.american ?? o?.price ?? o?.odds ?? o?.decimal;
        const parsed = americanOrDecimal(oddsNode, fmtHint);
        if (!parsed) { continue; } // skip invalid odds

        const role = mapRole({
          outcomeName: name,
          participantId,
          homeId,
          awayId,
          idx: i,
          marketType,
        });
        if (!role) { continue; }

        outcomes.push({
          name,
          price: parsed.price,
          oddsFormat: parsed.oddsFormat,
          role,
          participantId,
          selectionId: participantId, // Use participantId as selectionId
        });
      }

      // final shape guard
      if ((marketType === "moneyline" && outcomes.length !== 2) ||
          (marketType === "threeway"  && outcomes.length !== 3)) {
        continue;
      }

      quotes.push({
        sportsbook: sportsbookName,
        eventId,
        marketType,
        participants: { homeId, awayId },
        outcomes,
        lastUpdate,
      });
    }
  }

  return quotes;
}
