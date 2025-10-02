import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, RotateCcw, RefreshCw, Pause, Clock, Play, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import React from "react"; // Added missing import
import { useBookSelection } from "@/contexts/BookSelectionContext";
import { evColorClass, getAvailableProviders, getProviderOdds, filterValidFieldOdds } from "@/lib/evColorScheme";
import { BOOK_ORDER, BOOK_DISPLAY_NAMES } from "@/lib/bookConfig";
import { supabase } from "@/lib/supabaseClient";
import { 
  americanToDecimal, 
  decimalToAmerican,
  calculateWinProbability, 
  calculateEV, 
  parseOdds,
  calculateEVPercent,
  calculateNoVigProbability
} from "@/lib/oddsUtils";
import UpcomingGamesPanel from "@/components/trading/UpcomingGamesPanel";

interface SportsbookOdds {
  sportsbook: string;
  odds: number;
  ev: number;
  isMainBook?: boolean;
  team1Odds?: number;
  team2Odds?: number;
  url?: string;
  lastUpdated?: string;
  uniqueId?: string;
}

interface BettingOpportunity {
  id: string;
  sport: string;
  game: string;
  market: string;
  betType: string;
  line: string;
  mainBookOdds: number;
  ev: number;
  hit: number;
  gameTime: string;
  confidence: string;
  category: string;
  impliedProbability?: number;
  oddsComparison: SportsbookOdds[];
  normalizedEvent?: any;
  truthStatus?: string;
  
  // New trading terminal fields (from API specification)
  event: string;
  league: string;
  prop: string;
  myOdds: number;
  winProbability: number;
  evPercentage: number;
  fieldOdds: Array<{
    sportsbook: string;
    odds: number;
    url: string;
  }>;
}

// Utility functions
const formatOdds = (odds: number) => {
  return odds > 0 ? `+${odds}` : `${odds}`;
};

// 1. Update time display to show countdown (around line 86)
const formatTimeUntilGame = (dateString: string) => {
  const gameDate = new Date(dateString);
  const now = new Date();
  const diffMs = gameDate.getTime() - now.getTime();
  
  // For past events
  if (diffMs <= 0) return 'Live';

  // Calculate time components
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  const remainingMins = diffMins % 60;
  
  // Format countdown
  if (diffDays > 0) return `Starts in ${diffDays}d ${remainingHours}h`;
  if (diffHours > 0) return `Starts in ${diffHours}h ${remainingMins}m`;
  if (diffMins > 0) return `Starts in ${diffMins}m`;
  return 'Starting soon';
};

// 2. Update team display with better fallbacks and actual team names
const formatTeamDisplay = (game: any) => {
  console.log(`🔍 formatTeamDisplay called with game:`, {
    id: game.id,
    sport: game.sport,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    label: game.label,
    event: game.event
  });
  
  // Quick test - if we have the right data structure, use it directly
  if (game.homeTeam && game.awayTeam && 
      typeof game.homeTeam === 'object' && game.homeTeam.name &&
      typeof game.awayTeam === 'object' && game.awayTeam.name) {
    const result = `${game.awayTeam.name} vs ${game.homeTeam.name}`;
    console.log(`🎯 Quick team extraction: "${result}"`);
    return result;
  }
  
  // Also try to extract from game label if team objects don't have names
  const gameLabel = game.label || game.event || game.game || '';
  if (gameLabel && (gameLabel.includes(' vs ') || gameLabel.includes(' @ '))) {
    const separator = gameLabel.includes(' vs ') ? ' vs ' : ' @ ';
    const teams = gameLabel.split(separator);
    if (teams.length === 2) {
      const team1 = teams[0].trim().split(' ').pop() || teams[0].trim();
      const team2 = teams[1].trim().split(' ').pop() || teams[1].trim();
      if (team1 && team2 && team1.length > 1 && team2.length > 1) {
        const result = `${team1} vs ${team2}`;
        console.log(`🎯 Quick label extraction: "${result}"`);
        return result;
      }
    }
  }
  
  // Debug what we actually have
  console.log(`🔍 Team data analysis:`, {
    hasHomeTeam: !!game.homeTeam,
    hasAwayTeam: !!game.awayTeam,
    homeTeamType: typeof game.homeTeam,
    awayTeamType: typeof game.awayTeam,
    homeTeamName: game.homeTeam?.name,
    awayTeamName: game.awayTeam?.name,
    gameLabel: game.label,
    gameEvent: game.event,
    fullGameObject: game
  });
  
  // Convert BBM to MLB
  if (game.sport === 'BBM') game.sport = 'MLB';

  // Enhanced team name extraction with more fallback options
  const getTeamName = (team: any, fallback: string) => {
    if (!team) return fallback;
    
    // Handle string team names
    if (typeof team === 'string') {
      const cleanName = team.trim();
      if (cleanName && cleanName !== '') return cleanName.split(' ').pop() || cleanName;
    }
    
    // Handle object team names - try multiple possible fields
    if (typeof team === 'object') {
      // First try the 'name' field (most common structure: {city: "Seattle", name: "Mariners"})
      if (team.name && typeof team.name === 'string' && team.name.trim() !== '') {
        const cleanName = team.name.trim();
        console.log(`✅ Found team name from object.name: "${cleanName}"`);
        return cleanName;
      }
      
      // Then try other possible fields
      const possibleNames = [
        team.teamName, 
        team.displayName,
        team.shortName,
        team.fullName,
        team.abbreviation,
        team.team,
        team.title
      ].filter(Boolean);
      
      for (const name of possibleNames) {
        if (name && typeof name === 'string' && name.trim() !== '') {
          const cleanName = name.trim();
          console.log(`✅ Found team name from object field: "${cleanName}"`);
          // Return the last word (team name without city)
          return cleanName.split(' ').pop() || cleanName;
        }
      }
    }
    
    return fallback;
  };

  // Try multiple possible team field names, prioritizing objects that might have team data
  const homeTeam = getTeamName(
    game.homeTeam || game.team1Name || game.team1 || game.homeTeamName || game.home,
    'Unknown'
  );
  const awayTeam = getTeamName(
    game.awayTeam || game.team2Name || game.team2 || game.awayTeamName || game.away,
    'Unknown'
  );
  
  // Debug the extracted team names
  console.log(`🏈 Extracted team names: ${awayTeam} vs ${homeTeam}`);
  console.log(`🔍 Raw team data - homeTeam:`, game.homeTeam);
  console.log(`🔍 Raw team data - awayTeam:`, game.awayTeam);

  // If we still have fallback names, try to get from game label or event
  if (homeTeam === 'Unknown' || awayTeam === 'Unknown') {
    const gameLabel = game.label || game.event || game.game || '';
    console.log(`🔍 Game label for team extraction: "${gameLabel}"`);
    
    // Try different separators
    const separators = [' vs ', ' @ ', ' v ', ' - ', ' vs. ', ' @. '];
    
    for (const sep of separators) {
      if (gameLabel && gameLabel.includes(sep)) {
        const teams = gameLabel.split(sep);
        if (teams.length === 2) {
          const team1 = teams[0].trim().split(' ').pop() || teams[0].trim();
          const team2 = teams[1].trim().split(' ').pop() || teams[1].trim();
          if (team1 && team2 && team1 !== 'Unknown' && team2 !== 'Unknown' && team1.length > 1 && team2.length > 1) {
            console.log(`✅ Extracted from "${sep}": ${team1} vs ${team2}`);
            return `${team1} vs ${team2}`;
          }
        }
      }
    }
  }
  

  // If we still don't have good team names, try to extract from the game object
  if (homeTeam === 'Unknown' || awayTeam === 'Unknown') {
    console.log('🔍 Game object for team extraction:', game);
    
    // Try to find team names in other fields
    const possibleTeam1 = game.team1 || game.homeTeam || game.home || game.team1Name || game.homeTeamName;
    const possibleTeam2 = game.team2 || game.awayTeam || game.away || game.team2Name || game.awayTeamName;
    
    if (possibleTeam1 && possibleTeam2) {
      const t1 = typeof possibleTeam1 === 'string' ? possibleTeam1.split(' ').pop() : 'Team1';
      const t2 = typeof possibleTeam2 === 'string' ? possibleTeam2.split(' ').pop() : 'Team2';
      return `${t2} @ ${t1}`;
    }
    
    // Last resort: try to parse from any available text field
    const textFields = [game.label, game.event, game.game, game.name, game.title];
    for (const field of textFields) {
      if (field && typeof field === 'string') {
        // Try different separators
        const separators = [' vs ', ' @ ', ' v ', ' - ', ' vs. ', ' @ '];
        for (const sep of separators) {
          if (field.includes(sep)) {
            const parts = field.split(sep);
            if (parts.length === 2) {
              const team1 = parts[0].trim().split(' ').pop() || parts[0].trim();
              const team2 = parts[1].trim().split(' ').pop() || parts[1].trim();
              if (team1 && team2 && team1 !== 'Unknown' && team2 !== 'Unknown') {
                return `${team1} vs ${team2}`;
              }
            }
          }
        }
      }
    }
  }

  // Final fallback - try to extract from any available text field
  if (homeTeam === 'Unknown' && awayTeam === 'Unknown') {
    const textFields = [game.label, game.event, game.game, game.name, game.title, game.displayName];
    
    for (const field of textFields) {
      if (field && typeof field === 'string' && field.trim()) {
        console.log(`🔍 Trying to extract from field: "${field}"`);
        
        // Try different separators
        const separators = [' vs ', ' @ ', ' v ', ' - ', ' vs. ', ' @. '];
        
        for (const sep of separators) {
          if (field.includes(sep)) {
            const teams = field.split(sep);
            if (teams.length === 2) {
              const team1 = teams[0].trim().split(' ').pop() || teams[0].trim();
              const team2 = teams[1].trim().split(' ').pop() || teams[1].trim();
              if (team1 && team2 && team1 !== 'Unknown' && team2 !== 'Unknown' && team1.length > 1 && team2.length > 1) {
                console.log(`✅ Final extraction from "${field}": ${team1} vs ${team2}`);
                return `${team1} vs ${team2}`;
              }
            }
          }
        }
      }
    }
    
    console.log(`❌ No real team names found - skipping game`);
    return null; // Return null to indicate this game should be skipped
  } else if (homeTeam === 'Unknown' || awayTeam === 'Unknown') {
    console.log(`❌ Missing team data - skipping game`);
    return null; // Return null to indicate this game should be skipped
  }
  
  const result = `${awayTeam} vs ${homeTeam}`;
  console.log(`🎯 formatTeamDisplay returning: "${result}"`);
  return result;
};

