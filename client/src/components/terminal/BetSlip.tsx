import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

export interface PinnedBet {
  id: string;
  description: string;
  book: string;
  odds: number;
  evPercent?: number;
  href?: string;
}

export default function BetSlip({ bet, onClear }: { bet?: PinnedBet | null; onClear: () => void }) {
  const [stake, setStake] = useState<number>(50);

  const suggested = useMemo(() => {
    // Simple fractional Kelly suggestion (1/2 Kelly)
    const p = Math.min(0.99, Math.max(0.01, (bet?.evPercent ?? 0) / 100 + 0.5)); // rough proxy
    const b = bet && bet.odds > 0 ? bet.odds / 100 : bet ? 100 / Math.abs(bet.odds) : 0;
    const kelly = ((p * (b + 1) - 1) / b) / 2; // half-Kelly
    const bankroll = 1000; // placeholder
    const rec = Math.max(0, Math.min(bankroll * kelly, bankroll));
    return Math.round(rec);
  }, [bet]);

  if (!bet) return (
    <div className="sticky top-20 w-full md:w-80 h-[calc(100vh-120px)] bg-gray-950/70 border-l border-gray-800 p-4 text-gray-400">
      <div className="text-sm">Bet Slip</div>
      <div className="mt-3 text-xs text-gray-500">Pin a bet to see details here.</div>
    </div>
  );

  return (
    <div className="sticky top-20 w-full md:w-80 h-[calc(100vh-120px)] bg-gray-950/70 border-l border-gray-800 p-4 text-gray-100">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Bet Slip</div>
        <button className="text-xs text-gray-400 hover:text-gray-200" onClick={onClear}>Clear</button>
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-[#D8AC35] text-xs">{bet.book}</div>
        <div className="text-sm leading-snug">{bet.description}</div>
        <div className="text-xs text-gray-400">Odds: {bet.odds > 0 ? `+${bet.odds}` : bet.odds}</div>
        {typeof bet.evPercent === 'number' && (
          <div className="text-xs text-gray-400">EV: {bet.evPercent.toFixed(1)}%</div>
        )}
      </div>

      <div className="mt-6">
        <label className="block text-xs text-gray-400 mb-1">Stake</label>
        <input
          type="number"
          value={stake}
          onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
          className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D8AC35]"
        />
        <div className="mt-2 text-xs text-gray-500">Suggested (Kelly 1/2): ${suggested}</div>
      </div>

      <a href={bet.href || '#'} target="_blank" rel="noreferrer">
        <Button className="mt-6 w-full bg-[#D8AC35] text-black hover:bg-[#c49a2f]">Place Bet → {bet.book}</Button>
      </a>
    </div>
  );
}

