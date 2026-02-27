import React, { createContext, useContext, useState, useCallback } from "react";
import type { Query } from "@shared/schema";

type Mode = "offline" | "online";
type Language = "English" | "Hindi" | "Telugu";

export type ChatMessage =
  | { type: "user"; text: string; timestamp: Date }
  | { type: "ai"; data: Query };

interface KisanContextType {
  mode: Mode;
  setMode: (mode: Mode) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  chatSession: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearSession: () => void;
  demoMode: boolean;
  toggleDemoMode: () => void;
}

const KisanContext = createContext<KisanContextType | undefined>(undefined);

const DEMO_QUERIES = [
  "How to control aphids in mustard?",
  "What fertilizer for wheat during flowering?",
  "How to apply for PM Kisan scheme?",
  "Treatment for blight in potato crops?",
  "Best pesticide for whitefly in cotton?",
];

export { DEMO_QUERIES };

export function KisanProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("online");
  const [language, setLanguage] = useState<Language>("English");
  const [chatSession, setChatSession] = useState<ChatMessage[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  const addMessage = useCallback((msg: ChatMessage) => {
    setChatSession((prev) => [...prev, msg]);
  }, []);

  const clearSession = useCallback(() => {
    setChatSession([]);
  }, []);

  const toggleDemoMode = useCallback(() => {
    setDemoMode((prev) => !prev);
  }, []);

  return (
    <KisanContext.Provider
      value={{
        mode,
        setMode,
        language,
        setLanguage,
        chatSession,
        addMessage,
        clearSession,
        demoMode,
        toggleDemoMode,
      }}
    >
      {children}
    </KisanContext.Provider>
  );
}

export function useKisanState() {
  const context = useContext(KisanContext);
  if (context === undefined) {
    throw new Error("useKisanState must be used within a KisanProvider");
  }
  return context;
}
