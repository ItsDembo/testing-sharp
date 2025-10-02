// Test selection ID system
import { xmlToQuotes } from "./xmlAdapter";
import { calculateConsensusStrict } from "./consensusCalculations";

// Test XML with participant IDs
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

export function testSelectionIds() {
  try {
    console.log('🧪 Testing selection ID system...');
    
    // Test 1: XML to Quotes with selection IDs
    const quotes = xmlToQuotes(testXml, "TestBook");
    console.log('✅ XML adapter with selection IDs:', quotes);
    
    // Verify selection IDs are set
    if (quotes.length > 0) {
      const firstQuote = quotes[0];
      console.log('🔍 Quote structure:', {
        participants: firstQuote.participants,
        outcomes: firstQuote.outcomes.map(o => ({
          name: o.name,
          selectionId: o.selectionId,
          role: o.role,
          price: o.price
        }))
      });
      
      // Verify selection IDs match participant IDs
      const homeOutcome = firstQuote.outcomes.find(o => o.role === 'home');
      const awayOutcome = firstQuote.outcomes.find(o => o.role === 'away');
      
      if (homeOutcome?.selectionId === 'H1' && awayOutcome?.selectionId === 'A1') {
        console.log('✅ Selection IDs correctly mapped to participant IDs');
      } else {
        console.error('❌ Selection ID mapping failed');
        return { success: false, error: 'Selection ID mapping failed' };
      }
    }
    
    // Test 2: Consensus calculation with selection IDs
    const consensus = calculateConsensusStrict(quotes);
    console.log('✅ Consensus calculation with selection IDs:', consensus);
    
    return { success: true, quotes, consensus };
  } catch (error) {
    console.error('❌ Selection ID test failed:', error);
    return { success: false, error: error.message };
  }
}
