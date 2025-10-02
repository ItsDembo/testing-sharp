# XML Adapter System for Consensus Calculations

This system replaces the ad-hoc parsing with a deterministic XML adapter that outputs clean Quote[] objects for moneyline and threeway markets, with canonical roles and hard validation.

## Overview

The XML adapter system consists of three main components:

1. **`types.ts`** - Type definitions for Quote, OutcomeQuote, and Canonical
2. **`xmlAdapter.ts`** - Converts XML responses to clean Quote objects
3. **`consensusController.ts`** - Orchestrates consensus calculation from XML

## Key Features

- **Canonical Role Mapping**: Maps book-specific outcome names to standard 'home', 'away', 'draw'
- **Hard Validation**: Rejects invalid odds, extreme values, and malformed data
- **Deterministic Output**: Consistent Quote structure regardless of input XML format
- **Robust Consensus**: Uses the existing `calculateConsensusStrict` function for bullet-proof consensus

## Usage

### 1. Convert XML to Quotes

```typescript
import { xmlToQuotes } from './xmlAdapter';

const quotes = xmlToQuotes(xmlString, 'SportsbookName');
```

### 2. Generate Consensus from Multiple XML Sources

```typescript
import { consensusFromXml } from './consensusController';

const consensus = consensusFromXml([
  { sportsbook: 'BookA', xml: xmlA },
  { sportsbook: 'BookB', xml: xmlB }
]);
```

### 3. Expected XML Structure

The adapter expects XML in this format:

```xml
<Feed>
  <Events>
    <Event id="E1" startTime="2025-08-24T20:00:00Z">
      <Home id="H1" name="Home Team"/>
      <Away id="A1" name="Away Team"/>
      <Markets>
        <Market type="Moneyline" lastUpdate="2025-08-24T19:50:00Z">
          <Outcomes>
            <Outcome name="Home Team" participantId="H1">
              <american>-110</american>
            </Outcome>
            <Outcome name="Away Team" participantId="A1">
              <american>-110</american>
            </Outcome>
          </Outcomes>
        </Market>
      </Markets>
    </Event>
  </Events>
</Feed>
```

## How It Fixes Consensus Issues

1. **No More +59,900 Odds**: Hard validation rejects extreme values
2. **No More 50% EV**: Uses actual consensus probabilities, not hardcoded 0.5
3. **Proper Role Mapping**: Canonical outcomes prevent mixing home/away sides
4. **Shape Validation**: Enforces exact 2 outcomes for ML, 3 for three-way
5. **Freshness Filtering**: Ignores stale quotes (>5 minutes old)

## Testing

Run the simple test to verify the adapter works:

```typescript
import { runSimpleTest } from './test-simple';

const result = runSimpleTest();
console.log(result);
```

## Integration with Existing System

The XML adapter outputs Quote objects that are compatible with the existing `calculateConsensusStrict` function. This means:

- No changes needed to the consensus calculation logic
- Existing EV calculations will work correctly
- Frontend can continue using the same data structure

## Next Steps

1. **Adapt XML Paths**: Update the XPath-like paths in `xmlAdapter.ts` to match your actual XML structure
2. **Test with Real Data**: Verify the adapter works with your actual API responses
3. **Replace Existing Parsing**: Gradually migrate from the current JSON parsing to XML parsing
4. **Monitor Consensus Quality**: Verify that consensus lines are now realistic (-1000 to +1000 range)

## Benefits

- **Deterministic**: Same XML input always produces same Quote output
- **Validated**: Invalid data is rejected at the boundary
- **Maintainable**: Clear separation of concerns between parsing and consensus
- **Extensible**: Easy to add support for new market types or sportsbooks
