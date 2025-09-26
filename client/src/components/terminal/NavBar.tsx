import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useTerminalFilters } from './filters/store';

interface NavBarProps {
  activeTab: 'ev' | 'arb' | 'mid';
  onTabChange: (tab: 'ev' | 'arb' | 'mid') => void;
}

export default function NavBar({ activeTab, onTabChange }: NavBarProps) {
  const { query, setQuery } = useTerminalFilters();
  
  return (
    <div className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur border-b border-gray-800">
      <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <div className="text-[#D8AC35] font-extrabold tracking-widest text-lg select-none">
          SHARP SHOT
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as any)} className="ml-4">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="ev" className="data-[state=active]:bg-[#1f2937]">+EV</TabsTrigger>
            <TabsTrigger value="arb" className="data-[state=active]:bg-[#1f2937]">Arbitrage</TabsTrigger>
            <TabsTrigger value="mid" className="data-[state=active]:bg-[#1f2937]">Middling</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="ml-auto w-[420px]">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams, players, leagues..."
            className="bg-gray-900 border-gray-800 focus-visible:ring-[#D8AC35] text-gray-100 placeholder:text-gray-500"
          />
        </div>
      </div>
    </div>
  );
}

