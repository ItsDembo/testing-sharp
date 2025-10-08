import { useEffect, useMemo, useRef, useState } from "react";

export type ScoreItem = {
  id: string;                 // unique game id
  league: string;             // e.g., MLB/NBA/NHL
  home: string; away: string;
  homeScore?: number; awayScore?: number;
  status: "LIVE" | "FINAL" | "UPCOMING";
  detail?: string;            // e.g., "Bot 7th", "Q3 05:12", "7:10 PM ET"
  startTime?: string;         // ISO
};

type Options = {
  preferUpcomingIfNoLive?: boolean;
  pollMs?: number;     // fallback poll interval
};



/**
 * Uses existing consolidated API and MSN scraper for real-time scores
 * GET /api/consolidated -> Live and upcoming games with scores
 * GET /api/scores -> Final scores from AreYouWatchingThis API
 */
export function useScores(opts: Options = {}) {
  const { preferUpcomingIfNoLive = true, pollMs = 15000 } = opts;
  const [items, setItems] = useState<ScoreItem[]>([]);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // helper to compute what to display
  const displayItems = useMemo(() => items, [items]);

  useEffect(() => {
    let alive = true;
    let pollTimer: any;

    const fetchScores = async () => {
      try {
        // Try consolidated API first (includes live games)
        const consolidatedResponse = await fetch('/api/consolidated');
        if (consolidatedResponse.ok) {
          const consolidatedData = await consolidatedResponse.json();
          
          // Convert consolidated data to ScoreItem format
          const liveGames: ScoreItem[] = [];
          const upcomingGames: ScoreItem[] = [];
          
          if (consolidatedData.games) {
            consolidatedData.games.forEach((game: any) => {
              // Extract team names from the correct structure
              let homeTeam = game.homeTeam?.name ? `${game.homeTeam.city} ${game.homeTeam.name}`.trim() : game.homeTeam?.city || game.team2Name || 'Home Team';
              let awayTeam = game.awayTeam?.name ? `${game.awayTeam.city} ${game.awayTeam.name}`.trim() : game.awayTeam?.city || game.team1Name || 'Away Team';
              
              // Make sure we have valid team names
              if (!homeTeam || homeTeam === 'Home Team' || !awayTeam || awayTeam === 'Away Team') {
                // Try to extract from label if available
                if (game.label) {
                  const labelParts = game.label.split('@');
                  if (labelParts.length === 2) {
                    const awayPart = labelParts[0].trim();
                    const homePart = labelParts[1].trim();
                    if (awayPart && homePart) {
                      awayTeam = awayPart;
                      homeTeam = homePart;
                    }
                  }
                }
              }
              
              // Extract scores from the correct structure - these are the actual scores
              const homeScore = game.scores?.home || game.homeScore || game.team2Score;
              const awayScore = game.scores?.away || game.awayScore || game.team1Score;
              
              const scoreItem: ScoreItem = {
                id: game.id || game.gameID,
                league: game.league || game.sport || 'Unknown',
                home: homeTeam,
                away: awayTeam,
                homeScore: homeScore,
                awayScore: awayScore,
                status: game.isLive ? "LIVE" : game.status === 'Final' ? "FINAL" : "UPCOMING",
                detail: game.status || game.timeLeft || game.gameTime,
                startTime: game.startTime || game.gameTime || game.date
              };
              

              
              // Always add to liveGames for now to ensure we show something
              liveGames.push(scoreItem);
            });
          }
          
          if (alive) {
            if (liveGames.length > 0) {
              setItems(liveGames);
              setIsLive(true);
            } else if (preferUpcomingIfNoLive && upcomingGames.length > 0) {
              setItems(upcomingGames);
              setIsLive(false);
            } else {
              setItems([]);
              setIsLive(false);
            }
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error fetching scores:', error);
        if (alive) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchScores();

    // Set up polling
    const startPolling = () => {
      pollTimer = setTimeout(() => {
        if (alive) {
          fetchScores();
          startPolling(); // Schedule next poll
        }
      }, pollMs);
    };

    startPolling();

    return () => {
      alive = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [pollMs, preferUpcomingIfNoLive]);

  return { items: displayItems, isLive, loading };
}
