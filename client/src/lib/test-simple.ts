// Simple test to verify XML adapter works
import { xmlToQuotes } from "./xmlAdapter";

// Test XML that matches the expected structure
const testXml = `
<Feed>
  <Events>
    <Event id="TEST1" startTime="2025-08-24T20:00:00Z">
      <Home id="H1" name="Home Team"/>
      <Away id="A1" name="Away Team"/>
      <Markets>
        <Market type="Moneyline" lastUpdate="2025-08-24T19:50:00Z">
          <Outcomes>
            <Outcome name="Home Team" participantId="H1"><american>-110</american></Outcome>
            <Outcome name="Away Team" participantId="A1"><american>-110</american></Outcome>
          </Outcomes>
        </Market>
      </Markets>
    </Event>
  </Events>
</Feed>`;

export function runSimpleTest() {
  try {
    console.log('🧪 Running simple XML adapter test...');
    
    const quotes = xmlToQuotes(testXml, "TestBook");
    console.log('✅ XML adapter test successful!');
    console.log('📊 Generated quotes:', quotes);
    
    // Verify the structure
    if (quotes.length > 0) {
      const firstQuote = quotes[0];
      console.log('🔍 First quote structure:', {
        sportsbook: firstQuote.sportsbook,
        eventId: firstQuote.eventId,
        marketType: firstQuote.marketType,
        outcomesCount: firstQuote.outcomes.length,
        outcomes: firstQuote.outcomes.map(o => ({
          name: o.name,
          role: o.role,
          price: o.price,
          oddsFormat: o.oddsFormat
        }))
      });
    }
    
    return { success: true, quotes };
  } catch (error) {
    console.error('❌ XML adapter test failed:', error);
    return { success: false, error: error.message };
  }
}
