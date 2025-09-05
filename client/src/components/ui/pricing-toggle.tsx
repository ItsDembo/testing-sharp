import { useState } from "react";
import { cn } from "@/lib/utils";

interface PricingToggleProps {
  onToggle: (isAnnual: boolean) => void;
  className?: string;
}

export function PricingToggle({ onToggle, className }: PricingToggleProps) {
  const [isAnnual, setIsAnnual] = useState(false);

  const handleToggle = (annual: boolean) => {
    setIsAnnual(annual);
    onToggle(annual);
  };

  return (
    <div className={cn("flex items-center justify-center relative", className)}>
      {/* Segmented Pill Toggle - Centered */}
      <div className="bg-gradient-to-r from-[#D8AC35]/20 to-[#D8AC35]/10 dark:from-[#D8AC35]/25 dark:to-[#D8AC35]/15 backdrop-blur-sm rounded-full p-1 flex w-48 relative border-2 border-[#D8AC35]/40 focus-within:ring-2 focus-within:ring-[#D8AC35]/20 group overflow-hidden">
        {/* Background shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
        
        <button
          onClick={() => handleToggle(false)}
          className={cn(
            "flex-1 py-2.5 px-4 text-sm font-bold rounded-full transition-all duration-300 z-10 relative focus:outline-none group overflow-hidden",
            !isAnnual 
              ? "bg-gradient-to-r from-[#D8AC35]/80 to-[#D8AC35]/60 shadow-lg shadow-[#D8AC35]/20 text-white border border-[#D8AC35]/60" 
              : "text-[#D8AC35] hover:text-[#D8AC35]/80 hover:bg-[#D8AC35]/10"
          )}
        >
          {!isAnnual && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out"></div>
          )}
          <span className="relative z-10">Monthly</span>
        </button>
        <button
          onClick={() => handleToggle(true)}
          className={cn(
            "flex-1 py-2.5 px-4 text-sm font-bold rounded-full transition-all duration-300 z-10 relative focus:outline-none group overflow-hidden",
            isAnnual 
              ? "bg-gradient-to-r from-[#D8AC35]/80 to-[#D8AC35]/60 shadow-lg shadow-[#D8AC35]/20 text-white border border-[#D8AC35]/60" 
              : "text-[#D8AC35] hover:text-[#D8AC35]/80 hover:bg-[#D8AC35]/10"
          )}
        >
          {isAnnual && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out"></div>
          )}
          <span className="relative z-10">Annual</span>
        </button>
      </div>
      
      {/* Save 2 Months Pill - Positioned to the right */}
      <div className="absolute left-[calc(50%+120px)] w-[120px] flex items-center justify-center">
        <div className={cn(
          "flex items-center gap-2 px-4 py-3 h-[48px] rounded-full border-2 text-sm font-bold transition-all duration-300 relative overflow-hidden group",
          isAnnual 
            ? "border-green-400 bg-green-400/10 text-green-300 shadow-lg shadow-green-400/10 opacity-100" 
            : "border-transparent bg-transparent text-transparent opacity-0"
        )}>
          {/* Shimmer effect on hover only */}
          {isAnnual && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
          )}
          <div className="w-2 h-2 rounded-full bg-green-400 relative z-10"></div>
          <span className="relative z-10">Save 2 months</span>
        </div>
      </div>
    </div>
  );
}
