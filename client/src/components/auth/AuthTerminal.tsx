import { useState, useEffect, useRef } from 'react';

// Auth-specific terminal lines
const AUTH_LINES = [
  "> Mapping field odds…",
  "> Identifying +EV…", 
  "> Securing data feed…"
];

interface AuthTerminalProps {
  className?: string;
}

export default function AuthTerminal({ className = '' }: AuthTerminalProps) {
  const [currentLine, setCurrentLine] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [lineIndex, setLineIndex] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const cursorRef = useRef<NodeJS.Timeout>();
  const typewriterRef = useRef<NodeJS.Timeout>();

  // Check if prefers-reduced-motion is set
  const prefersReducedMotion = () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  // Main animation loop
  useEffect(() => {
    const typeLine = () => {
      const line = AUTH_LINES[lineIndex];
      
      if (prefersReducedMotion()) {
        // Immediate mode for reduced motion
        setCurrentLine(line);
        setTimeout(() => {
          setLineIndex(prev => (prev + 1) % AUTH_LINES.length);
        }, 2000);
        return;
      }

      // Typewriter effect
      let charIndex = 0;
      const text = line.replace('> ', '');
      setCurrentLine('');

      const typeChar = () => {
        if (charIndex < text.length) {
          setCurrentLine('> ' + text.slice(0, charIndex + 1));
          charIndex++;
          typewriterRef.current = setTimeout(typeChar, 50);
        } else {
          // Line complete, wait then move to next
          setTimeout(() => {
            setLineIndex(prev => (prev + 1) % AUTH_LINES.length);
          }, 2000);
        }
      };

      typeChar();
    };

    // Start immediately, then repeat
    typeLine();
    intervalRef.current = setInterval(typeLine, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
    };
  }, [lineIndex]);

  // Cursor blink
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const blink = () => {
      setShowCursor(prev => !prev);
    };

    cursorRef.current = setInterval(blink, 500);
    return () => {
      if (cursorRef.current) clearInterval(cursorRef.current);
    };
  }, []);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="font-mono text-sm text-gray-500 dark:text-gray-400">
        <span className="text-[#D8AC35] mr-2">{'>'}</span>
        <span>{currentLine.replace('> ', '')}</span>
        <span 
          className={`inline-block w-2 h-4 bg-[#D8AC35] ml-1 transition-opacity duration-100 ${
            showCursor ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    </div>
  );
}