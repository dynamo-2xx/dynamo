import { createContext, ReactNode, useCallback, useContext, useState } from "react";

interface FloatingDMState {
  threadId: string | null;
  openThread: (threadId: string) => void;
  close: () => void;
}

const FloatingDMContext = createContext<FloatingDMState | null>(null);

export const FloatingDMProvider = ({ children }: { children: ReactNode }) => {
  const [threadId, setThreadId] = useState<string | null>(null);
  const openThread = useCallback((id: string) => setThreadId(id), []);
  const close = useCallback(() => setThreadId(null), []);
  return (
    <FloatingDMContext.Provider value={{ threadId, openThread, close }}>
      {children}
    </FloatingDMContext.Provider>
  );
};

export const useFloatingDM = () => {
  const ctx = useContext(FloatingDMContext);
  if (!ctx) throw new Error("useFloatingDM must be used within FloatingDMProvider");
  return ctx;
};
