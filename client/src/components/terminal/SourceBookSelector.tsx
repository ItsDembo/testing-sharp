import React from 'react';
import { useMyBook } from '@/contexts/MyBookContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BOOKS = [
  'FanDuel', 'DraftKings', 'BetMGM', 'Caesars', 'BetRivers', 'ESPN BET', 'Fanatics',
  'Bet365', 'Bovada', 'BetOnline', 'Pinnacle'
];

export default function SourceBookSelector() {
  const { selectedBookId, setSelectedBookId } = useMyBook();

  return (
    <div className="w-full bg-black/70 border-b border-gray-800">
      <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center gap-4">
        <div className="text-gray-300 text-sm">My Sportsbook</div>
        <Select value={selectedBookId ?? undefined} onValueChange={(v) => setSelectedBookId(v)}>
          <SelectTrigger className="w-[220px] bg-gray-900 border-gray-800 text-gray-100">
            <SelectValue placeholder="All Books" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 text-gray-100 border-gray-800 max-h-80">
            <SelectItem value="">All Books</SelectItem>
            {BOOKS.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Horizontal logos */}
        <div className="hidden md:flex items-center gap-2 ml-2">
          {BOOKS.slice(0,7).map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBookId(b)}
              className={`px-3 py-1 rounded border text-xs transition ${selectedBookId===b ? 'border-[#D8AC35] text-[#D8AC35]' : 'border-gray-800 text-gray-400 hover:text-gray-200'}`}
              title={b}
            >{b}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

