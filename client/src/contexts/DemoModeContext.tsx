import { createContext, useContext, useState } from 'react';

interface DemoModeContextType {
  demoMode: boolean;
  toggleDemoMode: () => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [demoMode, setDemoMode] = useState(true);

  const toggleDemoMode = () => {
    setDemoMode(prev => !prev);
    // Note: Demo mode now provides limited access only
    // Users need to sign up and subscribe for full features
    console.log('Demo mode toggled. Note: Demo users have limited access to features.');
  };

  return (
    <DemoModeContext.Provider value={{ demoMode, toggleDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}