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

返回严格的 JSON 数组，不要包含 markdown 代码块标记：
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
]

answer 字段是正确选项的索引（0-3）。`;

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
        max_tokens: 128000,
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

    // Parse JSON from response
    const jsonStr = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const questions = JSON.parse(jsonStr);

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 502 });
    }

    // Validate each question
    for (const q of questions) {
      if (!q.question || !Array.isArray(q.options) || typeof q.answer !== "number" || !q.explanation) {
        return NextResponse.json({ error: "Invalid question format from AI" }, { status: 502 });
      }
      // Validate chart data if present
      if (q.type === "chart" && q.chart) {
        if (!Array.isArray(q.chart.data) || q.chart.data.length === 0) {
          return NextResponse.json({ error: "Invalid chart data from AI" }, { status: 502 });
        }
      }
    }

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("Quiz generation error:", err);
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}
