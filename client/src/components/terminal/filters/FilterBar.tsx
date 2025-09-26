import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, RotateCcw, Check, BookOpen, ChevronDown, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useTerminalFilters, MOCK_LEAGUES, MOCK_MARKETS, MOCK_PROP_TYPES, MOCK_STAT_TYPES, MOCK_BOOKS, formatOddsWithProbability } from './store';
import { FeatureGate, useFeatureAccess } from '@/components/FeatureGate';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder: string;
  label: string;
}

function MultiSelect({ options, selected, onSelectionChange, placeholder, label }: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleSelection = (option: string) => {
    if (selected.includes(option)) {
      onSelectionChange(selected.filter(item => item !== option));
    } else {
      onSelectionChange([...selected, option]);
    }
  };

  const displayValue = selected.length === 0 
    ? placeholder 
    : `${label} (${selected.length})`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between h-10 rounded-xl"
          style={{ fontFamily: "'Rajdhani', sans-serif" }}
        >
          {displayValue}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => toggleSelection(option)}
                  className="flex items-center gap-2"
                >
                  <div className="flex items-center justify-center w-4 h-4">
                    {selected.includes(option) && <Check className="h-3 w-3" />}
                  </div>
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}

function NumberInput({ value, onChange, min = 0, max = 50, step = 1, label }: NumberInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue)) {
      onChange(Math.max(min, Math.min(max, newValue)));
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      <div className="flex items-center border rounded-xl h-10 w-24">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="px-2 py-2 hover:bg-muted transition-colors text-sm flex-1"
          disabled={value <= min}
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          className="w-12 text-center text-sm font-mono bg-transparent border-none outline-none"
          min={min}
          max={max}
        />
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="px-2 py-2 hover:bg-muted transition-colors text-sm flex-1"
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function FilterBar() {
  const {
    leagues, markets, propTypes, statTypes, sportsbooks, ouMode, timing,
    oddsMin, oddsMax, evThreshold, minSamples, myBook, query, showLineDiscrepancies,
    setLeagues, setMarkets, setPropTypes, setStatTypes, setSportsbooks, setOuMode, setTiming,
    setOddsMin, setOddsMax, setEvThreshold, setMinSamples, setMyBook, setQuery, setShowLineDiscrepancies,
    resetAll
  } = useTerminalFilters();

  const debouncedQuery = useDebounce(query, 300);

  // Handle odds range slider
  const handleOddsRangeChange = (values: number[]) => {
    setOddsMin(values[0]);
    setOddsMax(values[1]);
  };

  return (
    <div
      className="sticky top-16 z-20 bg-background/95 backdrop-blur-sm border-b"
      data-testid="filter-bar"
    >
      <div className="px-4 py-3">
        {/* Bet Category Tabs */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/30">
          <div className="flex items-center gap-1">
            <div className="flex items-center bg-blue-500 text-white rounded-lg px-3 py-2">
              <span className="text-sm font-medium">All Bets</span>
              <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">124</span>
            </div>
            <div className="flex items-center text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 cursor-pointer">
              <span className="text-sm font-medium">+EV</span>
              <span className="ml-2 text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded">96</span>
            </div>
            <div className="flex items-center text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 cursor-pointer">
              <span className="text-sm font-medium">Arbitrage</span>
              <span className="ml-2 text-xs bg-orange-500/20 text-orange-600 px-2 py-0.5 rounded">18</span>
            </div>
            <div className="flex items-center text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 cursor-pointer">
              <span className="text-sm font-medium">Middling</span>
              <span className="ml-2 text-xs bg-purple-500/20 text-purple-600 px-2 py-0.5 rounded">8</span>
            </div>
            <div className="flex items-center text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 cursor-pointer">
              <span className="text-sm font-medium">Props</span>
              <span className="ml-2 text-xs bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded">2</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs font-medium">
              Export
            </Button>
            <Button variant="outline" size="sm" className="text-xs font-medium">
              PAUSE
            </Button>
            <Button variant="outline" size="sm" className="text-xs font-medium">
              REFRESH
            </Button>
          </div>
        </div>

        {/* Compact Filter Row */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {/* League */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">League</Label>
            <MultiSelect
              options={MOCK_LEAGUES}
              selected={leagues}
              onSelectionChange={setLeagues}
              placeholder="All Leagues"
              label="Leagues"
            />
          </div>

          {/* Stat Type */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Stat Type</Label>
            <MultiSelect
              options={MOCK_STAT_TYPES}
              selected={statTypes}
              onSelectionChange={setStatTypes}
              placeholder="All Types"
              label="Stat Types"
            />
          </div>

          {/* O/U */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">O/U</Label>
            <ToggleGroup
              type="single"
              value={ouMode}
              onValueChange={(value) => value && setOuMode(value as 'all' | 'over' | 'under')}
              className="h-9"
            >
              <ToggleGroupItem value="all" className="text-xs px-3">All</ToggleGroupItem>
              <ToggleGroupItem value="over" className="text-xs px-3">Over</ToggleGroupItem>
              <ToggleGroupItem value="under" className="text-xs px-3">Under</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Min Data */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Min Data</Label>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setMinSamples(Math.max(0, minSamples - 1))}
              >
                −
              </Button>
              <span className="text-sm font-mono w-8 text-center">{minSamples}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setMinSamples(Math.min(50, minSamples + 1))}
              >
                +
              </Button>
            </div>
          </div>

          {/* Odds Range */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Odds Range</Label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={oddsMin}
                onChange={(e) => setOddsMin(parseInt(e.target.value) || -500)}
                className="w-16 px-2 py-1 text-xs border rounded bg-background text-center font-mono h-8"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="number"
                value={oddsMax}
                onChange={(e) => setOddsMax(parseInt(e.target.value) || 500)}
                className="w-16 px-2 py-1 text-xs border rounded bg-background text-center font-mono h-8"
              />
            </div>
          </div>

          {/* Sportsbooks */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Sportsbooks</Label>
            <MultiSelect
              options={MOCK_BOOKS}
              selected={sportsbooks}
              onSelectionChange={setSportsbooks}
              placeholder="All Books"
              label="Books"
            />
          </div>

          {/* Discrepancies */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Discrepancies</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="line-discrepancies"
                checked={showLineDiscrepancies}
                onCheckedChange={setShowLineDiscrepancies}
              />
              <Label htmlFor="line-discrepancies" className="text-xs">Show</Label>
            </div>
          </div>

          {/* Reset */}
          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            className="text-xs font-medium h-9"
          >
            Reset
          </Button>

          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Search</Label>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events, teams, markets..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-medium h-9"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Odds Range and EV Threshold Row */}
        <div className="flex items-center gap-8 mt-4">
          {/* Odds Range Slider */}
          <div className="flex-1">
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
              Odds Range
            </Label>
            <div className="space-y-2">
              <div className="relative">
                <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-gradient-to-r from-[#D8AC35] to-[#F4C442] rounded-full transition-all duration-200"
                    style={{
                      left: `${((oddsMin + 500) / 1000) * 100}%`,
                      width: `${(((oddsMax - oddsMin) / 1000) * 100)}%`
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={-500}
                  max={500}
                  step={50}
                  value={oddsMin}
                  onChange={(e) => setOddsMin(Math.min(parseInt(e.target.value), oddsMax - 50))}
                  className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
                />
                <input
                  type="range"
                  min={-500}
                  max={500}
                  step={50}
                  value={oddsMax}
                  onChange={(e) => setOddsMax(Math.max(parseInt(e.target.value), oddsMin + 50))}
                  className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={oddsMin}
                    onChange={(e) => setOddsMin(Math.max(-500, Math.min(parseInt(e.target.value) || -500, oddsMax - 50)))}
                    className="w-16 px-2 py-1 text-xs border rounded bg-background text-center font-mono"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="number"
                    value={oddsMax}
                    onChange={(e) => setOddsMax(Math.min(500, Math.max(parseInt(e.target.value) || 500, oddsMin + 50)))}
                    className="w-16 px-2 py-1 text-xs border rounded bg-background text-center font-mono"
                  />
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {formatOddsWithProbability(oddsMin)} • {formatOddsWithProbability(oddsMax)}
                </div>
              </div>
            </div>
          </div>

          {/* EV Threshold */}
          <div className="w-64">
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
              EV Threshold
            </Label>
            <div className="space-y-2">
              <div className="relative">
                <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-gradient-to-r from-[#D8AC35] to-[#F4C442] rounded-full transition-all duration-200"
                    style={{ width: `${(evThreshold / 20) * 100}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={0.1}
                  value={evThreshold}
                  onChange={(e) => setEvThreshold(parseFloat(e.target.value))}
                  className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={evThreshold}
                  onChange={(e) => setEvThreshold(Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)))}
                  className="w-16 px-2 py-1 text-xs border rounded bg-background text-center font-mono"
                  step={0.1}
                />
                <Badge variant="outline" className="text-xs font-mono text-[#D8AC35] border-[#D8AC35]/30">
                  ≥{evThreshold.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}