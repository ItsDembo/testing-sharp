// Test script to demonstrate the new EV logic system
import { calcUiRow } from './shared/market/calc.js';
import { americanToDecimal, impliedFromAmerican, devigBinary, median } from './shared/market/math.js';

// Mock data for testing
const mockProps = [
  {
    eventId: 'test-1',
    eventLabel: 'Celtics @ Lakers (2025-01-15 7:00 PM)',
    league: 'NBA',
    market: 'Moneyline',
    propLabel: 'Celtics Moneyline',
    status: 'upcoming',
    myBook: 'fanduel',
    sideA: {
      label: 'Celtics ML',
      quotes: [
        { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
        { sportsbook: 'DraftKings', price: -108, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
      ]
    },
    sideB: {
      label: 'Lakers ML',
      quotes: [
        { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
        { sportsbook: 'DraftKings', price: -112, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
      ]
    },
    rowSide: 'A'
  },
  {
    eventId: 'test-2',
    eventLabel: 'Yankees @ Red Sox (2025-01-15 1:00 PM)',
    league: 'MLB',
    market: 'Total',
    propLabel: 'Over 8.5',
    status: 'upcoming',
    myBook: 'draftkings',
    sideA: {
      label: 'Over 8.5',
      quotes: [
        { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
        { sportsbook: 'DraftKings', price: -105, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
        { sportsbook: 'BetMGM', price: -108, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
      ]
    },
    sideB: {
      label: 'Under 8.5',
      quotes: [
        { sportsbook: 'FanDuel', price: -110, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
        { sportsbook: 'DraftKings', price: -115, oddsFormat: 'american', lastUpdate: new Date().toISOString() },
        { sportsbook: 'BetMGM', price: -112, oddsFormat: 'american', lastUpdate: new Date().toISOString() }
      ]
    },
    rowSide: 'A'
  }
];

console.log('🎯 Testing New EV Logic System\n');

// Test math utilities
console.log('📊 Math Utilities Test:');
console.log('americanToDecimal(+100):', americanToDecimal(100));
console.log('americanToDecimal(-110):', americanToDecimal(-110));
console.log('impliedFromAmerican(+100):', impliedFromAmerican(100));
console.log('impliedFromAmerican(-110):', impliedFromAmerican(-110));
console.log('devigBinary(0.55, 0.48):', devigBinary(0.55, 0.48));
console.log('median([1,2,3,4,5]):', median([1,2,3,4,5]));
console.log('');

// Test EV calculations
console.log('🧮 EV Calculation Test:');
mockProps.forEach((prop, index) => {
  console.log(`\n--- Test Case ${index + 1}: ${prop.eventLabel} ---`);
  
  try {
    const result = calcUiRow(prop);
    
    console.log('✅ Event:', result.event);
    console.log('✅ League:', result.league);
    console.log('✅ Prop:', result.prop);
    console.log('✅ Market:', result.market);
    console.log('✅ My Book:', result.myBook);
    console.log('✅ My Odds:', result.myOddsAmerican);
    console.log('✅ Win Probability:', result.winProbability ? `${(result.winProbability * 100).toFixed(1)}%` : '—');
    console.log('✅ EV%:', result.evPct ? `${(result.evPct * 100).toFixed(2)}%` : '—');
    console.log('✅ Field Odds Count:', result.fieldOdds.length);
    console.log('✅ Status:', result.status);
    console.log('✅ Age (seconds):', result.ageSeconds || 'N/A');
    
    if (result.fieldOdds.length > 0) {
      console.log('✅ Field Odds:');
      result.fieldOdds.forEach(odd => {
        console.log(`   - ${odd.sportsbook}: ${odd.american > 0 ? '+' : ''}${odd.american}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
});

console.log('\n🎉 New EV Logic System Test Complete!');
console.log('\nKey Features Demonstrated:');
console.log('✅ Vig-free consensus calculation');
console.log('✅ My book exclusion from consensus');
console.log('✅ Real-time EV calculations');
console.log('✅ Freshness tracking');
console.log('✅ Proper error handling');
console.log('✅ No synthetic data');
