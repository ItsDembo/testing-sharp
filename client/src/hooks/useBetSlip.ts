import { useState } from 'react';
import { BetSlipData } from '@/components/terminal/EnhancedBetSlip';

export function useBetSlip() {
  const [isBetSlipOpen, setIsBetSlipOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState<BetSlipData | null>(null);

  const openBetSlip = (betData: BetSlipData) => {
    setSelectedBet(betData);
    setIsBetSlipOpen(true);
  };

  const closeBetSlip = () => {
    setIsBetSlipOpen(false);
    setSelectedBet(null);
  };

  return {
    isBetSlipOpen,
    selectedBet,
    openBetSlip,
    closeBetSlip
  };
}
