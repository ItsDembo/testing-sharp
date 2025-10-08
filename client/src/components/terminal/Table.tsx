import React from 'react';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { formatEV, formatProbability, getCategoryColor } from '../../lib/bettingMath';

interface Opportunity {
  id: string;
  category: 'ev' | 'arb' | 'mid' | 'neutral';
  event: {
    home: string;
    away: string;
    league: string;
    startTime: string;
    status: 'live' | 'pre';
  };
  market: {
    type: string;
    side: string;
    line?: number;
    player?: string;
  };
  hitPercent?: number;
  evPercent: number;
  impliedProbability?: number;
  trueProbability?: number;
  vig?: number;
  myPrice: {
    odds: number;
    book: string;
    url?: string;
  };
  fairOdds: number;
  fieldPrices: Array<{
    book: string;
    odds: number;
    line?: number;
    url?: string;
  }>;
  arbitrageInfo?: {
    type: '2-way' | '3-way';
    roi: number;
    stakeSplit: number[];
    guaranteedProfit: number;
  };
  middlingInfo?: {
    size: number;
    potentialProfit: number;
    risk: number;
  };
  lastUpdateMs: number;
}

interface TableProps {
  opportunities: Opportunity[];
  onRowClick?: (opportunity: Opportunity) => void;
}

const formatAmericanOdds = (odds: number): string => {
  return odds > 0 ? `+${odds}` : `${odds}`;
};

const getBookCode = (bookName: string): string => {
  const codes: { [key: string]: string } = {
    'FanDuel': 'FD',
    'DraftKings': 'DK',
    'BetMGM': 'MGM',
    'Caesars': 'CZR',
    'BetRivers': 'BR',
    'ESPN BET': 'ESPN',
    'Fanatics': 'FAN',
    'Fliff': 'FLIFF',
    'PrizePicks': 'PP',
    'Underdog': 'UD',
    'Bettr': 'BETTR',
    'Bet365': '365',
    'Pinnacle': 'PIN',
    'Bovada': 'BOV',
    'BetOnline': 'BO'
  };
  return codes[bookName] || bookName.substring(0, 3).toUpperCase();
};

const getCategoryBadge = (category: string) => {
  switch (category) {
    case 'ev':
      return <Badge className="bg-green-600 text-white text-xs">+EV</Badge>;
    case 'arb':
      return <Badge className="bg-blue-600 text-white text-xs">Arb</Badge>;
    case 'mid':
      return <Badge className="bg-yellow-600 text-white text-xs">Mid</Badge>;
    default:
      return <Badge className="bg-slate-600 text-white text-xs">{category}</Badge>;
  }
};

const getStatusDisplay = (status: string, lastUpdateMs: number) => {
  if (lastUpdateMs > 90000) {
    return (
      <div className="text-center">
        <div className="text-orange-400 text-xs font-medium">UPDATING...</div>
        <div className="text-slate-400 text-xs">{Math.floor(lastUpdateMs / 1000)}s ago</div>
      </div>
    );
  }
  
  return (
    <div className="text-center">
      <div className={`text-xs font-medium ${
        status === 'live' ? 'text-red-400' : 'text-slate-400'
      }`}>
        {status === 'live' ? 'LIVE' : 'PRE'}
      </div>
      <div className="text-slate-400 text-xs">{Math.floor(lastUpdateMs / 1000)}s ago</div>
    </div>
  );
};

