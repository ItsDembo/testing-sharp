import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import '@fontsource/press-start-2p';
import { formatInUserTimezone } from '@/lib/timezone';

interface TickerItem {
  id: string;
  text: string;
  sport: string;
  emoji: string;
  score?: string;
  status?: string;
  isLive?: boolean;
}

export function ScoresTicker() {
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const tickerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Fetch live scores data
  const { data: gamesData } = useQuery({
    queryKey: ['/api/sports/games/today'],
    refetchInterval: 30000, // Refresh every 30 seconds
  }) as { data?: { games?: any[] } };

  const { data: eventsData } = useQuery({
    queryKey: ['/api/sports/events/recent'],
    refetchInterval: 15000, // Refresh every 15 seconds for live events
  }) as { data?: { events?: any[] } };

  useEffect(() => {
    const items: TickerItem[] = [];
    const allGames: any[] = [];

    // Collect all games from both data sources
    if (gamesData?.games?.length > 0) {
      allGames.push(...gamesData.games);
    }
    if (eventsData?.events?.length > 0) {
      allGames.push(...eventsData.events);
    }

    // Categorize games by priority
    const liveGames: any[] = [];
    const recentFinalGames: any[] = [];
    const upcomingGames: any[] = [];

    allGames.forEach((game: any) => {
      const status = game.status?.toLowerCase() || '';
      const hasScores = game.team1Score !== undefined && game.team2Score !== undefined;
      const gameTime = new Date(game.time || game.date || game.gameTime);
      const now = new Date();
      const timeDiff = now.getTime() - gameTime.getTime();
      const hoursAgo = timeDiff / (1000 * 60 * 60);

      // Priority 1: Live games
      if (status === 'live' || status === 'in_progress' || status === 'active') {
        liveGames.push({ ...game, priority: 1, isLive: true });
      }
      // Priority 2: Recently ended games (within last 6 hours)
      else if ((status === 'final' || status === 'finished' || status === 'completed') && 
               hasScores && hoursAgo <= 6) {
        recentFinalGames.push({ ...game, priority: 2, isLive: false });
      }
      // Priority 3: Upcoming games (next 7 days)
      else if (timeDiff < 0 && Math.abs(timeDiff) <= 7 * 24 * 60 * 60 * 1000) {
        upcomingGames.push({ ...game, priority: 3, isLive: false });
      }
    });

    // Process games in priority order: Live → Recent Finals → Upcoming
    const processGame = (game: any) => {
      const sportEmoji = getSportEmoji(game.sport);
      
      // Format team names properly
      const awayTeam = formatTeamName(game.team1City, game.team1Name, game.awayTeam);
      const homeTeam = formatTeamName(game.team2City, game.team2Name, game.homeTeam);
      
      // Format score or time display
      let scoreDisplay = '';
      let gameText = '';
      
      if (game.priority === 1) {
        // Live games: show live score
        scoreDisplay = `${game.team1Score || 0} - ${game.team2Score || 0}`;
        gameText = `${awayTeam} @ ${homeTeam}`;
      } else if (game.priority === 2) {
        // Recent finals: show final score
        scoreDisplay = `FINAL: ${game.team1Score} - ${game.team2Score}`;
        gameText = `${awayTeam} @ ${homeTeam}`;
      } else {
        // Upcoming games: show game time
        const gameTime = new Date(game.time || game.date || game.gameTime);
        scoreDisplay = formatInUserTimezone(gameTime, 'MMM d, h:mm a');
        gameText = `${awayTeam} @ ${homeTeam}`;
      }

      return {
        id: `game-${game.gameID || game.eventID || game.id}`,
        text: gameText,
        sport: game.sport,
        emoji: sportEmoji,
        score: scoreDisplay,
        status: game.status,
        isLive: game.isLive,
        priority: game.priority
      };
    };

    // Add games in priority order
    [...liveGames, ...recentFinalGames, ...upcomingGames].slice(0, 20).forEach(game => {
      const item = processGame(game);
      items.push(item);
    });

    // Fallback if no games available
    if (items.length === 0) {
      items.push({
        id: 'loading',
        text: 'Loading live sports data...',
        sport: 'loading',
        emoji: '⚡',
        status: 'loading'
      });
    }

    console.log(`🎯 Ticker: ${liveGames.length} live, ${recentFinalGames.length} recent finals, ${upcomingGames.length} upcoming`);
    setTickerItems(items);
  }, [gamesData, eventsData]);

  // Helper function to format team names consistently
  const formatTeamName = (city: string, name: string, fallback: string): string => {
    if (city && name) {
      return `${city} ${name}`;
    } else if (name) {
      return name;
    } else if (city) {
      return city;
    } else if (fallback) {
      return fallback;
    }
    return 'Team';
  };

  const getSportEmoji = (sport: string): string => {
    const emojiMap: { [key: string]: string } = {
      'nfl': '🏈',
      'nba': '🏀',
      'mlb': '⚾',
      'nhl': '🏒',
      'soccer': '⚽',
      'football': '⚽',
      'tennis': '🎾',
      'f1': '🏎️',
      'formula1': '🏎️',
      'mma': '🥊',
      'ufc': '🥊',
      'boxing': '🥊',
      'golf': '⛳',
      'cricket': '🏏',
      'basketball': '🏀',
      'hockey': '🏒',
      'baseball': '⚾',
      'wnba': '🏀',
    };
    return emojiMap[sport?.toLowerCase()] || '🏆';
  };

  if (tickerItems.length === 0) return null;

  return (
    <>
      {/* Hover trigger zone */}
      <div 
        className="fixed bottom-0 left-0 w-full h-16 z-40 hover-trigger-zone"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      ></div>
      
      {/* Professional Stock Ticker Style Scores Ticker */}
      <div 
        ref={tickerRef}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 via-black to-gray-900 border-t-2 border-green-500/50 overflow-hidden h-14 scores-ticker transition-transform duration-500 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Ticker Container */}
        <div className="relative h-full flex items-center">
          {/* Left Gradient Fade */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-900 to-transparent z-10"></div>
          
          {/* Right Gradient Fade */}
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-900 to-transparent z-10"></div>
          
          {/* Ticker Content */}
          <div 
            className="flex items-center animate-ticker-scroll"
            style={{
              animation: `tickerScroll ${Math.max(tickerItems.length * 8, 60)}s linear infinite`
            }}
          >
            {/* Duplicate items for seamless loop */}
            {[...tickerItems, ...tickerItems, ...tickerItems].map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex items-center space-x-4 px-6 py-2 mx-2 bg-black/20 rounded-lg border border-green-500/20 hover:border-green-400/40 transition-all duration-200"
              >
                {/* Sport Icon */}
                <span className="text-lg">{item.emoji}</span>
                
                {/* Game Info */}
                <div className="flex flex-col">
                  <span className="text-green-300 text-xs font-mono tracking-wider whitespace-nowrap">
                    {item.text}
                  </span>
                  
                  {/* Score or Time */}
                  {item.score && (
                    <span className={`text-sm font-bold whitespace-nowrap ${
                      item.isLive 
                        ? 'text-red-400 animate-pulse' 
                        : item.priority === 2 
                        ? 'text-blue-400' 
                        : 'text-green-400'
                    }`}>
                      {item.score}
                    </span>
                  )}
                </div>
                
                {/* Status Indicator */}
                {item.isLive && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-400 text-xs font-bold">LIVE</span>
                  </div>
                )}
                {item.priority === 2 && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-blue-400 text-xs font-bold">FINAL</span>
                  </div>
                )}
                
                {/* Separator */}
                <div className="text-green-600 text-lg font-bold">|</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Bottom Border Glow */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>
        
        {/* Ticker Animation Styles */}
        <style>{`
          @keyframes tickerScroll {
            0% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
          
          .animate-ticker-scroll {
            animation-play-state: running;
          }
          
          .scores-ticker:hover .animate-ticker-scroll {
            animation-play-state: paused;
          }
          
          /* Responsive adjustments */
          @media (max-width: 768px) {
            .scores-ticker {
              height: 12px;
            }
            
            .px-6 {
              padding-left: 0.75rem;
              padding-right: 0.75rem;
            }
            
            .text-xs {
              font-size: 0.625rem;
            }
            
            .text-sm {
              font-size: 0.75rem;
            }
          }
          
          /* Enhanced hover effects */
          .scores-ticker:hover {
            border-color: rgba(34, 197, 94, 0.8);
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
          }
        `}</style>
      </div>
    </>
  );
}