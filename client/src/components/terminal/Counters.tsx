import React from 'react';

interface CountersProps {
  counts: {
    books: number;
    ev: number;
    arb: number;
    mid: number;
  };
}

export const Counters: React.FC<CountersProps> = ({ counts }) => {
  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-slate-800 border-b border-slate-700">
      {/* Books Counter */}
      <div className="px-3 py-1.5 bg-slate-700 rounded-full border border-slate-600">
        <span className="text-slate-300 text-sm font-medium">
          Books {counts.books}
        </span>
      </div>
      
      {/* +EV Counter */}
      <div className="px-3 py-1.5 bg-green-900/30 rounded-full border border-green-700/50">
        <span className="text-green-400 text-sm font-medium">
          +EV {counts.ev}
        </span>
      </div>
      
      {/* Arbitrage Counter */}
      <div className="px-3 py-1.5 bg-blue-900/30 rounded-full border border-blue-700/50">
        <span className="text-blue-400 text-sm font-medium">
          Arb {counts.arb}
        </span>
      </div>
      
      {/* Middling Counter */}
      <div className="px-3 py-1.5 bg-yellow-900/30 rounded-full border border-yellow-700/50">
        <span className="text-yellow-400 text-sm font-medium">
          Mid {counts.mid}
        </span>
      </div>
    </div>
  );
};
