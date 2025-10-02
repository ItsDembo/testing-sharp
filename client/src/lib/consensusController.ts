import { xmlToQuotes } from "./xmlAdapter";
import { calculateConsensusStrict } from "./consensusCalculations";
import { Quote } from "./types";

type ConsensusDTO = {
  eventId: string;
  marketType: "moneyline" | "threeway";
  consensus?: {
    probByOutcome: Partial<Record<"home"|"away"|"draw", number>>;
    americanByOutcome: Partial<Record<"home"|"away"|"draw", number>>;
    samples: { home?: number; away?: number; draw?: number };
  };
  reason?: string;
};

export function consensusFromXml(xmlPayloads: { sportsbook: string; xml: string }[]): ConsensusDTO[] {
  const allQuotes: Quote[] = [];
  for (const p of xmlPayloads) {
    try {
      allQuotes.push(...xmlToQuotes(p.xml, p.sportsbook));
    } catch (e) {
      console.error("XML parse failed for", p.sportsbook, e);
    }
  }

  const rows = calculateConsensusStrict(allQuotes); // returns per (eventId, marketType)
  return rows.map(r => {
    if (!r.outcomes?.length) {
      return { eventId: r.eventId, marketType: r.marketType, reason: r.reason || "no_consensus" };
    }
    const probByOutcome: any = {};
    const americanByOutcome: any = {};
    for (const o of r.outcomes) {
      probByOutcome[o.canonical] = o.prob;
      americanByOutcome[o.canonical] = o.american;
    }
    return {
      eventId: r.eventId,
      marketType: r.marketType,
      consensus: {
        probByOutcome,
        americanByOutcome,
        samples: r.samples || {},
      },
    };
  });
}

// Sanity: hide implausible probabilities at API boundary
export function isDisplayableProb(p?: number) {
  return typeof p === "number" && isFinite(p) && p > 0.01 && p < 0.99;
}
