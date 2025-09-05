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
          "flex items-center gap-2 px-3 py-2.5 h-[48px] rounded-full border text-sm transition-all duration-300",
          isAnnual 
            ? "border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 opacity-100" 
            : "border-transparent bg-transparent text-transparent opacity-0"
        )}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#D8AC35]"></div>
          Save 2 months
        </div>
      </div>
    </div>
  );
}
