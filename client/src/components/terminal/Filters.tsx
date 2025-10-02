import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { MoreHorizontal, RotateCcw, RefreshCw, Pause, Play } from 'lucide-react';

interface FiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  marketFilter: string;
  onMarketFilterChange: (value: string) => void;
  sportFilter: string;
  onSportFilterChange: (value: string) => void;
  evThreshold: number;
  onEvThresholdChange: (value: number) => void;
  isPaused: boolean;
  onPauseToggle: () => void;
  onRefresh: () => void;
  onReset: () => void;
  activeBookGroup: string;
  lastUpdateTime: string;
}

export const Filters: React.FC<FiltersProps> = ({
  search,
  onSearchChange,
  marketFilter,
  onMarketFilterChange,
  sportFilter,
  onSportFilterChange,
  evThreshold,
  onEvThresholdChange,
  isPaused,
  onPauseToggle,
  onRefresh,
  onReset,
  activeBookGroup,
  lastUpdateTime
}) => {
  const markets = ['All Markets', 'Moneyline', 'Spread', 'Total', 'Player Props'];
  const sports = ['All', 'NFL', 'NBA', 'MLB', 'NHL', 'Soccer', 'Tennis', 'Golf', 'MMA'];

  return (
    <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 space-y-4">
      {/* Top Row: Search and Dropdowns */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>
        
        {/* Market Dropdown */}
        <div className="flex items-center gap-2">
          <Label htmlFor="market-filter" className="text-slate-300 text-sm whitespace-nowrap">
            Markets:
          </Label>
          <select
            id="market-filter"
            value={marketFilter}
            onChange={(e) => onMarketFilterChange(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-3 py-1.5"
          >
            {markets.map(market => (
              <option key={market} value={market}>{market}</option>
            ))}
          </select>
        </div>
        
        {/* Sport Dropdown */}
        <div className="flex items-center gap-2">
          <Label htmlFor="sport-filter" className="text-slate-300 text-sm whitespace-nowrap">
            Sports:
          </Label>
          <select
            id="sport-filter"
            value={sportFilter}
            onChange={(e) => onSportFilterChange(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-3 py-1.5"
          >
            {sports.map(sport => (
              <option key={sport} value={sport}>{sport}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Bottom Row: EV Slider and Controls */}
      <div className="flex items-center justify-between">
        {/* EV Slider */}
        <div className="flex items-center gap-3">
          <Label htmlFor="ev-slider" className="text-slate-300 text-sm whitespace-nowrap">
            EV%:
          </Label>
          <input
            id="ev-slider"
            type="range"
            min="0"
            max="20"
            step="0.1"
            value={evThreshold}
            onChange={(e) => onEvThresholdChange(parseFloat(e.target.value))}
            className="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
          />
          <span className="text-green-400 text-sm font-medium min-w-[3rem]">
            +{evThreshold.toFixed(1)}%
          </span>
        </div>
        
        {/* Control Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onPauseToggle}
            className={`hover:bg-slate-700 ${
              isPaused ? 'text-green-400 hover:text-green-300' : 'text-orange-400 hover:text-orange-300'
            }`}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          
          {/* Timer Indicator */}
          <div className="text-slate-400 text-sm font-mono">
            {lastUpdateTime}
          </div>
        </div>
      </div>
      
      {/* Active Book Group */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm">Active:</span>
        <div className="px-3 py-1 bg-slate-700 rounded-full border border-slate-600">
          <span className="text-slate-300 text-sm font-medium">
            {activeBookGroup}
          </span>
        </div>
      </div>
    </div>
  );
};
