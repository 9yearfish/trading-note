"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { KLineChart } from "./kline-chart";
import confetti from "canvas-confetti";

interface ChartData {
  data: Array<{ time: string; open: number; high: number; low: number; close: number }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markers?: any[];
  lines?: Array<{ price: number; color: string; title: string }>;
}

interface QuizQuestion {
  type: "text" | "chart";
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  chart?: ChartData;
}

function fireConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
}

export function AIQuiz({ slug }: { slug: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const confettiFired = useRef(false);

  const generate = useCallback(async (maxRetries = 2) => {
    setLoading(true);
    setError(null);
    setQuestions([]);
    setAnswers({});
    confettiFired.current = false;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`/api/quiz?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (!res.ok) {
          if (attempt < maxRetries) {
            console.warn(`Quiz attempt ${attempt + 1} failed, retrying...`);
            continue;
          }
          setError(data.error || "生成失败");
          setLoading(false);
          return;
        }
        setQuestions(data.questions);
        setLoading(false);
        return;
      } catch {
        if (attempt < maxRetries) {
          console.warn(`Quiz network error attempt ${attempt + 1}, retrying...`);
          continue;
        }
        setError("网络错误，请稍后重试");
      }
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    generate();
  }, [generate]);

  const handleSelect = (qIndex: number, optIndex: number) => {
    if (answers[qIndex] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  };

  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.filter((q, i) => answers[i] === q.answer).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  // Fire confetti when all questions answered
  useEffect(() => {
    if (allAnswered && !confettiFired.current) {
      confettiFired.current = true;
      fireConfetti();
    }
  }, [allAnswered]);

  const scoreColor = allAnswered
    ? correctCount === questions.length
      ? "text-green-600 dark:text-green-400"
      : correctCount >= questions.length * 0.7
        ? "text-blue-600 dark:text-blue-400"
        : "text-orange-600 dark:text-orange-400"
    : "";

  return (
    <section className="mt-16 pt-10 border-t-2 border-dashed">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">课后测验</h2>
        {questions.length > 0 && (
          <button
            onClick={() => generate()}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-wait"
          >
            {loading ? "生成中..." : "换一批题目"}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-4" />
              {i % 2 === 0 && <div className="h-40 bg-muted rounded mb-4" />}
              <div className="space-y-2">
                <div className="h-9 bg-muted rounded" />
                <div className="h-9 bg-muted rounded" />
                <div className="h-9 bg-muted rounded" />
                <div className="h-9 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && questions.length > 0 && (
        <div className="space-y-6">
          {questions.map((q, qIdx) => (
            <div key={qIdx} className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground font-mono">
                  {qIdx + 1}/{questions.length}
                </span>
                {q.type === "chart" && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    看图题
                  </span>
                )}
              </div>

              {/* Chart for chart-type questions */}
              {q.type === "chart" && q.chart && (
                <div className="mb-4">
                  <KLineChart
                    data={q.chart.data}
                    markers={q.chart.markers}
                    lines={q.chart.lines}
                    height={280}
                  />
                </div>
              )}

              <p className="font-medium mb-3">{q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oIdx) => {
                  const selected = answers[qIdx];
                  let style = "border bg-transparent hover:bg-muted";
                  if (selected !== undefined) {
                    if (oIdx === q.answer) {
                      style = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                    } else if (oIdx === selected) {
                      style = "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
                    } else {
                      style = "border bg-transparent opacity-50";
                    }
                  }
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelect(qIdx, oIdx)}
                      disabled={selected !== undefined}
                      className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors cursor-pointer disabled:cursor-default ${style}`}
                    >
                      <span className="font-mono mr-2 text-muted-foreground">
                        {String.fromCharCode(65 + oIdx)}.
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {answers[qIdx] !== undefined && q.explanation && (
                <div className="mt-3 p-3 rounded-md bg-muted text-sm">
                  <span className="font-medium">
                    {answers[qIdx] === q.answer ? "正确！" : "错误。"}
                  </span>{" "}
                  {q.explanation}
                </div>
              )}
            </div>
          ))}

          {allAnswered && (
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className={`text-lg font-bold ${scoreColor}`}>
                得分：{correctCount} / {questions.length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {correctCount === questions.length
                  ? "全部正确！"
                  : correctCount >= questions.length * 0.7
                    ? "不错，继续加油！"
                    : "建议回顾上面的内容再试一次。"}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
