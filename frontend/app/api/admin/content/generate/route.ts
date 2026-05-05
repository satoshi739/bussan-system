import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const PROMPTS: Record<string, (theme: string) => string> = {
  tiktok: (theme) => `あなたは物販SaaS「物販チェッカー」のTikTok動画台本を書くプロです。
テーマ: ${theme || "物販で稼ぐコツ"}
以下の形式で30秒動画の台本を書いてください：

【タイトル】（10文字以内・バズる表現）
【台本】
- 冒頭3秒（掴み）:
- 本編20秒（価値提供）:
- ラスト7秒（CTA）:

物販チェッカー（無料から使える利益スキャンツール）への誘導を自然に含めること。`,

  instagram: (theme) => `あなたは物販SaaS「物販チェッカー」のInstagramカルーセル投稿を書くプロです。
テーマ: ${theme || "物販で利益を出す方法"}
5枚のスライド構成でコピーを書いてください：

【タイトル】（表紙スライドのキャッチコピー）
【スライド1】表紙: （強烈な問いかけや数字）
【スライド2】:
【スライド3】:
【スライド4】:
【スライド5】CTA: （物販チェッカーへの誘導）

保存したくなる実用的な内容にすること。`,

  x: (theme) => `あなたは物販SaaS「物販チェッカー」のX(Twitter)投稿を書くプロです。
テーマ: ${theme || "物販・副業"}
バズりやすいツイートを1本書いてください（140文字以内）。
リプライで続きを書くスレッド形式でも可（最大3ツイート）。

【タイトル】（ツイート要約）
【投稿文】`,

  dm: (theme) => `あなたは物販SaaS「物販チェッカー」の新規顧客獲得DMを書くプロです。
ターゲット: ${theme || "物販・せどりをやっているSNSユーザー"}
返信率が高いDMを書いてください：

【タイトル】（DM用途の説明）
【DM文】
・1〜2文で共感
・物販チェッカーの紹介（押しつけがましくなく）
・行動を促すCTA（無料で試してみませんか？等）

200文字以内で自然な口語調にすること。`,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { platform, theme } = await req.json();
  if (!platform || !PROMPTS[platform]) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: PROMPTS[platform](theme ?? "") }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  const titleMatch = text.match(/【タイトル】[^\n]*\n([^\n【]+)/);
  const title = titleMatch ? titleMatch[1].trim() : `${platform}投稿 - ${theme || "新規"}`;
  const body = text.replace(/【タイトル】[^\n]*\n[^\n【]+\n?/, "").trim();

  return NextResponse.json({ title, body, raw: text });
}
