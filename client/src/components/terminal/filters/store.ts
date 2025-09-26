import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TerminalFiltersState {
  // Filter selections
  leagues: string[];
  markets: string[];
  propTypes: string[];
  statTypes: string[];
  sportsbooks: string[];
  ouMode: 'all' | 'over' | 'under';
  timing: 'all' | 'prematch' | 'live';

  // Numeric filters
  oddsMin: number;
  oddsMax: number;
  evThreshold: number;
  minSamples: number;

  // Book and search
  myBook: string | null;
  query: string;

  // Display options
  showLineDiscrepancies: boolean;

  // UI state
  dismissedMyBookTip: boolean;
}

interface TerminalFiltersActions {
  // Setters
  setLeagues: (leagues: string[]) => void;
  setMarkets: (markets: string[]) => void;
  setPropTypes: (propTypes: string[]) => void;
  setStatTypes: (statTypes: string[]) => void;
  setSportsbooks: (sportsbooks: string[]) => void;
  setOuMode: (mode: 'all' | 'over' | 'under') => void;
  setTiming: (timing: 'all' | 'prematch' | 'live') => void;
  setOddsMin: (min: number) => void;
  setOddsMax: (max: number) => void;
  setEvThreshold: (threshold: number) => void;
  setMinSamples: (samples: number) => void;
  setMyBook: (book: string | null) => void;
  setQuery: (query: string) => void;
  setShowLineDiscrepancies: (show: boolean) => void;
  dismissTip: () => void;

  // Array helpers
  addLeague: (league: string) => void;
  removeLeague: (league: string) => void;
  addMarket: (market: string) => void;
  removeMarket: (market: string) => void;
  addPropType: (propType: string) => void;
  removePropType: (propType: string) => void;
  addStatType: (statType: string) => void;
  removeStatType: (statType: string) => void;
  addSportsbook: (sportsbook: string) => void;
  removeSportsbook: (sportsbook: string) => void;

  // Reset
  resetAll: () => void;
}

const defaultState: TerminalFiltersState = {
  leagues: [],
  markets: [],
  propTypes: [],
  statTypes: [],
  sportsbooks: [],
  ouMode: 'all',
  timing: 'all',
  oddsMin: -500,
  oddsMax: 500,
  evThreshold: 0,
  minSamples: 0,
  myBook: null,
  query: '',
  showLineDiscrepancies: true,
  dismissedMyBookTip: false,
};

export const useTerminalFilters = create<TerminalFiltersState & TerminalFiltersActions>()(
  persist(
    (set, get) => ({
      // State
      ...defaultState,
      
      // Actions
      setLeagues: (leagues) => set({ leagues }),
      setMarkets: (markets) => set({ markets }),
      setPropTypes: (propTypes) => set({ propTypes }),
      setStatTypes: (statTypes) => set({ statTypes }),
      setSportsbooks: (sportsbooks) => set({ sportsbooks }),
      setOuMode: (ouMode) => set({ ouMode }),
      setTiming: (timing) => set({ timing }),
      setOddsMin: (oddsMin) => {
        const { oddsMax } = get();
        // Ensure min <= max
        set({ oddsMin: Math.min(oddsMin, oddsMax) });
      },
      setOddsMax: (oddsMax) => {
        const { oddsMin } = get();
        // Ensure min <= max
        set({ oddsMax: Math.max(oddsMax, oddsMin) });
      },
      setEvThreshold: (evThreshold) => set({ evThreshold }),
      setMinSamples: (minSamples) => set({ minSamples }),
      setMyBook: (myBook) => set({ myBook }),
      setQuery: (query) => set({ query }),
      setShowLineDiscrepancies: (showLineDiscrepancies) => set({ showLineDiscrepancies }),
      dismissTip: () => set({ dismissedMyBookTip: true }),
      
      // Array helpers
      addLeague: (league) => set((state) => ({
        leagues: state.leagues.includes(league) ? state.leagues : [...state.leagues, league]
      })),
      removeLeague: (league) => set((state) => ({
        leagues: state.leagues.filter(l => l !== league)
      })),
      addMarket: (market) => set((state) => ({
        markets: state.markets.includes(market) ? state.markets : [...state.markets, market]
      })),
      removeMarket: (market) => set((state) => ({
        markets: state.markets.filter(m => m !== market)
      })),
      addPropType: (propType) => set((state) => ({
        propTypes: state.propTypes.includes(propType) ? state.propTypes : [...state.propTypes, propType]
      })),
      removePropType: (propType) => set((state) => ({
        propTypes: state.propTypes.filter(pt => pt !== propType)
      })),
      addStatType: (statType) => set((state) => ({
        statTypes: state.statTypes.includes(statType) ? state.statTypes : [...state.statTypes, statType]
      })),
      removeStatType: (statType) => set((state) => ({
        statTypes: state.statTypes.filter(st => st !== statType)
      })),
      addSportsbook: (sportsbook) => set((state) => ({
        sportsbooks: state.sportsbooks.includes(sportsbook) ? state.sportsbooks : [...state.sportsbooks, sportsbook]
      })),
      removeSportsbook: (sportsbook) => set((state) => ({
        sportsbooks: state.sportsbooks.filter(sb => sb !== sportsbook)
      })),

      // Reset
      resetAll: () => set(defaultState),
    }),
    {
      name: 'terminal-filters',
      partialize: (state) => ({
        leagues: state.leagues,
        markets: state.markets,
        propTypes: state.propTypes,
        ouMode: state.ouMode,
        timing: state.timing,
        evThreshold: state.evThreshold,
        minSamples: state.minSamples,
        myBook: state.myBook,
        dismissedMyBookTip: state.dismissedMyBookTip,
        // Don't persist query or odds range
      }),
    }
  )
);

// Enhanced filter data for comprehensive functionality
export const MOCK_LEAGUES = ['NFL', 'NCAAF', 'NBA', 'NCAAB', 'MLB', 'NHL', 'EPL', 'UFC', 'WNBA', 'MLS', 'SOCCER', 'CFL'];
export const MOCK_MARKETS = ['Moneyline', 'Spread', 'Total', 'Run Line', 'Team Total', 'Alt Spread', 'Alt Total', 'Player Props', 'Team Props', 'Game Props'];
export const MOCK_PROP_TYPES = ['Player Props', 'Team Props', 'Game Props'];
export const MOCK_STAT_TYPES = ['Over/Under', 'Moneyline', 'Run Line', 'Total Bases', 'Hits', 'RBIs', 'Strikeouts', 'Home Runs'];
export const MOCK_BOOKS = [
  'DraftKings', 'FanDuel', 'BetMGM', 'Caesars', 'BetRivers', 'ESPN BET',
  'Fanatics', 'Bet365', 'Pinnacle', 'Bovada', 'BetOnline', 'William Hill',
  'MGM', 'SPORTS_INTERACTION', 'SugarHouse', 'BET_365', 'FANATICS'
];

// Utility functions
export const formatOddsWithProbability = (odds: number): string => {
  const probability = oddsToImpliedProbability(odds);
  return `${probability.toFixed(1)}%`;
};

export const oddsToImpliedProbability = (odds: number): number => {
  if (odds > 0) {
    return (100 / (odds + 100)) * 100;
  } else {
    return (Math.abs(odds) / (Math.abs(odds) + 100)) * 100;
  }
};