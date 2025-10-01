import React, { createContext, useContext, ReactNode } from 'react';
import { useBetSlip } from '@/hooks/useBetSlip';
import { BetSlipData, EnhancedBetSlip } from '@/components/terminal/EnhancedBetSlip';

interface BetSlipContextType {
  isBetSlipOpen: boolean;
  selectedBet: BetSlipData | null;
  openBetSlip: (betData: BetSlipData) => void;
  closeBetSlip: () => void;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const betSlipState = useBetSlip();

  return (
    <BetSlipContext.Provider value={betSlipState}>
      {children}
      <EnhancedBetSlip
        isOpen={betSlipState.isBetSlipOpen}
        onClose={betSlipState.closeBetSlip}
        bet={betSlipState.selectedBet}
      />
    </BetSlipContext.Provider>
  );
}

export function useBetSlipContext() {
  const context = useContext(BetSlipContext);
  if (context === undefined) {
    throw new Error('useBetSlipContext must be used within a BetSlipProvider');
  }
  return context;
}
