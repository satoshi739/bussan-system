import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 過去14日分の台本テーマを取得（重複防止用）
async function getRecentThemes(): Promise<string[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const items = await prisma.contentItem.findMany({
    where: { platform: { startsWith: "sns_daily_" }, createdAt: { gte: since } },
    select: { theme: true },
    orderBy: { createdAt: "desc" },
  });
  return items.map((i) => i.theme).filter(Boolean);
}

function buildPrompt(recentThemes: string[]): string {
  const exclusionNote = recentThemes.length
    ? `\n# 過去14日に既に投稿したテーマ（重複NG）\n- ${recentThemes.join("\n- ")}\n`
    : "";

  return `あなたは物販SaaS「物販チェッカー」のSNS発信担当です。今日のTikTok+X投稿用の台本を生成してください。

# サービス情報
- 名前: 物販チェッカー
- 中核価値: スキャナーで仕入候補を発見 → AIが出品文生成 → メルカリ/ヤフオク/eBayで1クリック出品
- 料金: フリー（月10スキャン）/ Standard ¥9,800 / Pro ¥19,800
- ターゲット: 副業せどらー〜専業物販プレイヤー
- 訴求軸: 「3分の出品作業を10秒に」
- LP: app.upjapan.co.jp
${exclusionNote}
# 出力フォーマット（厳密にこのJSON形式）
\`\`\`json
{
  "theme": "今日のテーマ（30文字以内）",
  "themeWhy": "なぜこのテーマか（バズ予測の根拠を1行）",
  "tiktok": {
    "scenes": [
      {"narrator": "kasukabe_tsumugi" or "kurono_takehiro", "text": "セリフ（30文字以内）"},
      ... 5〜7シーン
    ],
    "caption": "投稿時のキャプション（140文字以内・改行可）",
    "hashtags": ["#物販", "#メルカリ", ...] (8〜10個)
  },
  "x": {
    "tweet": "ツイート本文（140文字以内・改行可）",
    "thread": [] (空配列または最大3ツイートの続き)
  }
}
\`\`\`

# 守るルール
- 偽の数字・誇大な収益保証は書かない
- TikTok台本は「フック→問題→解決→驚き→CTA」の構成
- 過去テーマと違う角度で書く
- 「のだ」口調は使わない（春日部つむぎは標準語）
- ハッシュタグは検索ヒット狙い

JSON だけ返してください。前後の説明文不要。`;
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const recentThemes = await getRecentThemes();
    const prompt = buildPrompt(recentThemes);

    const message = await client.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        messages: [{ role: "user", content: prompt }],
      },
      { timeout: 60_000 },
    );

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI応答のパースに失敗しました", raw: text },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      theme: string;
      themeWhy: string;
      tiktok: { scenes: { narrator: string; text: string }[]; caption: string; hashtags: string[] };
      x: { tweet: string; thread?: string[] };
    };

    // DB保存（platform を sns_daily_tiktok / sns_daily_x で分けて1日2件）
    const today = new Date().toISOString().slice(0, 10);
    const userId = session.user.id;

    const [tiktokItem, xItem] = await Promise.all([
      prisma.contentItem.create({
        data: {
          platform: "sns_daily_tiktok",
          theme: parsed.theme,
          title: `${today} TikTok: ${parsed.theme}`,
          body: JSON.stringify(parsed.tiktok),
          status: "draft",
        },
      }),
      prisma.contentItem.create({
        data: {
          platform: "sns_daily_x",
          theme: parsed.theme,
          title: `${today} X: ${parsed.theme}`,
          body: JSON.stringify(parsed.x),
          status: "draft",
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      theme: parsed.theme,
      themeWhy: parsed.themeWhy,
      tiktok: { id: tiktokItem.id, ...parsed.tiktok },
      x: { id: xItem.id, ...parsed.x },
      generatedBy: userId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.toLowerCase().includes("timeout");
    return NextResponse.json(
      { error: isTimeout ? "AIが混み合っています。再試行してください。" : `生成失敗: ${msg}` },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
