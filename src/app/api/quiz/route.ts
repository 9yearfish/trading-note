import { NextRequest, NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for AI generation

// Find MDX file for a given slug
function getArticleContent(slug: string): string | null {
  const postsDir = join(process.cwd(), "content/posts");
  try {
    const files = readdirSync(postsDir);
    const file = files.find((f) => f.replace(/\.mdx?$/, "") === slug);
    if (!file) return null;
    const raw = readFileSync(join(postsDir, file), "utf-8");
    // Strip frontmatter
    const content = raw.replace(/^---[\s\S]*?---\n*/, "");
    // Strip JSX component tags but keep text context
    const textOnly = content
      .replace(/<[A-Z][\s\S]*?\/>/g, "[图表]")
      .replace(/<[A-Z][^>]*>[\s\S]*?<\/[A-Z][^>]*>/g, "[图表]")
      .trim();
    return textOnly;
  } catch {
    return null;
  }
}

// Robust JSON extraction from AI text — handles truncated responses
function extractJSON(text: string): unknown[] | null {
  // Step 1: strip markdown code fences
  let str = text.replace(/^```json?\s*\n?/m, "").replace(/\n?\s*```\s*$/m, "").trim();

  // Step 2: fix common issues
  str = str
    .replace(/\u201c/g, '"').replace(/\u201d/g, '"')
    .replace(/\u2018/g, "'").replace(/\u2019/g, "'");

  // Step 3: try full array parse first
  const start = str.indexOf("[");
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < str.length; i++) {
    if (str[i] === "[") depth++;
    else if (str[i] === "]") { depth--; if (depth === 0) { end = i; break; } }
  }

  if (end !== -1) {
    const full = str.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
    try { return JSON.parse(full); } catch { /* fall through to partial */ }
  }

  // Step 4: response was likely truncated — salvage complete objects
  console.warn("JSON truncated, attempting partial recovery...");
  const items: unknown[] = [];
  // Find each top-level object boundary in the array
  let objStart = -1;
  let braceDepth = 0;
  let bracketDepth = 0;
  let inString = false;
  let escaped = false;
  const raw = str.slice(start);
  for (let i = 1; i < raw.length; i++) { // skip opening [
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
        try { items.push(JSON.parse(objStr)); } catch { /* skip broken object */ }
        objStart = -1;
      }
    }
  }
  return items.length > 0 ? items : null;
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
      { error: "AI API not configured. Set CLAUDE_API_BASE_URL and CLAUDE_API_KEY in .env.local" },
      { status: 500 }
    );
  }

  const articleContent = getArticleContent(slug);
  if (!articleContent) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const systemPrompt = `你是一个高级交易知识出题专家。根据用户提供的学习笔记内容，生成 10 道测试题。

## 题型说明

你需要生成两种类型的题目，根据文章内容自动调配比例：

### 1. text 类型（文字选择题）
适合考察概念理解、规则记忆、逻辑推理。

### 2. chart 类型（看图选择题）
适合考察实战分析能力。你需要生成逼真的 K 线 OHLC 数据，让读者看图判断。

chart 类型题目的 chart 字段格式：
{
  "data": [
    { "time": "2026-03-01", "open": 100, "high": 105, "low": 98, "close": 103 },
    ...更多K线数据（5-12根）
  ],
  "markers": [
    { "time": "2026-03-05", "position": "belowBar", "color": "#22c55e", "shape": "arrowUp", "text": "?" }
  ],
  "lines": [
    { "price": 100, "color": "#f97316", "title": "中点 = 100" }
  ]
}

chart 数据要求：
- 时间用连续日期，格式 "YYYY-MM-DD"
- OHLC 数据要符合真实 K 线逻辑（high >= open,close >= low，high >= low）
- 根据题目意图构造有意义的走势形态（如反转、突破、震荡、内包外包等）
- markers 用 "?" 标注需要读者判断的关键 K 线
- lines 用于标注中点、支撑位等辅助线（可选）
- position: "belowBar" 或 "aboveBar"
- shape: "arrowUp" 或 "arrowDown"

## 出题要求

1. 所有题目必须严格基于文章内容，答案必须能从文中找到依据
2. 每道题 4 个选项，只有 1 个正确答案
3. 题目要覆盖文章的不同知识点，不要集中在同一个概念
4. 难度分布：3道基础题 + 4道中等题 + 3道进阶应用题
5. 解析要详细，引用文章原文概念作为依据
6. chart 题目的 K 线数据必须精心构造，能明确体现题目考察的形态特征
7. 根据文章内容自动决定 text 和 chart 题目的比例——如果文章涉及大量 K 线形态分析，chart 题应占 40-60%；如果文章偏理论概念，text 题可以多一些

## 返回格式

严格要求：
- 只返回一个 JSON 数组，不要任何其他文字
- 不要用 markdown 代码块包裹
- 字符串中的双引号用 \\" 转义
- answer 字段必须是数字索引（0-3），不是字母

[
  {
    "type": "text",
    "question": "题目文本",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "answer": 0,
    "explanation": "详细解析"
  },
  {
    "type": "chart",
    "question": "观察下图 K 线走势，标注 ? 处的 K 线属于什么类型？",
    "chart": { "data": [...], "markers": [...], "lines": [...] },
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "answer": 2,
    "explanation": "详细解析，说明如何从图中判断"
  }
]`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 240000); // 4 min timeout

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
        max_tokens: 64000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `以下是学习笔记的内容，请根据这些内容出 10 道测试题（混合 text 和 chart 类型）：\n\n${articleContent}`,
          },
        ],
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      return NextResponse.json(
        { error: "AI API request failed" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    if (data.stop_reason === "max_tokens") {
      console.warn("AI response was truncated (hit max_tokens), attempting partial recovery...");
    }

    const questions = extractJSON(text);

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error("Failed to parse questions. Raw AI text (first 3000 chars):", text.slice(0, 3000));
      return NextResponse.json({ error: "AI 返回格式异常，请重试" }, { status: 502 });
    }

    // Validate and fix each question
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validated: any[] = [];
    for (const raw of questions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q = raw as any;
      if (!q.question || !Array.isArray(q.options) || !q.explanation) continue;
      // Fix answer field: convert letter to index if needed
      let answer = q.answer;
      if (typeof answer === "string") {
        const idx = "ABCD".indexOf(answer.toUpperCase());
        answer = idx >= 0 ? idx : 0;
      }
      if (typeof answer !== "number" || answer < 0 || answer > 3) answer = 0;
      q.answer = answer;

      // Validate chart data if present
      if (q.type === "chart" && q.chart) {
        if (!Array.isArray(q.chart.data) || q.chart.data.length === 0) {
          q.type = "text";
          delete q.chart;
        }
      }
      validated.push(q);
    }

    if (validated.length === 0) {
      return NextResponse.json({ error: "AI 生成的题目格式无效，请重试" }, { status: 502 });
    }

    return NextResponse.json({ questions: validated });
  } catch (err) {
    console.error("Quiz generation error:", err);
    return NextResponse.json({ error: "生成超时或网络错误，请重试" }, { status: 500 });
  }
}
