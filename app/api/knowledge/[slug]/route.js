import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const SLUG_TO_SECTION = {
  tfsa: "1) TFSA",
  rrsp: "2) RRSP",
  fhsa: "3) FHSA",
  hbp: "4) RRSP Home Buyers' Plan (HBP)",
  "account-priority": "5) Registered account priority order",
  "pay-yourself-first": "6) Pay Yourself First",
  "4-bucket": "7) 4-Bucket Allocation Framework",
  "debt-avalanche-snowball": "8) Debt avalanche vs snowball",
  "minimum-payment-trap": "9) Credit card minimum payment trap",
  "emergency-fund": "10) Emergency fund",
  "over-contribution": "11) Over-contribution penalties (TFSA and RRSP)",
  "compound-interest": "12) Compound interest and opportunity cost",
  "behaviour-psychology": "13) Behaviour and money psychology",
  "financial-levels": "14) Financial Levels framework (Level 1 to Level 5)",
};

const BOOK_REF_BY_SLUG = {
  "pay-yourself-first": {
    title: "The Richest Man in Babylon",
    author: "George S. Clason",
    hook: "Build wealth by consistently saving a fixed part of income before discretionary spending.",
  },
  "4-bucket": {
    title: "I Will Teach You to Be Rich",
    author: "Ramit Sethi",
    hook: "Use a simple conscious spending plan and automation so money decisions are easier to maintain.",
  },
  "behaviour-psychology": {
    title: "The Psychology of Money",
    author: "Morgan Housel",
    hook: "Good financial outcomes come more from behavior and consistency than perfect optimization.",
  },
};

function extractSection(markdown, sectionTitle) {
  const startToken = `## ${sectionTitle}`;
  const start = markdown.indexOf(startToken);

  if (start === -1) {
    return null;
  }

  const nextHeader = markdown.indexOf("\n## ", start + startToken.length + 1);
  const end = nextHeader === -1 ? markdown.length : nextHeader;

  return markdown.slice(start, end).trim();
}

function estimateReadTime(markdownText) {
  const words = markdownText.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min`;
}

export async function GET(_request, { params }) {
  const slug = params?.slug;

  if (!slug || !SLUG_TO_SECTION[slug]) {
    return NextResponse.json({ error: "Unknown knowledge topic" }, { status: 404 });
  }

  try {
    const knowledgePath = path.join(process.cwd(), "KnowledgeBase.md");
    const markdown = await fs.readFile(knowledgePath, "utf8");
    const sectionTitle = SLUG_TO_SECTION[slug];
    const sectionMarkdown = extractSection(markdown, sectionTitle);

    if (!sectionMarkdown) {
      return NextResponse.json({ error: "Topic content unavailable" }, { status: 404 });
    }

    return NextResponse.json({
      title: sectionTitle.replace(/^\d+\)\s*/, ""),
      content: sectionMarkdown,
      readTime: estimateReadTime(sectionMarkdown),
      bookRef: BOOK_REF_BY_SLUG[slug] || null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load knowledge base" }, { status: 500 });
  }
}
