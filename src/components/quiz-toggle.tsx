"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AIQuiz } from "./ai-quiz";

const STORAGE_KEY = "quiz-enabled";

const QuizContext = createContext<{
  enabled: boolean;
  toggle: () => void;
}>({ enabled: false, toggle: () => {} });

export function QuizProvider({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEnabled(localStorage.getItem(STORAGE_KEY) === "true");
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <QuizContext.Provider value={{ enabled, toggle }}>
      {children}
      {hydrated && enabled && <AIQuiz slug={slug} />}
    </QuizContext.Provider>
  );
}

export function QuizToggleButton() {
  const { enabled, toggle } = useContext(QuizContext);

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors cursor-pointer select-none whitespace-nowrap"
      style={{
        background: enabled ? "var(--color-primary)" : undefined,
        color: enabled ? "var(--color-primary-foreground)" : undefined,
        borderColor: enabled ? "var(--color-primary)" : undefined,
      }}
      title={enabled ? "关闭课后练习" : "开启课后练习"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
      </svg>
      练习
    </button>
  );
}