// 3. Update sport normalization (around line 325)
const normalizeSportName = (sportName: string) => {
  const sportMap: { [key: string]: string } = {
    'mlb': 'MLB',
    'bbm': 'MLB', // Convert BBM to MLB
    'nba': 'NBA',
    'nfl': 'NFL',
    'fbp': 'NFL', // Convert FBP to NFL
    'fbc': 'NCAAF', // Convert FBC to NCAAF
    'nhl': 'NHL',
    'soccer': 'SOCCER',
    'mma': 'MMA',
    'wnba': 'WNBA',
    'bkd': 'WNBA', // Convert BKD to WNBA
    'ncaab': 'NCAAB',
    'ncaaf': 'NCAAF'
  };
  return sportMap[sportName.toLowerCase()] || sportName.toUpperCase();
};

// 1. Restore formatTimeAgo function (around line 84)
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

// 2. Add enhanced game status detection using actual game time
const determineGameStatus = (game: any) => {
  const now = new Date();
  const gameTime = new Date(game.startTime || game.gameTime);
  
  // Check if game has started (within last 4 hours to account for game duration)
  const gameStarted = gameTime.getTime() <= now.getTime();
  const gameEnded = gameTime.getTime() + (4 * 60 * 60 * 1000) <= now.getTime(); // 4 hours after start
  
  // Check API live indicators as backup
  const apiIndicatesLive = 
    game.isLive === true || 
    game.isLive === "true" || 
    game.isLive === 1 ||
    game.status?.toLowerCase().includes('live') ||
    game.status?.toLowerCase().includes('in progress');
  
  // Check for completed games
  const isFinal = 
    game.status?.toLowerCase().includes('final') ||
    game.status?.toLowerCase().includes('ended') ||
    game.status?.toLowerCase().includes('complete') ||
    gameEnded;

  if (isFinal) return 'final';
  if (gameStarted || apiIndicatesLive) return 'live';
  return 'upcoming';
};

