import React from 'react';

interface HorizontalTickerProps {
  content: string[];
  speed?: number; // Animation duration in seconds (default: 30)
  backgroundColor?: string;
  textColor?: string;
  fontSize?: string;
  height?: string;
  separator?: string;
  className?: string;
}

export const HorizontalTicker: React.FC<HorizontalTickerProps> = ({
  content,
  speed = 30,
  backgroundColor = '#000000',
  textColor = '#ffffff',
  fontSize = '16px',
  height = '40px',
  separator = ' • ',
  className = ''
}) => {
  // Join all content with separators and repeat for seamless loop
  const tickerText = content.join(separator);
  const repeatedText = Array(5).fill(tickerText).join(separator);

  return (
    <div 
      className={`horizontal-ticker-container ${className}`}
      style={{
        backgroundColor,
        height,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        position: 'relative',
        width: '100%'
      }}
    >
      <div 
        className="horizontal-ticker-content"
        style={{
          color: textColor,
          fontSize,
          lineHeight: height,
          display: 'inline-block',
          paddingLeft: '100%',
          animationDuration: `${speed}s`,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationName: 'scroll-left'
        }}
      >
        {repeatedText}
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        .horizontal-ticker-content {
          animation-name: scroll-left;
        }

        .horizontal-ticker-container:hover .horizontal-ticker-content {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

// Example usage component
export const ScoreTicker: React.FC = () => {
  const sampleScores = [
    "Lakers 112 - 108 Warriors FINAL",
    "Celtics 95 - 89 Heat LIVE",
    "Bulls vs Knicks 7:30 PM",
    "Nets 102 - 99 76ers FINAL",
    "Clippers 118 - 115 Suns LIVE"
  ];

  return (
    <HorizontalTicker 
      content={sampleScores}
      speed={25}
      backgroundColor="#1a1a1a"
      textColor="#ffffff"
      fontSize="14px"
      height="35px"
      separator=" • "
      className="top-ticker"
    />
  );
};
