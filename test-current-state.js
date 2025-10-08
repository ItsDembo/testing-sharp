// Test current state after revert

async function testCurrentState() {
  console.log('🎯 TESTING CURRENT STATE AFTER REVERT\n');

  try {
    const response = await fetch('http://localhost:3001/api/trading-terminal/data');
    const data = await response.json();
    
    const allEvents = data.events || [];
    
    console.log('📊 BASIC STATS:');
    console.log(`✅ Total Events: ${allEvents.length}`);
    
    // Categorize events
    const mainMarkets = allEvents.filter(e => e.market !== 'Player Prop');
    const playerProps = allEvents.filter(e => e.market === 'Player Prop');
    
    console.log(`✅ Main Markets: ${mainMarkets.length}`);
    console.log(`✅ Player Props: ${playerProps.length}`);
    
    // EV Analysis
    const evValues = allEvents.map(e => e.evPercentage).filter(ev => ev !== undefined && ev !== null);
    const positiveEV = evValues.filter(ev => ev > 0);
    const negativeEV = evValues.filter(ev => ev < 0);
    const zeroEV = evValues.filter(ev => ev === 0);
    
    console.log('\n📊 EV ANALYSIS:');
    console.log(`✅ Total EV Values: ${evValues.length}`);
    console.log(`✅ Positive EV: ${positiveEV.length}`);
    console.log(`✅ Negative EV: ${negativeEV.length}`);
    console.log(`✅ Zero EV: ${zeroEV.length}`);
    
    if (evValues.length > 0) {
      const minEV = Math.min(...evValues);
      const maxEV = Math.max(...evValues);
      console.log(`✅ EV Range: ${minEV.toFixed(1)}% to ${maxEV.toFixed(1)}%`);
    }
    
    // Sportsbook Analysis
    console.log('\n📊 SPORTSBOOK ANALYSIS:');
    const sportsbookCounts = {};
    allEvents.forEach(event => {
      const count = event.fieldOdds?.length || 0;
      sportsbookCounts[count] = (sportsbookCounts[count] || 0) + 1;
    });
    
    for (const [count, events] of Object.entries(sportsbookCounts).sort((a, b) => parseInt(b[0]) - parseInt(a[0]))) {
      console.log(`   ${count} sportsbook(s): ${events} events`);
    }
    
    const multiSportsbookEvents = allEvents.filter(e => (e.fieldOdds?.length || 0) > 1);
    console.log(`✅ Multi-Sportsbook Events: ${multiSportsbookEvents.length}`);
    
    // Team Name Analysis for Player Props
    if (playerProps.length > 0) {
      console.log('\n📊 PLAYER PROPS ANALYSIS:');
      const unknownTeams = playerProps.filter(p => p.prop && p.prop.includes('Unknown Team'));
      const realTeams = playerProps.filter(p => p.prop && !p.prop.includes('Unknown Team'));
      
      console.log(`✅ Props with Real Teams: ${realTeams.length}`);
      console.log(`❌ Props with Unknown Teams: ${unknownTeams.length}`);
      
      if (realTeams.length > 0) {
        console.log(`✅ Sample Real Team Props:`);
        realTeams.slice(0, 3).forEach((prop, i) => {
          console.log(`   ${i + 1}. ${prop.prop}`);
          console.log(`      EV: ${prop.evPercentage}%, Books: ${prop.fieldOdds?.length || 0}`);
        });
      }
      
      if (unknownTeams.length > 0) {
        console.log(`❌ Sample Unknown Team Props:`);
        unknownTeams.slice(0, 3).forEach((prop, i) => {
          console.log(`   ${i + 1}. ${prop.prop}`);
        });
      }
    }
    
    // Sample Main Markets
    if (mainMarkets.length > 0) {
      console.log('\n📊 MAIN MARKETS SAMPLE:');
      const avgSportsbooks = mainMarkets.reduce((sum, m) => sum + (m.fieldOdds?.length || 0), 0) / mainMarkets.length;
      console.log(`✅ Average Sportsbooks per Main Market: ${avgSportsbooks.toFixed(1)}`);
      
      const sample = mainMarkets[0];
      console.log(`✅ Sample Main Market: ${sample.event} - ${sample.market}`);
      console.log(`   EV: ${sample.evPercentage}%, Books: ${sample.fieldOdds?.length || 0}`);
      if (sample.fieldOdds && sample.fieldOdds.length > 0) {
        const sampleBooks = sample.fieldOdds.slice(0, 5).map(f => f.book).join(', ');
        console.log(`   Sample Books: ${sampleBooks}`);
      }
    }
    
    // Overall Assessment
    console.log('\n🏆 OVERALL ASSESSMENT:');
    
    const hasNegativeEV = negativeEV.length > 0;
    const hasMultiSportsbooks = multiSportsbookEvents.length > 0;
    const hasPlayerProps = playerProps.length > 0;
    const hasLowUnknownTeams = playerProps.length > 0 ? (unknownTeams.length / playerProps.length) < 0.05 : true;
    
    console.log(`✅ Negative EV Working: ${hasNegativeEV ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Multi-Sportsbook Events: ${hasMultiSportsbooks ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Player Props Working: ${hasPlayerProps ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Team Names Good: ${hasLowUnknownTeams ? 'PASS' : 'FAIL'}`);
    
    const allTestsPass = hasNegativeEV && hasMultiSportsbooks && hasPlayerProps && hasLowUnknownTeams;
    console.log(`\n🎉 OVERALL STATUS: ${allTestsPass ? 'ALL TESTS PASS' : 'SOME TESTS FAIL'}`);
    
  } catch (error) {
    console.error('❌ Error testing current state:', error);
  }
}

testCurrentState();
