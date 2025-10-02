# Sharp Shot Enhanced Trading Terminal

## Overview

The Enhanced Trading Terminal is a comprehensive real-time odds analysis system that provides accurate Expected Value (EV) calculations, implied probabilities, and live market data for sports betting. Built with advanced mathematical models and real-time data integration from the AreYouWatchingThis API.

## 🚀 Key Features

### 1. **Accurate EV Calculations**
- **Precise Mathematical Models**: Advanced Expected Value calculations using proper vig removal
- **Market Efficiency Analysis**: Confidence scoring based on market size and consistency
- **Real-time Updates**: Live EV calculations as odds change
- **Multiple Market Types**: Support for moneyline, spread, total, and player props

### 2. **Implied Probability Analysis**
- **American to Decimal Conversion**: Accurate odds format conversion
- **Vig Removal**: Proper overround elimination for fair probability calculation
- **Confidence Indicators**: Visual indicators for calculation reliability
- **Market Validation**: Cross-reference probabilities across multiple books

### 3. **Live Market Data**
- **Real-time Odds**: Live data from AreYouWatchingThis API
- **Live Games**: Current live games with real-time score updates
- **Market Movement**: Track odds changes and market shifts
- **Multi-book Comparison**: Compare odds across different sportsbooks

### 4. **Advanced Trading Tools**
- **Arbitrage Detection**: 2-way and 3-way arbitrage opportunity identification
- **Middling Calculator**: Totals and spread middling analysis
- **Kelly Criterion**: Optimal bet sizing recommendations
- **Risk Assessment**: Confidence-based risk scoring

## 🏗️ Architecture

### Frontend Components
```
src/components/trading/
├── EnhancedTerminalTable.tsx    # Main terminal interface
├── ModernTerminalTable.tsx      # Legacy table component
├── FilterBar.tsx               # Filtering and sorting controls
└── OpportunityTable.tsx        # Data structure definitions
```

### Backend API
```
api/
├── enhanced-trading-terminal.js # Main terminal endpoint
├── odds-v2.js                  # Legacy odds endpoint
└── odds.js                     # Basic odds endpoint
```

### Core Libraries
```
src/lib/
├── bettingMath.ts              # Mathematical calculations
├── api.ts                      # API client and data management
└── sports.ts                   # Sports data utilities
```

## 📊 Mathematical Implementation

### EV Calculation Formula
```
EV = (Fair_Probability × Payout) – (1 – Fair_Probability)
```

### Vig Removal Process
1. **Calculate Implied Probabilities**: Convert American odds to probabilities
2. **Sum Total Probability**: Add all market probabilities
3. **Calculate Vig**: Total probability - 1.0
4. **Normalize**: Divide each probability by total to remove vig

### Confidence Scoring
- **High Confidence**: 5+ books, consistent odds, low variance
- **Medium Confidence**: 3-4 books, moderate variance
- **Low Confidence**: 1-2 books, high variance, limited data

## 🔧 API Endpoints

### Enhanced Trading Terminal
```
GET /api/enhanced-trading-terminal
```

**Query Parameters:**
- `status`: Filter by game status (live, upcoming, scheduled)
- `league`: Filter by sports league (NFL, NBA, MLB, etc.)
- `market_type`: Filter by market type (moneyline, spread, total)

**Response Structure:**
```json
{
  "games": [
    {
      "id": "game_id",
      "home": "Home Team",
      "away": "Away Team",
      "league": "NFL",
      "startTime": "2024-01-15T20:00:00Z",
      "status": "live",
      "score": {
        "home": 24,
        "away": 17
      },
      "markets": [
        {
          "type": "moneyline",
          "side": "home",
          "odds": -150,
          "book": "FanDuel",
          "impliedProbability": 0.60,
          "ev": 2.5
        }
      ]
    }
  ],
  "lastUpdated": "2024-01-15T20:30:00Z",
  "totalGames": 15,
  "liveGames": 3,
  "stats": {
    "evOpportunities": 8,
    "highEVOpportunities": 3,
    "totalMarkets": 45,
    "averageEV": 1.2
  }
}
```

## 🎯 Usage Examples

### Basic Terminal Usage
```tsx
import { EnhancedTerminalTable } from '@/components/trading/EnhancedTerminalTable';

function TradingPage() {
  return (
    <EnhancedTerminalTable 
      autoRefresh={true}
      refreshInterval={30000}
    />
  );
}
```

