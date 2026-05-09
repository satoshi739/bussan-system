import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { product_name, buy_price, sell_platform, condition, profit_rate } = body as {
    product_name: string;
    buy_price: number;
    sell_platform: string;
    condition?: string;
    profit_rate?: number;
  };

  if (!product_name || !sell_platform) {
    return NextResponse.json({ error: "product_name と sell_platform は必須です" }, { status: 400 });
  }

  const isEbay = sell_platform.toLowerCase().includes("ebay");
  const lang = isEbay ? "英語" : "日本語";
  const platform = isEbay ? "eBay" : sell_platform;

  const prompt = `あなたは${platform}の出品専門家です。以下の商品情報をもとに、売れる出品文を生成してください。

商品名: ${product_name}
仕入れ価格: ¥${buy_price.toLocaleString()}
販売先: ${platform}
コンディション: ${condition ?? "中古"}
${profit_rate ? `想定利益率: ${profit_rate}%` : ""}

以下の形式でJSONのみ返してください（説明文なし）:
{
  "title": "${lang}の出品タイトル（${isEbay ? "80文字以内" : "40文字以内"}）",
  "description": "${lang}の商品説明文（${isEbay ? "300〜500文字" : "150〜300文字"}）",
  "keywords": ["関連キーワード1", "関連キーワード2", "関連キーワード3", "関連キーワード4", "関連キーワード5"],
  "price_tip": "価格設定のコツ（日本語・1〜2文）"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI応答のパースに失敗しました" }, { status: 500 });
    }
    const draft = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
