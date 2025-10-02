import React from 'react';

export const Header: React.FC = () => {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-700">
      {/* Left: Dot + Title */}
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
        <h1 className="text-xl font-bold text-white tracking-wider">
          TRADING TERMINAL
        </h1>
      </div>
      
      {/* Center: Preset Terminal */}
      <div className="text-center">
        <span className="text-slate-400 text-sm font-medium">
          PRESET TERMINAL (SOON)
        </span>
      </div>
      
      {/* Right: Logo Cluster (optional) */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-slate-800 rounded-lg border border-slate-600"></div>
        <div className="w-8 h-8 bg-slate-800 rounded-lg border border-slate-600"></div>
      </div>
    </div>
  );
};
