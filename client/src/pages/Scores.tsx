import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Trophy, Calendar, Clock, TrendingUp } from 'lucide-react';
import { useScores } from '@/hooks/useScores';
import { TickerTape } from '@/components/TickerTape';

interface GameScore {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  competition: string;
  gameTime: string;
  final: boolean;
}

export default function Scores() {
  const [selectedSport, setSelectedSport] = useState("all");
  const [timeFilter, setTimeFilter] = useState("today");

  // Fetch scores data for ticker
  const { items: tickerItems, loading: tickerLoading } = useScores({ preferUpcomingIfNoLive: true });

  // Fetch scores data from consolidated API
  const { data: scoresData, isLoading: isLoadingScores, error: scoresError, refetch } = useQuery({
    queryKey: ['/api/consolidated', { sport: selectedSport, timeFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSport !== "all") params.append('sport', selectedSport);
      
      const url = `/api/consolidated?${params}`;
      console.log('📊 Fetching consolidated scores from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch consolidated scores: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Consolidated scores data received:', data);
      console.log('📊 Raw games count:', data.games?.length || 0);
      
            // Helper function to get date range
      const getDateRange = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // End of week (Saturday)
        
        return { today, yesterday, weekStart, weekEnd };
      };

      // Sort games by date (newest first)
      const sortedGames = data.games?.sort((a: any, b: any) => {
        const dateA = new Date(a.startTime || a.gameTime || 0);
        const dateB = new Date(b.startTime || b.gameTime || 0);
        return dateB.getTime() - dateA.getTime();
      }) || [];

      const { today, yesterday, weekStart, weekEnd } = getDateRange();

      // Calculate counts
      const counts = {
        total: sortedGames.length || 0,
        today: sortedGames.filter((game: any) => {
          const gameDate = new Date(game.startTime || game.gameTime);
          const gameDateOnly = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
          return gameDateOnly.getTime() === today.getTime();
        }).length || 0,
        yesterday: sortedGames.filter((game: any) => {
          const gameDate = new Date(game.startTime || game.gameTime);
          const gameDateOnly = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
          return gameDateOnly.getTime() === yesterday.getTime();
        }).length || 0,
        thisWeek: sortedGames.filter((game: any) => {
          const gameDate = new Date(game.startTime || game.gameTime);
          return gameDate >= weekStart && gameDate <= weekEnd;
        }).length || 0,
        upcoming: sortedGames.filter((game: any) => game.status !== 'Final').length || 0
      };

      // Return the data with additional computed fields
      return {
        ...data,
        games: sortedGames, // Use sorted games
        finalScores: sortedGames.filter((game: any) => game.status === 'Final') || [],
        upcomingGames: sortedGames.filter((game: any) => game.status !== 'Final') || [],
        counts,
        lastUpdated: new Date().toISOString(),
        filters: {
          leagues: Array.from(new Set(sortedGames.map((game: any) => game.league) || [])),
          dateRange: { 
            oldest: sortedGames.length > 0 ? new Date(sortedGames[sortedGames.length - 1].startTime || sortedGames[sortedGames.length - 1].gameTime) : null,
            newest: sortedGames.length > 0 ? new Date(sortedGames[0].startTime || sortedGames[0].gameTime) : null
          }
        },
        dataSource: "Consolidated API - Live and Final Scores"
      };
      
      console.log('📊 Processed counts:', counts);
      console.log('📊 Date range:', { today: today.toDateString(), yesterday: yesterday.toDateString(), weekStart: weekStart.toDateString(), weekEnd: weekEnd.toDateString() });
    },
    refetchInterval: 60000, // Refresh every minute
    refetchOnWindowFocus: true,
    staleTime: 30000, // Data considered fresh for 30 seconds
  });

  const formatScore = (homeScore: number, awayScore: number) => {
    return `${homeScore} - ${awayScore}`;
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleString();
    } catch {
      return timeString;
    }
  };

  const getScoreColor = (homeScore: number, awayScore: number, isHome: boolean) => {
    if (homeScore === awayScore) return 'text-yellow-600 dark:text-yellow-400';
    const won = isHome ? homeScore > awayScore : awayScore > homeScore;
    return won ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getWinnerIndicator = (homeScore: number, awayScore: number, isHome: boolean) => {
    if (homeScore === awayScore) return null;
    const won = isHome ? homeScore > awayScore : awayScore > homeScore;
    return won ? '🏆' : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Live Score Ticker - Right Under Navbar */}
      <TickerTape items={tickerItems} className="border-b border-gray-200 dark:border-gray-700" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="h-12 w-12 text-[#D8AC35] mr-4" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-[#D8AC35] to-orange-600 bg-clip-text text-transparent">
              Sports Scores
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Live and final scores from major sports leagues with real-time updates
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-xl">
              <Calendar className="h-5 w-5 mr-2 text-[#D8AC35]" />
              Filter & Search
            </CardTitle>
            <CardDescription>Filter scores by sport and time range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="sport-select" className="text-sm font-medium">Sport</Label>
                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sports</SelectItem>
                    <SelectItem value="mlb">MLB</SelectItem>
                    <SelectItem value="soccer">Soccer</SelectItem>
                    <SelectItem value="nfl">NFL</SelectItem>
                    <SelectItem value="nba">NBA</SelectItem>
                    <SelectItem value="nhl">NHL</SelectItem>
                    <SelectItem value="wnba">WNBA</SelectItem>
                    <SelectItem value="mma">MMA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="time-select" className="text-sm font-medium">Time Range</Label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={() => refetch()} 
                  className="w-full bg-gradient-to-r from-[#D8AC35] to-orange-600 hover:from-[#C19B2E] hover:to-orange-700 text-white font-semibold"
                  disabled={isLoadingScores}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingScores ? 'animate-spin' : ''}`} />
                  Refresh Scores
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoadingScores && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D8AC35]"></div>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading scores...</p>
          </div>
        )}

        {/* Error State */}
        {scoresError && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <div className="text-center text-red-600 dark:text-red-400">
                <p className="text-lg font-medium">Error loading scores: {scoresError.message}</p>
                <Button onClick={() => refetch()} className="mt-4 bg-red-600 hover:bg-red-700">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scores Data */}
        {scoresData && !isLoadingScores && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {scoresData.counts?.total || 0}
                    </div>
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Games</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {scoresData.counts?.today || 0}
                    </div>
                    <div className="text-sm font-medium text-green-700 dark:text-green-300">Today</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {scoresData.counts?.yesterday || 0}
                    </div>
                    <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Yesterday</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {scoresData.counts?.thisWeek || 0}
                    </div>
                    <div className="text-sm font-medium text-orange-700 dark:text-orange-300">This Week</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Scores List */}
            {scoresData.games && scoresData.games.length > 0 ? (
              <div className="space-y-6">
                {scoresData.games.map((game: any) => (
                  <Card key={game.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                            <Badge variant="outline" className="uppercase font-semibold border-[#D8AC35] text-[#D8AC35]">
                              {game.sport}
                            </Badge>
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                              {game.league}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 items-center gap-4">
                            <div className="text-right">
                              <div className="font-bold text-lg text-gray-900 dark:text-white">
                                {game.awayTeam?.city || game.awayTeam}
                                {getWinnerIndicator(game.scores?.home || game.homeScore, game.scores?.away || game.awayScore, false)}
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-3xl font-bold mb-2">
                                <span className={`${getScoreColor(game.scores?.home || game.homeScore, game.scores?.away || game.awayScore, false)} mr-2`}>
                                  {game.scores?.away || game.awayScore}
                                </span>
                                <span className="text-gray-400 font-light">-</span>
                                <span className={`${getScoreColor(game.scores?.home || game.homeScore, game.scores?.away || game.awayScore, true)} ml-2`}>
                                  {game.scores?.home || game.homeScore}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                {game.status || 'Final'}
                              </div>
                            </div>
                            
                            <div className="text-left">
                              <div className="font-bold text-lg text-gray-900 dark:text-white">
                                {getWinnerIndicator(game.scores?.home || game.homeScore, game.scores?.away || game.awayScore, true)}
                                {game.homeTeam?.city || game.homeTeam}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-500 dark:text-gray-400 ml-6 flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          {formatTime(game.startTime || game.gameTime)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                <CardContent className="pt-12 pb-12">
                  <div className="text-center">
                    <div className="text-gray-400 dark:text-gray-600 mb-6">
                      <Trophy className="mx-auto h-16 w-16" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      No Scores Available
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                      No games found for the selected filters. Try adjusting your search criteria or check back later.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Data Source Info */}
            <div className="mt-12 text-center">
              <div className="inline-flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 px-6 py-3 rounded-full backdrop-blur-sm">
                <TrendingUp className="h-4 w-4" />
                <span>Data Source: {scoresData.dataSource || "Sports Data API"}</span>
                <span>•</span>
                <span>Last Updated: {formatTime(scoresData.lastUpdated)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
