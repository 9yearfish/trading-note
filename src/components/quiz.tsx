"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// --- Quiz Context for scoring ---
interface QuizContextValue {
  total: number;
  correct: number;
  register: () => void;
  markCorrect: () => void;
}

const QuizContext = createContext<QuizContextValue | null>(null);

// --- Quiz wrapper ---
interface QuizProps {
  title?: string;
  children: ReactNode;
}

export function Quiz({ title = "课后测验", children }: QuizProps) {
  const [total, setTotal] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);

  const register = useCallback(() => {
    setTotal((t) => t + 1);
  }, []);

  const markCorrect = useCallback(() => {
    setCorrect((c) => c + 1);
    setAnswered((a) => a + 1);
  }, []);

  // We track answered separately so we know when user answered wrong too
  const markAnswered = useCallback(() => {
    setAnswered((a) => a + 1);
  }, []);

  return (
    <QuizContext.Provider value={{ total, correct, register, markCorrect }}>
      <section className="mt-12 border-t pt-8">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        <QuizAnsweredContext.Provider value={{ answered, markAnswered }}>
          <div className="space-y-6">{children}</div>
        </QuizAnsweredContext.Provider>
        {answered > 0 && answered === total && (
          <div className="mt-8 p-4 rounded-lg bg-muted text-center">
            <p className="text-lg font-medium">
              得分：{correct} / {total}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {correct === total
                ? "全部正确！"
                : correct >= total * 0.7
                  ? "不错，继续加油！"
                  : "建议回顾上面的内容再试一次。"}
            </p>
          </div>
        )}
      </section>
    </QuizContext.Provider>
  );
}

// Separate context to track answered count without re-render loops
interface QuizAnsweredContextValue {
  answered: number;
  markAnswered: () => void;
}

const QuizAnsweredContext = createContext<QuizAnsweredContextValue | null>(null);

// --- QuizItem ---
interface QuizItemProps {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
  children?: ReactNode;
}

export function QuizItem({ question, options, answer, explanation, children }: QuizItemProps) {
  const quizCtx = useContext(QuizContext);
  const answeredCtx = useContext(QuizAnsweredContext);
  const [selected, setSelected] = useState<number | null>(null);

  // Register this item on first render
  const [registered, setRegistered] = useState(false);
  if (!registered && quizCtx) {
    quizCtx.register();
    setRegistered(true);
  }

  const handleSelect = (index: number) => {
    if (selected !== null) return; // already answered
    setSelected(index);
    if (index === answer) {
      quizCtx?.markCorrect();
    }
    answeredCtx?.markAnswered();
  };

  return (
    <div className="rounded-lg border p-4">
      {/* Optional chart or content above the question */}
      {children && <div className="mb-4">{children}</div>}

      <p className="font-medium mb-3">{question}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          let style = "border bg-transparent hover:bg-muted";
          if (selected !== null) {
            if (i === answer) {
              style = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
            } else if (i === selected) {
              style = "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
            } else {
              style = "border bg-transparent opacity-50";
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
              className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors cursor-pointer disabled:cursor-default ${style}`}
            >
              <span className="font-mono mr-2 text-muted-foreground">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && explanation && (
        <div className="mt-3 p-3 rounded-md bg-muted text-sm">
          <span className="font-medium">
            {selected === answer ? "正确！" : "错误。"}
          </span>{" "}
          {explanation}
        </div>
      )}
    </div>
  );
}
