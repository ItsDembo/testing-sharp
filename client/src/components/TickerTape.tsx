import React, { useMemo, useRef, useState, useEffect } from "react";
import { ScoreItem } from "@/hooks/useScores";
import clsx from "clsx";

type Props = {
  items: ScoreItem[];
  compact?: boolean;       // tighter spacing for small viewports
  showLeague?: boolean;
  className?: string;
  filterBySport?: string;  // filter to show only specific sport (e.g., "NBA", "NFL")
};

export const TickerTape: React.FC<Props> = ({
  items,
  compact = false,
  showLeague = true,
  className,
  filterBySport,
}) => {
  const laneRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const handleMouseEnter = () => {
    setIsVisible(true);
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      setAutoHideTimer(null);
    }
    laneRef.current?.style.setProperty("animation-play-state", "paused");
  };

  const handleMouseLeave = () => {
    laneRef.current?.style.setProperty("animation-play-state", "running");

    const timer = setTimeout(() => {
      setIsVisible(false);
      setAutoHideTimer(null);
    }, 15000);

    setAutoHideTimer(timer);
  };

  useEffect(() => {
    return () => {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }
    };
  }, [autoHideTimer]);

  const chips = useMemo(() => {
    let filteredItems = items;
    if (filterBySport && filterBySport !== "All Sports") {
      filteredItems = items.filter(
        (item) =>
          item.league?.toLowerCase() === filterBySport.toLowerCase()
      );
    }

    const sortedItems = [...filteredItems].sort((a, b) => {
      const priority = { LIVE: 1, FINAL: 2, UPCOMING: 3 };
      return (priority[a.status] || 4) - (priority[b.status] || 4);
    });

    return sortedItems.map((i) => ({
      key: i.id,
      away: i.away,
      home: i.home,
      awayScore: i.awayScore ?? 0,
      homeScore: i.homeScore ?? 0,
      status: i.status,
      league: i.league,
      detail: i.detail,
    }));
  }, [items, filterBySport]);

  return (
    <>
      {/* Invisible hover trigger zone */}
      <div
        className="fixed bottom-0 left-0 w-full h-12 z-40"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ pointerEvents: "auto" }}
      />

      {/* Score Ticker */}
      <div
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-50 overflow-hidden transition-transform duration-500 ease-out",
          "bg-zinc-900/95 border-t border-zinc-700 backdrop-blur-sm",
          "h-8",
          isVisible ? "translate-y-0" : "translate-y-full",
          className
        )}
      >
        <div
          ref={laneRef}
          className="flex py-1.5 ticker-content"
          aria-label="Live score ticker"
          role="marquee"
        >
          {/* Render multiple copies for seamless infinite loop */}
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="flex items-center shrink-0 gap-x-8 pr-16 ticker-segment"
            >
              {chips.map((c, index) => {
                const isFinal = c.status === "FINAL";
                const awayWon = isFinal && c.awayScore > c.homeScore;
                const homeWon = isFinal && c.homeScore > c.awayScore;
                const isTie = isFinal && c.awayScore === c.homeScore;

                return (
                  <div
                    key={`${i}-${c.key}-${index}`}
                    className={clsx(
                      "flex items-center gap-1.5 font-medium whitespace-nowrap text-xs",
                      c.status === "LIVE" && "text-red-500",
                      c.status === "FINAL" && "text-zinc-400",
                      c.status === "UPCOMING" && "text-emerald-400",
                      compact && "text-xs gap-1"
                    )}
                  >
                    {showLeague && (
                      <span className="text-zinc-500 text-xs">{c.league}</span>
                    )}
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "font-medium text-xs",
                          isFinal && awayWon && "text-green-500",
                          isFinal && homeWon && "text-red-400",
                          isFinal && isTie && "text-yellow-500",
                          c.status === "LIVE" && "text-white",
                          c.status === "UPCOMING" && "text-emerald-400"
                        )}
                      >
                        {c.away}
                      </span>

                      {c.status === "UPCOMING" ? (
                        <span className="text-zinc-500 text-xs">vs</span>
                      ) : (
                        <span
                          className={clsx(
                            "font-bold text-xs",
                            c.status === "LIVE" &&
                              "text-red-400 animate-pulse",
                            c.status === "FINAL" && "text-blue-400"
                          )}
                        >
                          {c.awayScore} - {c.homeScore}
                        </span>
                      )}

                      <span
                        className={clsx(
                          "font-medium text-xs",
                          isFinal && homeWon && "text-green-500",
                          isFinal && awayWon && "text-red-400",
                          isFinal && isTie && "text-yellow-500",
                          c.status === "LIVE" && "text-white",
                          c.status === "UPCOMING" && "text-emerald-400"
                        )}
                      >
                        {c.home}
                      </span>

                      {c.status === "LIVE" && (
                        <span className="text-red-400 text-xs font-bold animate-pulse">
                          LIVE
                        </span>
                      )}
                      {c.status === "FINAL" && (
                        <span className="text-blue-400 text-xs font-bold">
                          FINAL
                        </span>
                      )}

                      {c.detail && (
                        <span className="text-zinc-500 text-xs">
                          ({c.detail})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* CSS for continuous scrolling animation */}
        <style>{`
          .ticker-content {
            width: max-content;
            animation: tickerScroll ${Math.max(
              chips.length * 5,
              30
            )}s linear infinite;
            will-change: transform;
            white-space: nowrap;
          }

          @keyframes tickerScroll {
            from {
              transform: translateX(0%);
            }
            to {
              transform: translateX(-50%);
            }
          }

          .ticker-segment {
            min-width: fit-content;
          }

          .ticker-content:hover {
            animation-play-state: paused;
          }
        `}</style>
      </div>
    </>
  );
};