export const Table: React.FC<TableProps> = ({ opportunities, onRowClick }) => {
  if (opportunities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        No opportunities found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
          <tr>
            <th className="text-left p-3 text-slate-300 font-medium">CAT</th>
            <th className="text-left p-3 text-slate-300 font-medium">EVENT</th>
            <th className="text-left p-3 text-slate-300 font-medium">PROP</th>
            <th className="text-right p-3 text-slate-300 font-medium">IMPLIED %</th>
            <th className="text-right p-3 text-slate-300 font-medium">TRUE %</th>
            <th className="text-right p-3 text-slate-300 font-medium">+EV %</th>
            <th className="text-center p-3 text-slate-300 font-medium">MY ODDS</th>
            <th className="text-center p-3 text-slate-300 font-medium">FAIR ODDS</th>
            <th className="text-left p-3 text-slate-300 font-medium">FIELD ODDS</th>
            <th className="text-center p-3 text-slate-300 font-medium">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp, index) => (
            <tr
              key={opp.id}
              onClick={() => onRowClick?.(opp)}
              className={`border-b border-slate-700 hover:bg-slate-700/50 cursor-pointer ${
                index % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/50'
              }`}
            >
              {/* CAT */}
              <td className="p-3">
                {getCategoryBadge(opp.category)}
                {opp.arbitrageInfo && (
                  <div className="text-xs text-blue-400 mt-1">
                    ROI: {opp.arbitrageInfo.roi.toFixed(2)}%
                  </div>
                )}
                {opp.middlingInfo && (
                  <div className="text-xs text-yellow-400 mt-1">
                    Size: {opp.middlingInfo.size}
                  </div>
                )}
              </td>
              
              {/* EVENT */}
              <td className="p-3">
                <div>
                  <div className="font-medium text-white">
                    {opp.event.home} vs {opp.event.away}
                  </div>
                  <div className="text-slate-400 text-xs">
                    {opp.event.league.toUpperCase()} {opp.event.status === 'live' ? 'LIVE' : 'PRE'} {formatDistanceToNow(new Date(opp.event.startTime), { addSuffix: true })}
                  </div>
                </div>
              </td>
              
              {/* PROP */}
              <td className="p-3">
                <div className="text-white">
                  {opp.market.player ? (
                    <div>
                      <div className="font-medium">{opp.market.player}</div>
                      <div className="text-slate-400 text-xs">{opp.market.type}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">{opp.market.side}</div>
                      <div className="text-slate-400 text-xs">
                        {opp.market.type} {opp.market.line !== undefined ? opp.market.line : ''}
                      </div>
                    </div>
                  )}
                </div>
              </td>
              
              {/* IMPLIED % */}
              <td className="p-3 text-right">
                {opp.impliedProbability ? (
                  <span className="text-slate-300 font-medium">
                    {formatProbability(opp.impliedProbability)}
                  </span>
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </td>
              
              {/* TRUE % */}
              <td className="p-3 text-right">
                {opp.trueProbability ? (
                  <div>
                    <span className="text-white font-medium">
                      {formatProbability(opp.trueProbability)}
                    </span>
                    {opp.vig && (
                      <div className="text-slate-400 text-xs">
                        Vig: {formatProbability(opp.vig)}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </td>
              
              {/* +EV % */}
              <td className="p-3 text-right">
                <span className={`font-medium ${getCategoryColor(opp.category)}`}>
                  {formatEV(opp.evPercent)}
                </span>
              </td>
              
              {/* MY ODDS */}
              <td className="p-3 text-center">
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded border border-slate-600">
                  <span className="text-slate-300 text-xs font-medium">
                    {getBookCode(opp.myPrice.book)}
                  </span>
                  <span className="text-white text-xs font-bold">
                    {formatAmericanOdds(opp.myPrice.odds)}
                  </span>
                </div>
              </td>
              
              {/* FAIR ODDS */}
              <td className="p-3 text-center">
                <div className="text-center">
                  <div className="text-white font-medium">
                    {formatAmericanOdds(opp.fairOdds)}
                  </div>
                  <div className="text-slate-400 text-xs">Fair = no-vig</div>
                </div>
              </td>
              
              {/* FIELD ODDS */}
              <td className="p-3">
                <div className="space-y-1">
                  {opp.fieldPrices.slice(0, 3).map((price, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 font-medium">
                        {getBookCode(price.book)}
                      </span>
                      <span className="text-white">
                        {formatAmericanOdds(price.odds)}
                      </span>
                      {price.line !== undefined && (
                        <span className="text-slate-500">
                          {price.line > 0 ? '+' : ''}{price.line}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </td>
              
              {/* STATUS */}
              <td className="p-3">
                {getStatusDisplay(opp.event.status, opp.lastUpdateMs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