export default function TradingTerminal() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState("");
  const { primaryBook, setPrimaryBook, availableBooks, setAvailableBooks } = useBookSelection();
  const [compareAgainst, setCompareAgainst] = useState("All Books");
  const [selectedSport, setSelectedSport] = useState("All Sports");
  const [selectedMarkets, setSelectedMarkets] = useState("All Markets");
  const [minEV, setMinEV] = useState(0);
  const [minDataPoints, setMinDataPoints] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Get live betting opportunities from consolidated API endpoint
  const { data: opportunitiesData, isLoading: isLoadingOpportunities, error: opportunitiesError, refetch } = useQuery({
    queryKey: ['/api/consolidated', { sport: selectedSport, primaryBook }], // Include primaryBook in query key
    queryFn: async () => {
      console.log('🚀 Fetching consolidated data from API...');
      const params = new URLSearchParams();
      if (selectedSport !== "All Sports") {
        params.append('sport', selectedSport);
      } else {
        // Explicitly request all sports when "All Sports" is selected
        params.append('sport', 'all');
      }
      params.append('primaryBook', primaryBook);
      // Note: minEV filtering is now done client-side to prevent loading on slider changes
      
      const url = `/api/consolidated?${params}`;
      console.log('📡 Requesting:', url);
      
      const response = await fetch(url);
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`Failed to fetch consolidated data: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ API Response received:', data);
      
      // Debug: Log sports available in the response
      if (data.games) {
        const sports = [...new Set(data.games.map((game: any) => game.sport))];
        console.log('🏈 Sports available in API response:', sports);
        console.log('📊 Total games:', data.games.length);
      }
      
      return data;
    },
    refetchInterval: isPaused ? false : 15000, // 15 second refresh when not paused
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    staleTime: 5000, // Data considered fresh for 5 seconds
    enabled: !isPaused,
  });

  // Get player props from the betting service
  const { data: playerPropsData, isLoading: isLoadingProps } = useQuery({
    queryKey: ['/api/betting/player-props', { sport: selectedSport }],
    queryFn: async () => {
      console.log('🎯 Fetching player props from API...');
      try {
        // Get the current session token for authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          return { opportunities: [] };
        }
        
        if (!session?.access_token) {
          console.warn('⚠️ No authentication token available for player props');
          console.log('Session data:', { session, hasToken: !!session?.access_token });
          return { opportunities: [] };
        }
        
        console.log('✅ Authentication token found, making request...');

        // First try the authenticated endpoint
        let response = await fetch('/api/betting/player-props', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error('❌ Player props endpoint error:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url
          });
          
          // Try to get error details from response
          try {
            const errorData = await response.json();
            console.error('Error details:', errorData);
          } catch (e) {
            console.error('Could not parse error response');
          }
          
          // If 403 Forbidden, try the test endpoint to see if server-side API calls work
          if (response.status === 403) {
            console.log('🔄 Trying test endpoint to debug server-side API calls...');
            try {
              const testResponse = await fetch('/api/betting/player-props-test');
              if (testResponse.ok) {
                const testData = await testResponse.json();
                console.log('✅ Test endpoint successful:', testData);
                return testData; // Return test data if available
              } else {
                console.error('❌ Test endpoint also failed:', testResponse.status);
              }
            } catch (testError) {
              console.error('❌ Test endpoint error:', testError);
            }
          }
          
          return { opportunities: [] };
        }
        
      const data = await response.json();
        console.log('✅ Player props response received:', data);
        console.log('📊 Player props data structure:', {
          hasOpportunities: !!data?.opportunities,
          opportunitiesLength: data?.opportunities?.length || 0,
          hasProps: !!data?.props,
          propsLength: data?.props?.length || 0,
          hasData: !!data,
          dataKeys: Object.keys(data || {}),
          rawData: data
        });
      return data;
      } catch (error) {
        console.error('❌ Error fetching player props:', error);
        return { opportunities: [] };
      }
    },
    refetchInterval: isPaused ? false : 60000, // Refetch every 60 seconds (less frequent than live odds)
    staleTime: 30000, // Consider data stale after 30 seconds
    enabled: true,
  });

  // Log any query errors
  React.useEffect(() => {
    if (opportunitiesError) {
      console.error('❌ Live opportunities query error:', opportunitiesError);
    }
    if (isLoadingProps) {
      console.log('🔄 Loading player props...');
    }
  }, [opportunitiesError, isLoadingProps]);

  // Get terminal stats
  const { data: statsData } = useQuery({
    queryKey: ['/api/betting/terminal-stats'],
    queryFn: async () => {
      try {
        // Get the current session token for authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.warn('No authentication token available for terminal stats');
          return { stats: {} };
        }

        const response = await fetch('/api/betting/terminal-stats', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
      if (!response.ok) {
          console.warn('Terminal stats endpoint not available or unauthorized:', response.status, response.statusText);
          return { stats: {} };
      }
        
      return response.json();
      } catch (error) {
        console.warn('Failed to fetch terminal stats:', error);
        return { stats: {} };
      }
    },
    refetchInterval: isPaused ? false : 60000, // 1 minute refresh
    enabled: !isPaused,
  });

    // Transform consolidated API data to opportunities format
  const opportunities: BettingOpportunity[] = React.useMemo(() => {
    console.log('🔍 Raw API response from consolidated:', opportunitiesData);
    console.log('🔍 API loading state:', isLoadingOpportunities);
    console.log('🔍 Primary book:', primaryBook);
    
    if (!opportunitiesData) {
      console.log('❌ No API response received');
      return [];
    }
    
    if (!opportunitiesData.games) {
      console.log('❌ No games data found in API response');
      console.log('🔍 Full response structure:', Object.keys(opportunitiesData));
      return [];
    }

    console.log(`✅ Found ${opportunitiesData.games.length} games in API response`);
    if (opportunitiesData.games.length > 0) {
      console.log('🔍 Sample game:', opportunitiesData.games[0]);
    }

    // Transform games and odds into opportunities format
    const opportunities: BettingOpportunity[] = [];
    
    console.log('🔍 Starting data transformation...');
    console.log('🔍 Games count:', opportunitiesData.games?.length || 0);
    console.log('🔍 Opportunities count:', opportunitiesData.opportunities?.length || 0);
    
    // Track processed opportunities to prevent duplicates
    const processedOpportunities = new Set();
    
    // Process actual opportunities from the API
    if (opportunitiesData.opportunities?.length > 0) {
      console.log('✅ Using opportunities data from API');
      
      opportunitiesData.opportunities.forEach((opp: any) => {
        try {
          // Create unique identifier for this opportunity
          const uniqueKey = `${opp.gameId || opp.id}-${opp.market || opp.betType}-${opp.line || 'main'}-${opp.prop || ''}`;
          
          // Skip if already processed
          if (processedOpportunities.has(uniqueKey)) {
            console.log(`⚠️ Skipping duplicate opportunity: ${uniqueKey}`);
            return;
          }
          processedOpportunities.add(uniqueKey);
          
          // Calculate win probability from myOdds
          const winProb = calculateWinProbability(opp.myOdds || opp.mainBookOdds);
          
          // Calculate +EV% using no-vig probability from field odds
          let calculatedEV = 0;
          let calculatedEVPercent = 0;
          if (opp.mainBookOdds && opp.fieldOdds?.length > 0) {
            // Create a map of all available odds including the main book
            const allOddsMap = new Map<string, number>();
            allOddsMap.set(normalizedPrimaryBook, parseOdds(opp.mainBookOdds) || 0);
            
            opp.fieldOdds.forEach((fo: any) => {
              const odds = parseOdds(fo.odds);
              if (odds && odds !== 1) {
                allOddsMap.set(fo.sportsbook || 'Unknown', odds);
              }
            });
            
            // Calculate proper +EV using no-vig probability
            const evResult = calculateProperEV(parseOdds(opp.mainBookOdds) || 0, allOddsMap);
            calculatedEV = evResult.ev;
            calculatedEVPercent = evResult.evPercent;
          }
          
          const transformedOpp: BettingOpportunity = {
            id: `api-${uniqueKey}`, // Clear prefix to identify API opportunities
            sport: opp.sport || 'Unknown',
            game: formatTeamDisplay(opp) || opp.game || opp.event || 'Unknown Game',
            event: formatTeamDisplay(opp) || opp.event || opp.game || 'Unknown Event',
            league: opp.league || opp.sport || 'Unknown',
            market: opp.market || opp.betType || 'Unknown',
            betType: opp.betType || opp.market || 'Unknown',
            prop: opp.prop || opp.line || 'Unknown',
            line: opp.line || opp.prop || '',
            mainBookOdds: parseOdds(opp.mainBookOdds || opp.myOdds) || 0,
            myOdds: parseOdds(opp.myOdds || opp.mainBookOdds) || 0,
            ev: calculatedEV || parseFloat(opp.ev) || 0,
            evPercentage: calculatedEVPercent || (parseFloat(opp.ev) || 0) * 100,
            winProbability: winProb,
            hit: parseFloat(opp.hit) || 0,
            gameTime: opp.gameTime || new Date().toISOString(),
            confidence: opp.confidence || 'Medium',
            category: opp.category || 'General',
            impliedProbability: winProb / 100,
            oddsComparison: opp.oddsComparison || [],
            fieldOdds: opp.fieldOdds || [],
            normalizedEvent: opp.normalizedEvent,
            truthStatus: opp.truthStatus
          };
          
          opportunities.push(transformedOpp);
        } catch (error) {
          console.warn('Error transforming opportunity:', opp.id, error);
        }
      });
      
      // If we have API opportunities, return early to avoid duplicate game processing
      console.log(`✅ Processed ${opportunities.length} unique API opportunities - skipping game transformation`);
      return opportunities;
    }
    
    // Normalize book names to match API format and remove state-specific duplicates
    const normalizeBookName = (bookName: string) => {
      // Remove state-specific suffixes from BetRivers
      const cleanBookName = bookName.replace(/_PA$|_NJ$|_IL$|_IN$|_MI$|_OH$|_CO$|_IA$|_VA$|_WV$/, '');
      
      const bookMap: { [key: string]: string } = {
        'FanDuel': 'FANDUEL',
        'DraftKings': 'DRAFTKINGS',
        'BetMGM': 'MGM',
        'Caesars': 'CAESARS',
        'PointsBet': 'POINTSBET',
        'BetRivers': 'BET_RIVERS',
        'Hard Rock': 'HARD_ROCK',
        'ESPN Bet': 'ESPNBET',
        'ESPNBET': 'ESPNBET',
        'Fanatics': 'FANATICS',
        'Unibet': 'UNIBET',
        'William Hill': 'WILLIAM_HILL',
        'Bet365': 'BET_365',
        'Bovada': 'BOVADA',
        'BetOnline': 'BETONLINE',
        'SugarHouse': 'SUGAR_HOUSE',
        'SportingBet': 'SPORTINGBET',
        'Sporting Interaction': 'SPORTS_INTERACTION',
        'SportZino': 'SPORTZINO',
        'SportTrade': 'SPORTTRADE',
        'PuntNow': 'PUNTNOW'
      };
      return bookMap[cleanBookName] || cleanBookName.toUpperCase();
    };
    
    // Normalize sport names to match frontend expectations
    const normalizeSportName = (sportName: string) => {
      const sportMap: { [key: string]: string } = {
        'mlb': 'MLB',
        'bbm': 'MLB', // Convert BBM to MLB
        'nba': 'NBA',
        'nfl': 'NFL',
        'fbp': 'NFL', // Convert FBP to NFL
        'fbc': 'NCAAF', // Convert FBC to NCAAF
        'nhl': 'NHL',
        'soccer': 'SOCCER',
        'mma': 'MMA',
        'wnba': 'WNBA',
        'bkd': 'WNBA', // Convert BKD to WNBA
        'ncaab': 'NCAAB',
        'ncaaf': 'NCAAF'
      };
      return sportMap[sportName.toLowerCase()] || sportName.toUpperCase();
    };

    // Helper function to calculate proper +EV% using no-vig probability
    const calculateProperEV = (myOdds: number, allBooks: Map<string, number>): { ev: number, evPercent: number } => {
      try {
        // Get all odds values for no-vig calculation
        const allOddsValues = Array.from(allBooks.values()).filter(odds => odds && odds !== 1);
        
        if (allOddsValues.length < 2) {
          // Fallback to simple best odds comparison if insufficient data
          const bestOdds = Math.max(...allOddsValues, myOdds);
          const fairProb = 1 / bestOdds;
          const ev = (fairProb * myOdds) - 1;
          return { ev, evPercent: ev * 100 };
        }
        
        // Calculate no-vig fair probability from all available odds
        const noVigProb = calculateNoVigProbability(allOddsValues);
        
        if (noVigProb) {
          // Use the new +EV calculation with true probability
          const evPercent = calculateEVPercent(myOdds, noVigProb);
          return { ev: evPercent / 100, evPercent };
        } else {
          // Fallback to best odds method
          const bestOdds = Math.max(...allOddsValues);
          const fairProb = 1 / bestOdds;
          const ev = (fairProb * myOdds) - 1;
          return { ev, evPercent: ev * 100 };
        }
      } catch (error) {
        console.warn('Error calculating EV:', error);
        return { ev: 0, evPercent: 0 };
      }
    };

    // Helper function to generate correct prop labels based on market type and team/side
    const generatePropLabel = (marketType: string, game: any, side: 'home' | 'away' | 'over' | 'under', line?: string): string => {
      // Use the same team extraction logic as formatTeamDisplay
      const getTeamName = (team: any, fallback: string) => {
        if (!team) return fallback;
        
        // Handle string team names
        if (typeof team === 'string') {
          const cleanName = team.trim();
          if (cleanName && cleanName !== '') return cleanName.split(' ').pop() || cleanName;
        }

        // Handle object team names - try multiple possible fields
        if (typeof team === 'object') {
          // First try the 'name' field (most common structure: {city: "Seattle", name: "Mariners"})
          if (team.name && typeof team.name === 'string' && team.name.trim() !== '') {
            return team.name.trim();
          }
          
          // Then try other possible fields
          const possibleNames = [
            team.teamName, 
            team.displayName,
            team.shortName,
            team.fullName,
            team.abbreviation,
            team.team,
            team.title
          ].filter(Boolean);
          
          for (const name of possibleNames) {
            if (name && typeof name === 'string' && name.trim() !== '') {
              const cleanName = name.trim();
              return cleanName.split(' ').pop() || cleanName;
            }
          }
        }
        
        return fallback;
      };
      
      const awayTeam = getTeamName(game.awayTeam || game.team2Name || game.team2 || game.awayTeamName || game.away, '');
      const homeTeam = getTeamName(game.homeTeam || game.team1Name || game.team1 || game.homeTeamName || game.home, '');
      
      // If we don't have real team names, try to extract from game label
      if (!awayTeam || !homeTeam || awayTeam === 'Unknown' || homeTeam === 'Unknown') {
        const gameLabel = game.label || game.event || game.game || '';
        if (gameLabel && (gameLabel.includes(' vs ') || gameLabel.includes(' @ '))) {
          const separator = gameLabel.includes(' vs ') ? ' vs ' : ' @ ';
          const teams = gameLabel.split(separator);
          if (teams.length === 2) {
            const team1 = teams[0].trim().split(' ').pop() || teams[0].trim();
            const team2 = teams[1].trim().split(' ').pop() || teams[1].trim();
            if (team1 && team2 && team1.length > 1 && team2.length > 1) {
              return side === 'away' ? `${team2} ML` : `${team1} ML`;
            }
          }
        }
        return null;
      }
      
  switch (marketType.toLowerCase()) {
    case 'moneyline':
      return side === 'away' ? `${awayTeam} ML` : `${homeTeam} ML`;
        
    case 'spread':
          if (side === 'away') {
            return line ? `${awayTeam} ${line}` : `${awayTeam} Spread`;
          } else {
            return line ? `${homeTeam} ${line}` : `${homeTeam} Spread`;
          }
        
    case 'total':
          const totalLine = line || 'Total';
          return side === 'over' ? `Over ${totalLine}` : `Under ${totalLine}`;
        
        case 'futures':
          return `${side === 'home' ? homeTeam : awayTeam} Future`;
        
    default:
          return `${marketType} - ${side}`;
      }
    };

// DUPLICATE FUNCTION REMOVED - Using the enhanced formatTeamDisplay function above
    
    const normalizedPrimaryBook = normalizeBookName(primaryBook);
    console.log(`🔍 Normalized primary book: ${primaryBook} -> ${normalizedPrimaryBook}`);
    
    opportunitiesData.games.forEach((game: any) => {
      const gameOdds = opportunitiesData.odds?.[game.id.toString()] || {};
      
      // Use the enhanced status detection function
      const category = determineGameStatus(game);
      
      // For final games, show them but don't create betting opportunities
      if (category === 'final') {
        console.log(`ℹ️ Final game ${game.id}: ${game.label} - showing without odds`);
        // Still create a basic opportunity entry for final games but without odds
        const teamDisplay = formatTeamDisplay(game);
        if (teamDisplay) {
          opportunities.push({
            id: `final-${game.id}`,
            sport: normalizeSportName(game.sport || 'Unknown'),
            game: teamDisplay,
            market: 'Game Ended',
            betType: 'Final',
            line: '',
            mainBookOdds: 0,
            myOdds: 0,
            ev: 0,
            evPercentage: 0,
            hit: 0,
            winProbability: 0,
            gameTime: game.startTime || new Date().toISOString(),
            confidence: 'low',
            category: 'final',
            impliedProbability: 0,
            oddsComparison: [],
            fieldOdds: {},
            event: teamDisplay,
            league: game.league || game.sport || 'Unknown League',
            prop: 'Game Ended'
          });
        }
        return;
      }
      
      console.log(`🎮 Processing game ${game.id}: ${game.label} - category: ${category}`);
      console.log(`📊 Game odds available:`, Object.keys(gameOdds));
      console.log(`🏈 Team data:`, {
    team1Name: game.team1Name, 
    team2Name: game.team2Name,
        team1: game.team1,
        team2: game.team2,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
    label: game.label,
        event: game.event
      });
      
      // Debug the homeTeam and awayTeam objects
      if (game.homeTeam) {
        console.log(`🏠 HomeTeam object:`, JSON.stringify(game.homeTeam, null, 2));
      }
      if (game.awayTeam) {
        console.log(`✈️ AwayTeam object:`, JSON.stringify(game.awayTeam, null, 2));
      }
      
      // Skip games with no odds data - we can't create betting opportunities without odds
      if (Object.keys(gameOdds).length === 0) {
        console.log(`⚠️ Skipping game ${game.id} - no odds data available`);
        return;
      }
      
      // Check if we can get real team names - skip if not
      const teamDisplay = formatTeamDisplay(game);
      if (!teamDisplay) {
        console.log(`⚠️ Skipping game ${game.id} - no real team names available`);
        return;
      }
      
      // Skip if team display contains placeholders
      if (teamDisplay.includes('Team1') || teamDisplay.includes('Team2') || teamDisplay.includes('Unknown')) {
        console.log(`⚠️ Skipping game ${game.id} - contains placeholders: "${teamDisplay}"`);
        return;
      }
      
      console.log(`✅ Game ${game.id} passed team validation: "${teamDisplay}"`);
      
      // Moneyline opportunities for both teams
      if (gameOdds.moneyline) {
        console.log(`💰 Moneyline odds for game ${game.id}:`, gameOdds.moneyline);
        
        // Away team moneyline
        if (gameOdds.moneyline.away && Object.keys(gameOdds.moneyline.away).length > 0) {
          const myOdds = gameOdds.moneyline.away[normalizedPrimaryBook];
          console.log(`🎯 Primary book (${normalizedPrimaryBook}) odds for away team:`, myOdds);
          
          if (myOdds && myOdds !== 1) {
            // Filter out state-specific duplicates and get unique books
            const uniqueBooks = new Map();
            Object.entries(gameOdds.moneyline.away).forEach(([book, odds]) => {
              const normalizedBook = normalizeBookName(book);
              if (odds !== 1 && !uniqueBooks.has(normalizedBook)) {
                uniqueBooks.set(normalizedBook, odds);
              }
            });
            
            const fieldOdds = Array.from(uniqueBooks.entries())
              .filter(([book]) => book !== normalizedPrimaryBook)
              .map(([book, odds]) => ({
                sportsbook: book,
                odds: Number(odds),
                url: `https://go.metabet.io/bet/${game.id}/${book.toLowerCase()}`
              }));
            
            // Calculate +EV% using no-vig probability
            const evResult = calculateProperEV(myOdds, uniqueBooks);
            const ev = evResult.ev;
            const evPercent = evResult.evPercent;
            
            // Calculate proper win probability and hit rate
            const winProbabilityFromOdds = calculateWinProbability(myOdds);
            const hitRate = Math.round(winProbabilityFromOdds);
            
            console.log(`📈 EV calculation for away team: myOdds=${myOdds}, ev=${ev}, evPercent=${evPercent}%, winProb=${winProbabilityFromOdds}%`);
            
            const opportunity = {
              id: `${game.gameID || game.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}-moneyline-away`,
              sport: normalizeSportName(game.sport || 'Unknown'),
              game: teamDisplay,
              market: 'Moneyline',
              betType: 'Moneyline',
              line: '',
              mainBookOdds: myOdds,
              myOdds: myOdds,
              ev: ev,
              evPercentage: evPercent,
              hit: hitRate,
              winProbability: Math.round(winProbabilityFromOdds),
              gameTime: game.startTime || new Date().toISOString(),
              confidence: 'low',
              category: category,
              impliedProbability: 1 / myOdds,
              oddsComparison: Array.from(uniqueBooks.entries()).map(([book, odds]) => {
                const decimalOdds = Number(odds);
                // Calculate individual +EV% for this book's odds
                const bookEvResult = calculateProperEV(decimalOdds, uniqueBooks);
                return {
                  sportsbook: book,
                  odds: decimalOdds,
                  ev: bookEvResult.ev,
                  url: `https://go.metabet.io/bet/${game.id}/${book.toLowerCase()}`
                };
              }),
              fieldOdds: fieldOdds,
              event: formatTeamDisplay(game),
              league: game.league || game.sport || 'Unknown League',
              prop: generatePropLabel('Moneyline', game, 'away') || 'Away ML'
            };
            
            console.log(`🎯 Creating away team opportunity:`, {
              game: opportunity.game,
              sport: opportunity.sport,
              market: opportunity.market,
              odds: opportunity.myOdds
            });
            
            opportunities.push(opportunity);
          }
        }
        
        // Home team moneyline
        if (gameOdds.moneyline.home && Object.keys(gameOdds.moneyline.home).length > 0) {
          const myOdds = gameOdds.moneyline.home[normalizedPrimaryBook];
          if (myOdds && myOdds !== 1) {
            // Filter out state-specific duplicates and get unique books
            const uniqueBooks = new Map();
            Object.entries(gameOdds.moneyline.home).forEach(([book, odds]) => {
              const normalizedBook = normalizeBookName(book);
              if (odds !== 1 && !uniqueBooks.has(normalizedBook)) {
                uniqueBooks.set(normalizedBook, odds);
              }
            });
            
            const fieldOdds = Array.from(uniqueBooks.entries())
              .filter(([book]) => book !== normalizedPrimaryBook)
              .map(([book, odds]) => ({
                sportsbook: book,
                odds: Number(odds),
                url: `https://go.metabet.io/bet/${game.id}/${book.toLowerCase()}`
              }));
            
            // Calculate +EV% using no-vig probability
            const evResult = calculateProperEV(myOdds, uniqueBooks);
            const ev = evResult.ev;
            const evPercent = evResult.evPercent;
            
            // Calculate proper win probability and hit rate for home team
            const winProbabilityFromOdds = calculateWinProbability(myOdds);
            const hitRate = Math.round(winProbabilityFromOdds);
            
            opportunities.push({
              id: `${game.gameID || game.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}-moneyline-home`,
              sport: normalizeSportName(game.sport || 'Unknown'),
              game: teamDisplay,
              market: 'Moneyline',
              betType: 'Moneyline',
              line: '',
              mainBookOdds: myOdds,
              myOdds: myOdds,
              ev: ev,
              evPercentage: evPercent,
              hit: hitRate,
              winProbability: Math.round(winProbabilityFromOdds),
              gameTime: game.startTime || new Date().toISOString(),
              confidence: 'low',
              category: category,
              impliedProbability: 1 / myOdds,
              oddsComparison: Array.from(uniqueBooks.entries()).map(([book, odds]) => {
                const decimalOdds = Number(odds);
                // Calculate individual +EV% for this book's odds
                const bookEvResult = calculateProperEV(decimalOdds, uniqueBooks);
                return {
                  sportsbook: book,
                  odds: decimalOdds,
                  ev: bookEvResult.ev,
                  url: `https://go.metabet.io/bet/${game.id}/${book.toLowerCase()}`
                };
              }),
              fieldOdds: fieldOdds,
              event: formatTeamDisplay(game),
              league: game.league || game.sport || 'Unknown League',
              prop: generatePropLabel('Moneyline', game, 'home') || 'Home ML'
            });
          }
        }
      }
      
      // Spread opportunities
      if (gameOdds.spread) {
        // Away team spread
        if (gameOdds.spread.away && Object.keys(gameOdds.spread.away).length > 0) {
          const myOdds = gameOdds.spread.away[normalizedPrimaryBook];
          if (myOdds && myOdds !== 1) {
            // Filter out state-specific duplicates
            const uniqueBooks = new Map();
            Object.entries(gameOdds.spread.away).forEach(([book, odds]) => {
              const normalizedBook = normalizeBookName(book);
              if (odds !== 1 && !uniqueBooks.has(normalizedBook)) {
                uniqueBooks.set(normalizedBook, odds);
              }
            });
            
            const fieldOdds = Array.from(uniqueBooks.entries())
              .filter(([book]) => book !== normalizedPrimaryBook)
              .map(([book, odds]) => ({
                sportsbook: book,
                odds: Number(odds),
                url: `https://go.metabet.io/bet/${game.id}/${book.toLowerCase()}`
              }));
            
            // Calculate +EV% using no-vig probability
            const evResult = calculateProperEV(myOdds, uniqueBooks);
            const ev = evResult.ev;
            const evPercent = evResult.evPercent;
            
            opportunities.push({
              id: `${game.gameID || game.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}-spread-away`,
              sport: normalizeSportName(game.sport || 'Unknown'),
              game: formatTeamDisplay(game),
              market: 'Spread',
              betType: 'Spread',
              line: '-1.5', // Default line
              mainBookOdds: myOdds,
              myOdds: myOdds,
              ev: ev,
              evPercentage: evPercent,
              hit: Math.round(calculateWinProbability(myOdds)),
              winProbability: Math.round(calculateWinProbability(myOdds)),
              gameTime: game.startTime || new Date().toISOString(),
              confidence: 'low',
              category: category,
              impliedProbability: 1 / myOdds,
              oddsComparison: Array.from(uniqueBooks.entries()).map(([book, odds]) => {
                const decimalOdds = Number(odds);
                // Calculate individual +EV% for this book's odds
                const bookEvResult = calculateProperEV(decimalOdds, uniqueBooks);
                return {
                  sportsbook: book,
                  odds: decimalOdds,
                  ev: bookEvResult.ev,
                  url: `https://go.metabet.io/bet/${game.id}/${book.toLowerCase()}`
                };
              }),
              fieldOdds: fieldOdds,
              event: formatTeamDisplay(game),
              league: game.league || game.sport || 'Unknown League',
              prop: generatePropLabel('Spread', game, 'away', '-1.5') || 'Away Spread'
            });
          }
        }
        
        // Home team spread
        if (gameOdds.spread.home && Object.keys(gameOdds.spread.home).length > 0) {
          const myOdds = gameOdds.spread.home[normalizedPrimaryBook];
          if (myOdds && myOdds !== 1) {
            // Filter out state-specific duplicates
            const uniqueBooks = new Map();
            Object.entries(gameOdds.spread.home).forEach(([book, odds]) => {
              const normalizedBook = normalizeBookName(book);
              if (odds !== 1 && !uniqueBooks.has(normalizedBook)) {
                uniqueBooks.set(normalizedBook, odds);
              }
            });
            
            const fieldOdds = Array.from(uniqueBooks.entries())
              .filter(([book]) => book !== normalizedPrimaryBook)
              .map(([book, odds]) => ({
                sportsbook: book,
                odds: Number(odds),
                url: `https://go.metabet.io/bet/${game.id}/${book.toLowerCase()}`
              }));
            
            // Calculate +EV% using no-vig probability
            const evResult = calculateProperEV(myOdds, uniqueBooks);
            const ev = evResult.ev;
            const evPercent = evResult.evPercent;
            
            opportunities.push({
              id: `${game.gameID || game.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}-spread-home`,
              sport: normalizeSportName(game.sport || 'Unknown'),
              game: formatTeamDisplay(game),
              market: 'Spread',
              betType: 'Spread',
              line: '+1.5', // Default line
              mainBookOdds: myOdds,
              myOdds: myOdds,
              ev: ev,
              evPercentage: evPercent,
              hit: Math.round(calculateWinProbability(myOdds)),
              winProbability: Math.round(calculateWinProbability(myOdds)),
              gameTime: game.startTime || new Date().toISOString(),
              confidence: 'low',
              category: category,
              impliedProbability: 1 / myOdds,
              oddsComparison: Array.from(uniqueBooks.entries()).map(([book, odds]) => {
                const decimalOdds = Number(odds);
                // Calculate individual +EV% for this book's odds
                const bookEvResult = calculateProperEV(decimalOdds, uniqueBooks);
                return {
                  sportsbook: book,
                  odds: decimalOdds,
                  ev: bookEvResult.ev,
                  url: `https://go.metabet.io/bet/${game.id}/${book.toLowerCase()}`
                };
              }),
              fieldOdds: fieldOdds,
              event: formatTeamDisplay(game),
              league: game.league || game.sport || 'Unknown League',
              prop: generatePropLabel('Spread', game, 'home', '+1.5') || 'Home Spread'
            });
          }
        }
      }
      
      // Total opportunities
      if (gameOdds.total) {
        // Over total
        if (gameOdds.total.over && Object.keys(gameOdds.total.over).length > 0) {
          const myOdds = gameOdds.total.over[normalizedPrimaryBook];
          if (myOdds && myOdds !== 1) {
            // Filter out state-specific duplicates
            const uniqueBooks = new Map();
            Object.entries(gameOdds.total.over).forEach(([book, odds]) => {
              const normalizedBook = normalizeBookName(book);
              if (odds !== 1 && !uniqueBooks.has(normalizedBook)) {
                uniqueBooks.set(normalizedBook, odds);
              }
            });
            
            const fieldOdds = Array.from(uniqueBooks.entries())
              .filter(([book]) => book !== normalizedPrimaryBook)
              .map(([book, odds]) => ({
                sportsbook: book,
                odds: Number(odds),
                url: `https://go.metabet.io/bet/${game.id}/${book.toLowerCase()}`
              }));
            
            // Calculate +EV% using no-vig probability
            const evResult = calculateProperEV(myOdds, uniqueBooks);
            const ev = evResult.ev;
            const evPercent = evResult.evPercent;
            
            opportunities.push({
              id: `${game.gameID || game.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}-total-over`,
              sport: normalizeSportName(game.sport || 'Unknown'),
              game: formatTeamDisplay(game),
              market: 'Total',
              betType: 'Over',
              line: '8.5', // Default line
              mainBookOdds: myOdds,
              myOdds: myOdds,
              ev: ev,
              evPercentage: evPercent,
              hit: Math.round(calculateWinProbability(myOdds)),
              winProbability: Math.round(calculateWinProbability(myOdds)),
              gameTime: game.startTime || new Date().toISOString(),
              confidence: 'low',
              category: category,
              impliedProbability: 1 / myOdds,
              oddsComparison: Array.from(uniqueBooks.entries()).map(([book, odds]) => {
                const decimalOdds = Number(odds);
                // Calculate individual +EV% for this book's odds
                const bookEvResult = calculateProperEV(decimalOdds, uniqueBooks);
                return {
                  sportsbook: book,
                  odds: decimalOdds,
                  ev: bookEvResult.ev,
                  url: `https://go.metabet.io/bet/${game.id}/${book.toLowerCase()}`
                };
              }),
              fieldOdds: fieldOdds,
              event: formatTeamDisplay(game),
              league: game.league || game.sport || 'Unknown League',
              prop: generatePropLabel('Total', game, 'over', '42.5') || 'Over Total'
            });
          }
        }
        
        // Under total
        if (gameOdds.total.under && Object.keys(gameOdds.total.under).length > 0) {
          const myOdds = gameOdds.total.under[normalizedPrimaryBook];
          if (myOdds && myOdds !== 1) {
            // Filter out state-specific duplicates
            const uniqueBooks = new Map();
            Object.entries(gameOdds.total.under).forEach(([book, odds]) => {
              const normalizedBook = normalizeBookName(book);
              if (odds !== 1 && !uniqueBooks.has(normalizedBook)) {
                uniqueBooks.set(normalizedBook, odds);
              }
            });
            
            const fieldOdds = Array.from(uniqueBooks.entries())
              .filter(([book]) => book !== normalizedPrimaryBook)
              .map(([book, odds]) => ({
                sportsbook: book,
                odds: Number(odds),
                url: `https://go.metabet.io/bet/${game.id}/${book.toLowerCase()}`
              }));
            
            // Calculate +EV% using no-vig probability
            const evResult = calculateProperEV(myOdds, uniqueBooks);
            const ev = evResult.ev;
            const evPercent = evResult.evPercent;
            
            opportunities.push({
              id: `${game.gameID || game.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}-total-under`,
              sport: normalizeSportName(game.sport || 'Unknown'),
              game: formatTeamDisplay(game),
              market: 'Total',
              betType: 'Under',
              line: '8.5', // Default line
              mainBookOdds: myOdds,
              myOdds: myOdds,
              ev: ev,
              evPercentage: evPercent,
              hit: Math.round(calculateWinProbability(myOdds)),
              winProbability: Math.round(calculateWinProbability(myOdds)),
              gameTime: game.startTime || new Date().toISOString(),
              confidence: 'low',
              category: category,
              impliedProbability: 1 / myOdds,
              oddsComparison: Array.from(uniqueBooks.entries()).map(([book, odds]) => {
                const decimalOdds = Number(odds);
                // Calculate individual +EV% for this book's odds
                const bookEvResult = calculateProperEV(decimalOdds, uniqueBooks);
                return {
                  sportsbook: book,
                  odds: decimalOdds,
                  ev: bookEvResult.ev,
                  url: `https://go.metabet.io/bet/${game.id}/${book.toLowerCase()}`
                };
              }),
              fieldOdds: fieldOdds,
              event: formatTeamDisplay(game),
              league: game.league || game.sport || 'Unknown League',
              prop: generatePropLabel('Total', game, 'under', '42.5') || 'Under Total'
            });
          }
        }
      }
    });
    
    console.log(`✅ Total opportunities created: ${opportunities.length}`);
    console.log(`📊 Sample opportunities:`, opportunities.slice(0, 3));
    console.log(`📈 Category breakdown:`, {
      live: opportunities.filter(opp => opp.category === 'live').length,
      upcoming: opportunities.filter(opp => opp.category === 'upcoming').length,
      final: opportunities.filter(opp => opp.category === 'final').length,
      other: opportunities.filter(opp => !['live', 'upcoming', 'final'].includes(opp.category)).length
    });
    
    // Debug: Show all team names in opportunities
    const teamNames = opportunities.map(opp => opp.game).filter(Boolean);
    console.log(`🏈 All team names in opportunities:`, teamNames.slice(0, 10));
    
    // If no opportunities were created, create some fallback opportunities for debugging
    if (opportunities.length === 0) {
      console.log('⚠️ No opportunities created, adding fallback opportunities for debugging');
      opportunities.push({
        id: 'fallback-1',
        sport: 'MLB',
        game: 'Sample Game',
        market: 'Moneyline',
        betType: 'Moneyline',
        line: '',
        mainBookOdds: 2.0,
        myOdds: 2.0,
        ev: 0.05,
        evPercentage: 5,
        hit: 45,
        winProbability: 45,
        gameTime: new Date().toISOString(),
        confidence: 'low',
        category: 'upcoming',
        impliedProbability: 0.5,
        oddsComparison: [],
        fieldOdds: [],
        event: 'Sample Game',
        league: 'MLB',
        prop: 'Moneyline'
      });
    }
    
    // Add player props to opportunities if available
    if (playerPropsData) {
      console.log('🔍 Player props data received:', playerPropsData);
      
      // Try different possible data structures
      let playerProps = [];
      if (Array.isArray(playerPropsData)) {
        playerProps = playerPropsData;
      } else if (playerPropsData.opportunities && Array.isArray(playerPropsData.opportunities)) {
        playerProps = playerPropsData.opportunities;
      } else if (playerPropsData.props && Array.isArray(playerPropsData.props)) {
        playerProps = playerPropsData.props;
      } else if (playerPropsData.data && Array.isArray(playerPropsData.data)) {
        playerProps = playerPropsData.data;
      }
      
      console.log(`📊 Found ${playerProps.length} player props to process`);
      
      if (playerProps.length > 0) {
        playerProps.forEach((prop: any, index: number) => {
          console.log(`🎯 Processing player prop ${index + 1}:`, prop);
          
          // Create the prop description like "LeBron over 21 points"
          const propDescription = `${prop.playerName || prop.player || 'Player'} ${prop.statType || prop.market || prop.stat || 'Prop'} ${prop.line || prop.value || prop.overUnder || ''}`;
          
        // Transform player prop to match our opportunity structure
        const playerPropOpportunity: BettingOpportunity = {
          id: `prop-${prop.id || Math.random()}`,
          sport: normalizeSportName(prop.sport || 'Unknown'),
            game: prop.game || prop.event || propDescription,
            market: 'PROP',
          betType: 'Player Prop',
            line: prop.line || prop.value || prop.overUnder || '',
            mainBookOdds: prop.myOdds || prop.odds || prop.price || 0,
            myOdds: prop.myOdds || prop.odds || prop.price || 0,
          ev: prop.ev || 0,
          evPercentage: (prop.ev || 0) * 100,
            hit: Math.round(calculateWinProbability(prop.myOdds || prop.odds || prop.price || 0)),
            winProbability: Math.round(calculateWinProbability(prop.myOdds || prop.odds || prop.price || 0)),
            impliedProbability: calculateWinProbability(prop.myOdds || prop.odds || prop.price || 0) / 100,
            gameTime: prop.gameTime || prop.startTime || new Date().toISOString(),
          confidence: prop.confidence || 'Medium',
          category: prop.category || 'props',
          truthStatus: 'PROP' as const,
          oddsComparison: prop.oddsComparison || [],
          fieldOdds: prop.fieldOdds || [],
            event: prop.game || prop.event || propDescription,
          league: prop.league || prop.sport || 'Unknown League',
            prop: propDescription
        };
        
          console.log(`✅ Created player prop: ${propDescription}`);
        opportunities.push(playerPropOpportunity);
      });
      
      console.log(`✅ Total opportunities with player props: ${opportunities.length}`);
      } else {
        console.log('ℹ️ No player props found in the data structure');
      }
    } else {
      console.log('ℹ️ No player props data received from API');
    }
    
    // Sort with priority:
    // 1. MLB games first
    // 2. Live games
    // 3. Upcoming games
    return opportunities.sort((a, b) => {
      // MLB gets highest priority
      if (a.sport === 'MLB' && b.sport !== 'MLB') return -1;
      if (a.sport !== 'MLB' && b.sport === 'MLB') return 1;
      
      // Live games come before upcoming
      if (a.category === 'live' && b.category !== 'live') return -1;
      if (a.category !== 'live' && b.category === 'live') return 1;
      
      // Finally sort by game time
      return new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime();
    });
  }, [opportunitiesData, primaryBook, playerPropsData]);

  // Filter opportunities based on current filters
  const filteredOpportunities = React.useMemo(() => {
    console.log(`🔍 Filtering ${opportunities.length} opportunities with filters:`, {
      selectedSport,
      selectedMarkets,
      minEV,
      searchTerm,
      activeTab
    });
    
    // Debug: Show category breakdown before filtering
    const categoryBreakdown = {
      live: opportunities.filter(opp => opp.category === 'live').length,
      upcoming: opportunities.filter(opp => opp.category === 'upcoming').length,
      final: opportunities.filter(opp => opp.category === 'final').length,
      other: opportunities.filter(opp => !['live', 'upcoming', 'final'].includes(opp.category)).length
    };
    console.log(`📊 Category breakdown before filtering:`, categoryBreakdown);
    
    const filtered = opportunities.filter(opp => {
      // Filter by sport
      if (selectedSport !== "All Sports" && opp.sport !== selectedSport) {
        return false;
      }
      
      // Filter by market type
      if (selectedMarkets !== "All Markets" && opp.market !== selectedMarkets) {
          return false;
      }
      
      // Filter by minimum EV
      if (opp.ev < minEV) {
          return false;
      }
      
      
      // Filter by minimum data points (sportsbooks)
      const dataPointsCount = opp.oddsComparison?.length || 0;
      if (dataPointsCount < minDataPoints) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm && !opp.game.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !opp.market.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by category tab
      if (activeTab === 'live' && opp.category !== 'live') return false;
      if (activeTab === 'upcoming' && opp.category !== 'upcoming') return false;
      if (activeTab === 'upcoming-games') return false; // Hide all opportunities when showing upcoming games panel
      if (activeTab === 'final' && opp.category !== 'final') return false;
      if (activeTab === 'ev' && opp.ev <= 0) return false;
      if (activeTab === 'arbitrage' && opp.category !== 'arbitrage') return false;
      if (activeTab === 'middling' && opp.category !== 'middling') return false;
      
      return true;
    });
    
    console.log(`✅ Filtered to ${filtered.length} opportunities`);
    
    // Debug: Show what opportunities made it through filtering
    if (filtered.length > 0) {
      console.log(`🏈 Filtered opportunities team names:`, filtered.slice(0, 5).map(opp => opp.game));
    } else {
      console.log(`❌ No opportunities passed filtering!`);
      console.log(`🔍 Sample opportunity that was filtered out:`, opportunities[0]);
    }
    return filtered;
  }, [opportunities, selectedSport, selectedMarkets, minEV, minDataPoints, searchTerm, activeTab]);

  // Category counts
  const counts = React.useMemo(() => {
    const all = opportunities.length;
    const live = opportunities.filter(opp => opp.category === 'live').length;
    const upcoming = opportunities.filter(opp => opp.category === 'upcoming').length;
    const final = opportunities.filter(opp => opp.category === 'final').length;
    const ev = opportunities.filter(opp => opp.ev > 0).length;
    const arbitrage = opportunities.filter(opp => opp.category === 'arbitrage').length;
    const middling = opportunities.filter(opp => opp.category === 'middling').length;
    
    console.log(`📊 Category counts:`, {
      all,
      live,
      upcoming,
      final,
      ev,
      arbitrage,
      middling,
      sampleCategories: opportunities.slice(0, 3).map(opp => opp.category)
    });
    
    return { 
      all: all || 0, 
      live: live || 0,
      upcoming: upcoming || 0,
      final: final || 0,
      ev: ev || 0, 
      arbitrage: arbitrage || 0, 
      middling: middling || 0 
    };
  }, [opportunities]);

  // EV color function - using the new utility
  const getEVColor = (ev: number) => {
    return evColorClass(ev);
  };



  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setLastRefresh(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused]);

  if (isLoadingOpportunities || isLoadingProps) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-green-400">Loading trading terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Top Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 gap-2">
        <div className="flex items-center gap-2 lg:gap-4 text-xs flex-wrap">
          <Badge variant="outline" className="bg-gray-800 text-green-400 border-green-400">
            Books {statsData?.booksScanned || 18}
          </Badge>
          <Badge variant="outline" className="bg-gray-800 text-yellow-400 border-yellow-400">
            +EV {counts.ev}
          </Badge>
          <Badge variant="outline" className="bg-gray-800 text-blue-400 border-blue-400">
            Arb {counts.arbitrage}
          </Badge>
          <Badge variant="outline" className="bg-gray-800 text-purple-400 border-purple-400">
            Mid {counts.middling}
          </Badge>
            </div>
            
        <div className="flex items-center gap-2 lg:gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`}></div>
            <span className={isPaused ? 'text-red-400' : 'text-green-400'}>
              {isPaused ? 'PAUSED' : 'LIVE - 30s refresh'}
                </span>
              </div>
          <span className="text-gray-400 hidden md:inline">
            Updated {formatTimeAgo(lastRefresh.toISOString())}
                </span>
              <Button
            size="sm" 
            variant="ghost" 
            className="text-green-400 hover:text-green-300"
                onClick={handleRefresh}
              >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden md:inline ml-1">Refresh</span>
              </Button>
              <Button
            size="sm" 
                variant="ghost"
            className={isPaused ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}
            onClick={togglePause}
              >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span className="hidden md:inline ml-1">{isPaused ? 'Resume' : 'Pause'}</span>
              </Button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center justify-center py-4 bg-black px-4">
        <div className="flex gap-2 flex-wrap justify-center">
          {[
            { key: 'all', label: 'All Games', count: counts.all, color: 'border-green-400 bg-green-400/20' },
            { key: 'live', label: '🔴 Live', count: counts.live, color: 'border-red-400 bg-red-400/20' },
            { key: 'upcoming', label: '⏰ Upcoming', count: counts.upcoming, color: 'border-blue-400 bg-blue-400/20' },
            { key: 'upcoming-games', label: '📅 Upcoming Games', count: '', color: 'border-purple-400 bg-purple-400/20' },
            { key: 'final', label: '✅ Final', count: counts.final, color: 'border-green-500 bg-green-500/20' },
            { key: 'ev', label: '+EV', count: counts.ev, color: 'border-yellow-400 bg-yellow-400/20' },
          ].map((tab) => (
                <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.key)}
              className={`${activeTab === tab.key ? tab.color : 'border-gray-600 bg-gray-800/20'} border rounded-full text-xs px-2 sm:px-3 py-1 min-h-[32px] sm:min-h-[36px]`}
            >
              {tab.label} {tab.count}
                </Button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 sm:px-4 py-3 bg-gray-900">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search players, teams, or markets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 h-10 sm:h-12 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 px-3 sm:px-4 py-3 bg-gray-900 border-b border-gray-700">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Primary Book</label>
          <Select value={primaryBook} onValueChange={setPrimaryBook}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-xs sm:text-sm h-8 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              {availableBooks.map((book) => (
                <SelectItem key={book} value={book} className="text-white text-xs">
                  {book}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Compare Against</label>
          <Select value={compareAgainst} onValueChange={setCompareAgainst}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-xs sm:text-sm h-8 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="All Books" className="text-white text-xs">All Books</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Sports</label>
          <Select value={selectedSport} onValueChange={setSelectedSport}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-xs sm:text-sm h-8 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="All Sports" className="text-white text-xs">All Sports</SelectItem>
              <SelectItem value="MLB" className="text-white text-xs">MLB</SelectItem>
              <SelectItem value="NBA" className="text-white text-xs">NBA</SelectItem>
              <SelectItem value="NFL" className="text-white text-xs">NFL</SelectItem>
              <SelectItem value="NHL" className="text-white text-xs">NHL</SelectItem>
              <SelectItem value="SOCCER" className="text-white text-xs">SOCCER</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Markets</label>
          <Select value={selectedMarkets} onValueChange={setSelectedMarkets}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-xs sm:text-sm h-8 sm:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="All Markets" className="text-white text-xs">All Markets</SelectItem>
              <SelectItem value="Moneyline" className="text-white text-xs">Moneyline</SelectItem>
              <SelectItem value="Spread" className="text-white text-xs">Spread</SelectItem>
              <SelectItem value="Total" className="text-white text-xs">Total (O/U)</SelectItem>
              <SelectItem value="PROP" className="text-white text-xs">Player Props</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Min EV</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-400">{minEV}%</span>
            <Slider
              value={[minEV]}
              onValueChange={(value) => setMinEV(value[0])}
              max={50}
              min={0}
              step={1}
              className="w-20"
            />
          </div>
        </div>


        <div>
          <label className="block text-xs text-gray-400 mb-1">Search</label>
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white text-xs h-8"
          />
        </div>
      </div>

      {/* Upcoming Games Panel - Show when upcoming-games tab is active */}
      {activeTab === 'upcoming-games' ? (
        <div className="px-4 py-6">
          <UpcomingGamesPanel 
            maxGames={50}
            showFilters={true}
            onGameSelect={(game) => {
              console.log('Selected upcoming game:', game);
              // Could potentially switch to the game's odds in the main terminal
            }}
          />
        </div>
      ) : (
        <>
          {/* Data Table - Desktop */}
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-200px)] hidden lg:block">
        <table className="w-full text-xs min-w-[1400px]">
          {/* Table Header */}
          <thead className="bg-gray-900 sticky top-0">
            <tr className="border-b border-gray-700">
              <th className="text-left p-3 text-gray-400 font-normal">EVENT</th>
              <th className="text-left p-3 text-gray-400 font-normal">LEAGUE</th>
              <th className="text-left p-3 text-gray-400 font-normal">PROP</th>
              <th className="text-left p-3 text-gray-400 font-normal">MARKET</th>
              <th className="text-center p-3 text-gray-400 font-normal">MY ODDS</th>
              <th className="text-center p-3 text-gray-400 font-normal">WIN PROB</th>
              <th className="text-center p-3 text-gray-400 font-normal">+EV%</th>
              <th className="text-left p-3 text-gray-400 font-normal">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium">FIELD ODDS</div>
                  <div className="fo-wrap">
                    <div className="fo-header">
                      {BOOK_ORDER.map((book) => (
                        <div className="fo-slot" key={book} title={BOOK_DISPLAY_NAMES[book]}>
                          <div className="book-text">{BOOK_DISPLAY_NAMES[book]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {filteredOpportunities.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  {isLoadingOpportunities ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                      Loading opportunities...
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-gray-500" />
                      <p>No opportunities found matching your criteria</p>
                      <p className="text-sm">Try adjusting your filters or search terms</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredOpportunities.map((opp, index) => (
                <tr key={opp.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                  {/* 1. Event */}
                  <td className="p-3">
                    <div className="text-white">
                      {opp.event || opp.game}
                    </div>
                    <div className="text-gray-400 text-xs flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                          opp.category === 'live' ? 'bg-red-500 text-white animate-pulse' : 
                        opp.category === 'upcoming' ? 'bg-blue-500 text-white' : 
                        opp.category === 'final' ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
                      }`}>
                          {opp.category.toUpperCase()}
                      </span>
                      {opp.gameTime && opp.category === 'upcoming' && (
                        <span className="text-blue-400 whitespace-nowrap">
                          {formatTimeUntilGame(opp.gameTime)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 2. League */}
                  <td className="p-3 text-gray-300">{normalizeSportName(opp.league || opp.sport)}</td>

                  {/* 3. Prop - Show specific bet details */}
                  <td className="p-3">
                    <div className="text-white">
                      {opp.prop || opp.betType}
                    </div>
                    {opp.line && (
                      <div className="text-gray-400 text-xs">Line: {opp.line}</div>
                    )}
                  </td>

                  {/* 4. Market - Show bet category */}
                  <td className="p-3 text-gray-300">
                    {opp.market || opp.betType}
                  </td>

                  {/* 5. My Odds - DUAL FORMAT (Decimal + American) */}
                  <td className="p-3 text-center">
                    <div className="bg-blue-600 text-white px-3 py-1 rounded font-medium">
                      {(() => {
                        const rawOdds = opp.myOdds || opp.mainBookOdds;
                        let decimal: string;
                        
                        // Smart detection: Check if we already have decimal odds
                        if (rawOdds && rawOdds > 0 && rawOdds < 1000) {
                          // These look like decimal odds already (1.01 to 999.99 range)
                          decimal = Number(rawOdds).toFixed(2);
                        } else {
                          // These might be American odds, convert them
                          decimal = americanToDecimal(rawOdds) || '1.00';
                        }
                        
                        // Get American odds
                        const american = decimalToAmerican(parseFloat(decimal));
                        
                        return (
                          <div className="flex flex-col">
                            <div className="text-sm font-bold">{decimal}</div>
                            <div className="text-xs opacity-80">{american || 'N/A'}</div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{primaryBook}</div>
                  </td>

                  {/* 6. Win Probability */}
                  <td className="p-3 text-center text-green-400 font-medium">
                    {opp.winProbability ? `${opp.winProbability}%` : `${opp.hit}%`}
                  </td>

                  {/* 7. +EV% */}
                  <td className="p-3 text-center">
                    <span className={getEVColor(opp.evPercentage || opp.ev)}>
                      {typeof (opp.evPercentage || opp.ev) === 'number' ? 
                        `${(opp.evPercentage || opp.ev) > 0 ? '+' : ''}${(opp.evPercentage || opp.ev).toFixed(1)}%` : 
                        'N/A'
                      }
                    </span>
                  </td>

                  {/* 8. Field Odds */}
                  <td className="p-3">
                    <div className="fo-wrap">
                      <div className="fo-grid">
                        {BOOK_ORDER.map((book) => {
                          const bookOdds = opp.oddsComparison?.find(b => b.sportsbook === book);
                          if (!bookOdds) {
                            // true gap (empty slot) to keep alignment
                            return <div className="fo-slot fo-slot--empty" key={book} aria-hidden="true" />;
                          }
                          
                          // Smart decimal detection: Check if we already have decimal odds
                          let decimal: string;
                          if ((bookOdds as any).decimal != null) {
                            // Use pre-existing decimal value
                            decimal = String((bookOdds as any).decimal);
                          } else if (bookOdds.odds && bookOdds.odds > 0 && bookOdds.odds < 1000) {
                            // These look like decimal odds already
                            decimal = Number(bookOdds.odds).toFixed(2);
                          } else {
                            // Convert from American to decimal
                            decimal = americanToDecimal(bookOdds.odds) || '1.00';
                          }
                          
                          // Get American odds for dual display
                          const american = decimalToAmerican(parseFloat(decimal));
                          
                          // Dual format odds pill
                          return (
                            <div className="fo-slot" key={book}>
                              <div className="fo-stack">
                                <button
                                  onClick={() => window.open(bookOdds.url || `https://sportsbook.${bookOdds.sportsbook.toLowerCase().replace(' ', '')}.com`, '_blank', 'noopener,noreferrer')}
                                  className="odds-pill--compact text-center transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer bg-gray-700 hover:bg-gray-600 text-gray-100 flex flex-col py-1 px-2"
                                  title={`Bet on ${bookOdds.sportsbook} - ${decimal} (${american})`}
                                >
                                  <div className="text-xs font-bold leading-tight">{decimal}</div>
                                  <div className="text-[10px] opacity-75 leading-tight">{american || 'N/A'}</div>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

      {/* Mobile Card Layout */}
      <div className="lg:hidden">
        {filteredOpportunities.length === 0 ? (
          <div className="text-center py-8 text-gray-400 px-4">
            {isLoadingOpportunities ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                Loading opportunities...
          </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-gray-500" />
                <p>No opportunities found matching your criteria</p>
                <p className="text-sm">Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-2 space-y-3">
            {filteredOpportunities.map((opp) => (
              <div key={opp.id || `${opp.game}-${opp.market}-${opp.betType}`} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium text-sm">{opp.game}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        opp.category === 'live' ? 'bg-red-500 text-white animate-pulse' : 
                        opp.category === 'upcoming' ? 'bg-blue-500 text-white' : 
                        opp.category === 'final' ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
                      }`}>
                        {opp.category.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">{normalizeSportName(opp.sport)} • {opp.market}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${getEVColor(opp.ev)}`}>
                      {typeof opp.ev === 'number' ? 
                        `${opp.ev > 0 ? '+' : ''}${opp.ev.toFixed(1)}%` : 
                        'N/A'
                      }
                    </div>
                    <p className="text-xs text-gray-400">EV</p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mb-3 text-center">
                  <div>
                    <div className="text-gray-300 text-sm">
                      {opp.impliedProbability ? Math.round(opp.impliedProbability * 1000) / 10 : 'N/A'}%
                    </div>
                    <p className="text-xs text-gray-500">Implied</p>
                  </div>
                  <div>
                    <div className="text-green-400 text-sm">{opp.hit}%</div>
                    <p className="text-xs text-gray-500">Fair</p>
                  </div>
                  <div>
                    <div className="text-gray-300 text-sm">{opp.betType}</div>
                    <p className="text-xs text-gray-500">Type</p>
                  </div>
                </div>

                {/* Sportsbooks */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">Sportsbooks</p>
                  <div className="flex flex-wrap gap-2">
                    {filterValidFieldOdds(
                      opp.fieldOdds || opp.oddsComparison.filter(book => !book.isMainBook),
                      primaryBook
                    ).slice(0, 8).map((book, i) => (
                      <button
                        key={i}
                        onClick={() => window.open(book.url || `https://sportsbook.${(book.book || book.sportsbook).toLowerCase().replace(' ', '')}.com`, '_blank', 'noopener,noreferrer')}
                        className={`flex flex-col items-center p-2 rounded min-w-[70px] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                          book.isMainBook ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                        title={`Bet on ${book.book || book.sportsbook} - ${formatOdds(book.price || book.odds)}`}
                      >
                        <div className="text-xs font-medium text-white truncate w-full text-center">{book.book || book.sportsbook}</div>
                        <div className="text-xs text-gray-300 font-medium flex flex-col">
                          {(() => {
                            const rawOdds = book.price || book.odds;
                            let decimal: string;
                            
                            // Smart detection for decimal odds
                            if (rawOdds && rawOdds > 0 && rawOdds < 1000) {
                              decimal = Number(rawOdds).toFixed(2);
                            } else {
                              decimal = americanToDecimal(rawOdds) || '1.00';
                            }
                            
                            const american = decimalToAmerican(parseFloat(decimal));
                            
                            return (
                              <>
                                <div className="font-bold">{decimal}</div>
                                <div className="opacity-75 text-[10px]">{american || 'N/A'}</div>
                              </>
                            );
                          })()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {typeof book.ev === 'number' ? 
                            `${book.ev > 0 ? '+' : ''}${book.ev.toFixed(0)}%` : 
                            'N/A'
                          }
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Status */}
      <div className="px-4 py-2 bg-gray-900 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <span>Showing {filteredOpportunities.length} of {opportunities.length} opportunities</span>
          <span>Last updated: {formatTimeAgo(lastRefresh.toISOString())}</span>
        </div>
      </div>

        </>
      )}
    </div>
  );
}
