import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Calendar, TrendingUp, RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UpcomingGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeInitials: string;
  awayInitials: string;
  sport: string;
  league: string;
  gameTime: string;
  status: string;
  odds: Array<{
    sportsbook: string;
    betType: string;
    side: string;
    price: number;
    line?: number;
    team: string;
    lastUpdated: string;
  }>;
  hasOdds: boolean;
  timeUntilStart: {
    total: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    formatted: string;
    shortFormat: string;
  };
  formattedGameTime: string;
  isToday: boolean;
  isTomorrow: boolean;
  dayOfWeek: string;
}

interface UpcomingGamesResponse {
  upcomingGames: UpcomingGame[];
  totalGames: number;
  filters: {
    sport: string;
    league: string;
    daysAhead: number;
  };
  stats: {
    today: number;
    tomorrow: number;
    thisWeek: number;
    leagues: string[];
  };
  lastUpdated: string;
  dataSource: string;
}

interface UpcomingGamesPanelProps {
  onGameSelect?: (game: UpcomingGame) => void;
  maxGames?: number;
  showFilters?: boolean;
}

export default function UpcomingGamesPanel({ 
  onGameSelect, 
  maxGames = 20, 
  showFilters = true 
}: UpcomingGamesPanelProps) {
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [daysAhead, setDaysAhead] = useState(7);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch upcoming games data
  const { data: gamesData, isLoading, error, refetch } = useQuery<UpcomingGamesResponse>({
    queryKey: ['/api/upcoming-games', { sport: selectedSport, league: selectedLeague, daysAhead }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSport !== 'all') params.append('sport', selectedSport);
      if (selectedLeague !== 'all') params.append('league', selectedLeague);
      params.append('daysAhead', daysAhead.toString());
      
      const url = `/api/upcoming-games?${params}`;
      console.log('🎮 Fetching upcoming games from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch upcoming games: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🎮 Upcoming games data received:', data);
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 15000, // Data considered fresh for 15 seconds
  });

  // Calculate live time until start for each game
  const gamesWithLiveCountdown = gamesData?.upcomingGames.map(game => ({
    ...game,
    liveTimeUntilStart: calculateLiveTimeUntilStart(game.gameTime, currentTime)
  })) || [];

  // Limit games if maxGames is specified
  const displayGames = gamesWithLiveCountdown.slice(0, maxGames);

  const handleGameClick = (game: UpcomingGame) => {
    if (onGameSelect) {
      onGameSelect(game);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-300">Loading upcoming games...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900 rounded-lg p-6">
        <div className="text-red-400 text-center">
          <p>Error loading upcoming games</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-white">Upcoming Games</h3>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
              {gamesData?.totalGames || 0}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        {gamesData?.stats && (
          <div className="flex gap-4 mt-3 text-sm text-gray-400">
            <span>Today: <span className="text-white">{gamesData.stats.today}</span></span>
            <span>Tomorrow: <span className="text-white">{gamesData.stats.tomorrow}</span></span>
            <span>This Week: <span className="text-white">{gamesData.stats.thisWeek}</span></span>
          </div>
        )}

        {/* Filters */}
        {showFilters && gamesData?.stats.leagues && (
          <div className="flex gap-2 mt-3">
            <Select value={selectedLeague} onValueChange={setSelectedLeague}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="League" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leagues</SelectItem>
                {gamesData.stats.leagues.map(league => (
                  <SelectItem key={league} value={league}>{league}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={daysAhead.toString()} onValueChange={(value) => setDaysAhead(parseInt(value))}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Day</SelectItem>
                <SelectItem value="3">3 Days</SelectItem>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="14">14 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Games List */}
      <div className="max-h-96 overflow-y-auto">
        {displayGames.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No upcoming games found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {displayGames.map((game) => (
              <GameRow 
                key={game.id} 
                game={game} 
                onClick={() => handleGameClick(game)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800 text-xs text-gray-500">
        Last updated: {gamesData?.lastUpdated ? new Date(gamesData.lastUpdated).toLocaleTimeString() : 'Never'}
      </div>
    </div>
  );
}

// Individual game row component
function GameRow({ game, onClick }: { game: UpcomingGame & { liveTimeUntilStart?: any }, onClick: () => void }) {
  const getTimeColor = (timeUntilStart: any) => {
    if (!timeUntilStart || timeUntilStart.total <= 0) return 'text-red-400';
    if (timeUntilStart.hours < 1) return 'text-orange-400';
    if (timeUntilStart.hours < 6) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusBadge = (game: UpcomingGame) => {
    if (game.isToday) {
      return <Badge className="bg-blue-500/20 text-blue-400 text-xs">Today</Badge>;
    }
    if (game.isTomorrow) {
      return <Badge className="bg-purple-500/20 text-purple-400 text-xs">Tomorrow</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">{game.dayOfWeek}</Badge>;
  };

  return (
    <div 
      className="p-3 hover:bg-zinc-800/50 cursor-pointer border-b border-zinc-800/50 last:border-b-0"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        {/* Game Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium text-sm">
              {game.awayInitials} @ {game.homeInitials}
            </span>
            <Badge className="bg-gray-700 text-gray-300 text-xs">
              {game.league}
            </Badge>
            {getStatusBadge(game)}
          </div>
          
          <div className="text-xs text-gray-400">
            {game.awayTeam} @ {game.homeTeam}
          </div>
          
          <div className="text-xs text-gray-500 mt-1">
            {game.formattedGameTime}
          </div>
        </div>

        {/* Time Until Start */}
        <div className="text-right">
          <div className={`text-sm font-mono font-medium ${getTimeColor(game.liveTimeUntilStart)}`}>
            <Clock className="w-3 h-3 inline mr-1" />
            {game.liveTimeUntilStart?.shortFormat || game.timeUntilStart.shortFormat}
          </div>
          
          {/* Odds indicator */}
          {game.hasOdds && (
            <div className="flex items-center justify-end mt-1">
              <TrendingUp className="w-3 h-3 text-green-400 mr-1" />
              <span className="text-xs text-green-400">{game.odds.length} books</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate live time until start
function calculateLiveTimeUntilStart(gameTime: string, currentTime: Date) {
  const game = new Date(gameTime);
  const diffMs = game.getTime() - currentTime.getTime();
  
  if (diffMs <= 0) {
    return {
      total: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: 'Game has started',
      shortFormat: 'Started'
    };
  }
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  let shortFormat = '';
  
  if (days > 0) {
    shortFormat = `${days}d ${hours}h`;
  } else if (hours > 0) {
    shortFormat = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    shortFormat = `${minutes}m`;
  } else {
    shortFormat = `${seconds}s`;
  }
  
  return {
    total: diffMs,
    days,
    hours,
    minutes,
    seconds,
    shortFormat
  };
}
