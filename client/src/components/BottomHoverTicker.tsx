import React from "react";
import { useScores } from "@/hooks/useScores";
import { TickerTape } from "@/components/TickerTape";

export const BottomHoverTicker: React.FC = () => {
  const { items, loading } = useScores({ preferUpcomingIfNoLive: true });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <TickerTape items={items} />
    </div>
  );
};
