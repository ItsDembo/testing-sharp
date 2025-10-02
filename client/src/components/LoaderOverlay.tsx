import React from "react";

interface LoaderOverlayProps {
  message?: string;
  progress?: number;
}

const LoaderOverlay: React.FC<LoaderOverlayProps> = ({ 
  message = "Loading trading data...", 
  progress 
}) => {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0a] relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]" />
      
      {/* Main loader container */}
      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* Logo with animated fill */}
        <div
          className="relative w-48 h-48 overflow-hidden"
          style={{
            WebkitMask: "url('/Gold_StarLeaf_1754446394014.png') center/contain no-repeat",
            mask: "url('/Gold_StarLeaf_1754446394014.png') center/contain no-repeat",
          }}
        >
          {/* Animated gold fill with progress effect */}
          <div
            className="w-full h-full animate-[fillProgress_2s_ease-in-out_infinite]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                #FFD700,
                #FFD700 3px,
                #FFA500 3px,
                #FFA500 6px,
                #FFD700 6px,
                #FFD700 9px,
                #0A0A0A 9px,
                #0A0A0A 12px
              )`,
              backgroundSize: "20px 20px",
              backgroundPosition: "0% 100%",
              transform: progress ? `translateY(${100 - (progress * 100)}%)` : undefined,
              transition: progress ? "transform 0.3s ease-out" : undefined,
            }}
          />
          
          {/* Glow effect */}
          <div 
            className="absolute inset-0 animate-pulse"
            style={{
              background: "radial-gradient(circle at center, rgba(255, 215, 0, 0.3) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Loading message */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-white">{message}</h3>
          {progress !== undefined && (
            <div className="w-64 bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <p className="text-sm text-gray-400">Fetching live odds and market data...</p>
        </div>

        {/* Animated dots */}
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-[#FFD700] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-[#FFD700] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-[#FFD700] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>

      {/* Global animation keyframes */}
      <style jsx global>{`
        @keyframes fillProgress {
          0% {
            background-position: 0% 100%;
            opacity: 0.8;
          }
          50% {
            background-position: 0% 0%;
            opacity: 1;
          }
          100% {
            background-position: 0% 100%;
            opacity: 0.8;
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default LoaderOverlay;