### Custom Data Fetching
```tsx
import { fetchLiveGames, fetchGamesByLeague } from '@/lib/api';

// Fetch live games only
const liveData = await fetchLiveGames();

// Fetch specific league
const nflData = await fetchGamesByLeague('NFL');
```

### Real-time Updates
```tsx
import { liveDataManager } from '@/lib/api';

// Subscribe to live updates
const unsubscribe = liveDataManager.subscribe((data) => {
  console.log('New data received:', data);
});

// Start polling
liveDataManager.startPolling(30000);

// Cleanup
unsubscribe();
liveDataManager.stopPolling();
```

## 🎨 UI Features

### Interactive Controls
- **View Modes**: All games, live games, upcoming games
- **Sorting Options**: By EV, time, league
- **Filter Controls**: League, market type, status
- **Display Toggles**: Show/hide implied probabilities, EV values

### Visual Indicators
- **Status Badges**: Live, scheduled, starting soon, final
- **EV Colors**: Green (positive), yellow (neutral), red (negative)
- **Confidence Indicators**: 🟢 High, 🟡 Medium, 🔴 Low
- **Sport Icons**: Visual representation for different leagues

### Real-time Updates
- **Auto-refresh**: Configurable refresh intervals
- **Manual Refresh**: Immediate data update button
- **Last Updated**: Timestamp display
- **Loading States**: Spinner and progress indicators

## 📈 Performance Features

### Data Optimization
- **Batch Processing**: Process games in batches to avoid API overload
- **Caching**: Smart caching with no-store for live data
- **Rate Limiting**: Built-in retry logic with exponential backoff
- **Error Handling**: Graceful degradation and user feedback

### Real-time Performance
- **Efficient Polling**: Configurable update intervals
- **Memory Management**: Proper cleanup of intervals and subscriptions
- **Network Optimization**: Minimal data transfer and efficient parsing

## 🔒 Security & Reliability

### API Security
- **API Key Management**: Secure storage and usage
- **Rate Limiting**: Respectful API usage patterns
- **Error Handling**: Comprehensive error catching and reporting
- **Data Validation**: Input sanitization and validation

### Data Integrity
- **Odds Validation**: Range checking and format validation
- **Probability Bounds**: Ensure probabilities are between 0 and 1
- **Market Consistency**: Cross-reference data across sources
- **Confidence Scoring**: Reliability indicators for calculations

## 🚀 Getting Started

### 1. **Environment Setup**
```bash
# Copy environment variables
cp vercel.env .env.local

# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. **API Configuration**
Ensure your `vercel.env` file contains:
```env
SPORTS_API_KEY=your_api_key_here
NODE_ENV=production
```

### 3. **Access the Terminal**
Navigate to `/enhanced-terminal` in your application to access the enhanced trading terminal.

## 📝 Development Notes

### Code Quality
- **TypeScript**: Full type safety and IntelliSense support
- **ESLint**: Code quality and consistency enforcement
- **Prettier**: Consistent code formatting
- **Testing**: Comprehensive test coverage for mathematical functions

### Performance Monitoring
- **Console Logging**: Detailed API call logging
- **Error Tracking**: Comprehensive error reporting
- **Performance Metrics**: Response time and data processing metrics
- **User Analytics**: Usage patterns and feature adoption

## 🔮 Future Enhancements

### Planned Features
- **WebSocket Integration**: Real-time push updates
- **Advanced Analytics**: Historical EV tracking and trends
- **Portfolio Management**: Bet tracking and performance analysis
- **Mobile Optimization**: Responsive design improvements
- **Multi-language Support**: Internationalization

### Technical Improvements
- **GraphQL API**: More efficient data fetching
- **Service Workers**: Offline capability and caching
- **Machine Learning**: Predictive EV modeling
- **Blockchain Integration**: Decentralized odds verification

## 📞 Support & Contributing

### Getting Help
- **Documentation**: This README and inline code comments
- **Code Examples**: See the demo page and component files
- **API Reference**: Check the API endpoint documentation
- **Issues**: Report bugs and feature requests

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

**Built with ❤️ by the Sharp Shot Team**

*Advanced sports betting analytics for the modern trader*
