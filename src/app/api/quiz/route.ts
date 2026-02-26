import { NextRequest, NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function getArticleContent(slug: string): string | null {
  const postsDir = join(process.cwd(), "content/posts");
  try {
    const files = readdirSync(postsDir);
    const file = files.find((f) => f.replace(/\.mdx?$/, "") === slug);
    if (!file) return null;
    const raw = readFileSync(join(postsDir, file), "utf-8");
    const content = raw.replace(/^---[\s\S]*?---\n*/, "");
    const textOnly = content
      .replace(/<[A-Z][\s\S]*?\/>/g, "[图表]")
      .replace(/<[A-Z][^>]*>[\s\S]*?<\/[A-Z][^>]*>/g, "[图表]")
      .trim();
    return textOnly;
  } catch {
    return null;
  }
}

// Robust JSON extraction — handles truncated responses
function extractJSON(text: string): unknown[] | null {
  let str = text.replace(/^```json?\s*\n?/m, "").replace(/\n?\s*```\s*$/m, "").trim();
  str = str
    .replace(/\u201c/g, '"').replace(/\u201d/g, '"')
    .replace(/\u2018/g, "'").replace(/\u2019/g, "'");

  const start = str.indexOf("[");
  if (start === -1) return null;
  let depth = 0, end = -1;
  for (let i = start; i < str.length; i++) {
    if (str[i] === "[") depth++;
    else if (str[i] === "]") { depth--; if (depth === 0) { end = i; break; } }
  }

  if (end !== -1) {
    const full = str.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
    try { return JSON.parse(full); } catch { /* fall through */ }
  }

  // Truncated — salvage complete objects
  const items: unknown[] = [];
  let objStart = -1, braceDepth = 0, bracketDepth = 0, inString = false, escaped = false;
  const raw = str.slice(start);
  for (let i = 1; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") { if (braceDepth === 0 && bracketDepth === 0) objStart = i; braceDepth++; }
    else if (ch === "[") bracketDepth++;
    else if (ch === "]") { if (bracketDepth > 0) bracketDepth--; }
    else if (ch === "}") {
      braceDepth--;
      if (braceDepth === 0 && bracketDepth === 0 && objStart !== -1) {
        const objStr = raw.slice(objStart, i + 1).replace(/,\s*([}\]])/g, "$1");
        try { items.push(JSON.parse(objStr)); } catch { /* skip */ }
        objStart = -1;
      }
    }
  }
  return items.length > 0 ? items : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateQuestions(questions: unknown[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validated: any[] = [];
  for (const raw of questions) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = raw as any;
    if (!q.question || !Array.isArray(q.options) || !q.explanation) continue;
    let answer = q.answer;
    if (typeof answer === "string") {
      const idx = "ABCD".indexOf(answer.toUpperCase());
      answer = idx >= 0 ? idx : 0;
    }
    if (typeof answer !== "number" || answer < 0 || answer > 3) answer = 0;
    q.answer = answer;
    if (q.type === "chart") {
      if (!q.chart || !Array.isArray(q.chart.data) || q.chart.data.length === 0) {
        q.type = "text";
        delete q.chart;
      }
    }
    validated.push(q);
  }
  return validated;
}

const SYSTEM_PROMPT = `交易知识出题专家。根据文章生成5道选择题，混合text和chart类型。

chart类型必须包含chart字段，构造OHLC数据，用3-5根K线，日期连续。markers的position只能是"aboveBar"或"belowBar"。

要求：基于文章，4选项，覆盖不同知识点。explanation限1句话。
只返回JSON数组，无其他文字，answer为0-3数字。示例：
[{"type":"text","question":"问题","options":["A","B","C","D"],"answer":0,"explanation":"解释"},{"type":"chart","question":"观察下图K线，该形态属于什么？","chart":{"data":[{"time":"2026-03-01","open":100,"high":105,"low":98,"close":103},{"time":"2026-03-02","open":103,"high":108,"low":102,"close":107},{"time":"2026-03-03","open":107,"high":110,"low":99,"close":100}],"markers":[{"time":"2026-03-02","position":"aboveBar","color":"#ef4444","shape":"arrowDown","text":"?"}]},"options":["A","B","C","D"],"answer":1,"explanation":"解释"}]`;

async function callAI(
  baseUrl: string, apiKey: string, model: string,
  systemPrompt: string, userContent: string,
  retries = 2
): Promise<unknown[] | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,

          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`AI API error (attempt ${attempt + 1}):`, response.status);
        continue;
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || "";
      if (!text) continue;

      const questions = extractJSON(text);
      if (questions && questions.length > 0) return questions;

      console.warn(`Parse failed (attempt ${attempt + 1}), raw:`, text.slice(0, 500));
    } catch (err) {
      console.error(`AI call error (attempt ${attempt + 1}):`, err);
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
  }

  const baseUrl = process.env.CLAUDE_API_BASE_URL;
  const apiKey = process.env.CLAUDE_API_KEY;
  const model = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";

  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { error: "AI API not configured" },
      { status: 500 }
    );
  }

  const articleContent = getArticleContent(slug);
  if (!articleContent) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  try {
    // Batch 1: first 5 questions
    const batch1Raw = await callAI(baseUrl, apiKey, model, SYSTEM_PROMPT,
      `出5道题：\n\n${articleContent}`);
    const batch1 = validateQuestions(batch1Raw || []);

    // Batch 2: next 5, explicitly excluding batch 1 topics
    const existingTopics = batch1.map((q: { question: string }) => q.question).join("；");
    const batch2Raw = await callAI(baseUrl, apiKey, model, SYSTEM_PROMPT,
      `再出5道题，必须与以下已有题目考察不同的知识点：\n${existingTopics}\n\n文章内容：\n${articleContent}`);
    const batch2 = validateQuestions(batch2Raw || []);

    const all = [...batch1, ...batch2];

    if (all.length === 0) {
      return NextResponse.json({ error: "AI 生成失败，请重试" }, { status: 502 });
    }

    return NextResponse.json({ questions: all });
  } catch (err) {
    console.error("Quiz generation error:", err);
    return NextResponse.json({ error: "生成超时或网络错误，请重试" }, { status: 500 });
  }
}
