import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const LoadingProgressContext = createContext();

export const useLoadingProgress = () => {
  const context = useContext(LoadingProgressContext);
  if (!context) {
    throw new Error('useLoadingProgress must be used within LoadingProgressProvider');
  }
  return context;
};

export const LoadingProgressProvider = ({ children }) => {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const timeoutRef = useRef(null);

  const startLoading = useCallback(() => {
    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(true);
    setIsCollapsing(false);
    setProgress(0);
  }, []);

  const setLoadingProgress = useCallback((value) => {
    setProgress(Math.min(100, Math.max(0, value)));
  }, []);

  const completeLoading = useCallback(() => {
    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setProgress(100);
    // Small delay before collapsing to ensure 100% is visible
    const timeout1 = setTimeout(() => {
      setIsCollapsing(true);
      // After collapse animation completes, reset
      const timeout2 = setTimeout(() => {
        setIsLoading(false);
        setIsCollapsing(false);
        setProgress(0);
        timeoutRef.current = null;
      }, 500); // Match collapse animation duration
      timeoutRef.current = timeout2;
    }, 100);
    timeoutRef.current = timeout1;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const value = {
    progress,
    isLoading,
    isCollapsing,
    startLoading,
    setLoadingProgress,
    completeLoading
  };

  return (
    <LoadingProgressContext.Provider value={value}>
      {children}
    </LoadingProgressContext.Provider>
  );
};

