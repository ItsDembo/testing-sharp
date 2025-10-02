import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BookSelectionContextType {
  primaryBook: string;
  setPrimaryBook: (book: string) => void;
  availableBooks: string[];
  setAvailableBooks: (books: string[]) => void;
}

const BookSelectionContext = createContext<BookSelectionContextType | undefined>(undefined);

export function BookSelectionProvider({ children }: { children: ReactNode }) {
  const [primaryBook, setPrimaryBook] = useState("FanDuel");
  const [availableBooks, setAvailableBooks] = useState<string[]>([
    "FanDuel", "DraftKings", "BetMGM", "Caesars", "PointsBet", "BetRivers", "Hard Rock", 
    "ESPN Bet", "Fanatics", "Unibet", "William Hill", "Bet365", "Bovada", "BetOnline", 
    "SugarHouse", "SportingBet", "Sporting Interaction", "SportZino", "SportTrade", "PuntNow"
  ]);

  return (
    <BookSelectionContext.Provider value={{
      primaryBook,
      setPrimaryBook,
      availableBooks,
      setAvailableBooks
    }}>
      {children}
    </BookSelectionContext.Provider>
  );
}

export function useBookSelection() {
  const context = useContext(BookSelectionContext);
  if (context === undefined) {
    throw new Error('useBookSelection must be used within a BookSelectionProvider');
  }
  return context;
}
