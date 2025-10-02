import { xmlToQuotes } from "./xmlAdapter";
import { consensusFromXml } from "./consensusController";

// Minimal unit test with sample XML
const sample = `
<Feed>
  <Events>
    <Event id="E1" startTime="2025-08-24T20:00:00Z">
      <Home id="H1" name="Home FC"/>
      <Away id="A1" name="Away FC"/>
      <Markets>
        <Market type="Moneyline" lastUpdate="2025-08-24T19:50:00Z">
          <Outcomes>
            <Outcome name="Home FC" participantId="H1"><american>-120</american></Outcome>
            <Outcome name="Away FC" participantId="A1"><american>+110</american></Outcome>
          </Outcomes>
        </Market>
        <Market type="3Way">
          <Outcomes>
            <Outcome name="Home FC" participantId="H1"><american>-105</american></Outcome>
            <Outcome name="Draw"   ><american>+250</american></Outcome>
            <Outcome name="Away FC" participantId="A1"><american>+260</american></Outcome>
          </Outcomes>
        </Market>
      </Markets>
    </Event>
  </Events>
</Feed>`;

export function testXmlAdapter() {
  console.log('🧪 Testing XML adapter...');
  
  const quotes = xmlToQuotes(sample, "BookA");
  console.log("quotes", quotes); // expect 2 quotes, roles set

  // feed two sportsbooks to test consensus
  const out = consensusFromXml([{ sportsbook: "BookA", xml: sample }, { sportsbook: "BookB", xml: sample }]);
  console.log(JSON.stringify(out, null, 2));

  // Expected: ML consensus near home ~54% (≈ -118), away ~46% (≈ +118).
  // Three-way consensus reasonable; no probabilities ≤1% or ≥99%.
  
  return { quotes, consensus: out };
}
