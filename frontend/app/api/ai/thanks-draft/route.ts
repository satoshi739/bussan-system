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
  const { product_name, sell_platform, sale_price } = body as {
    product_name: string;
    sell_platform: string;
    sale_price: number;
  };

  if (!product_name || !sell_platform) {
    return NextResponse.json({ error: "product_name と sell_platform は必須です" }, { status: 400 });
  }

  const isEbay = sell_platform.toLowerCase().includes("ebay");
  const lang = isEbay ? "英語（丁寧かつフレンドリーなビジネスメール調）" : "日本語（です・ます調・敬語）";
  const platform = isEbay ? "eBay" : sell_platform;

  const prompt = `あなたは${platform}で物販を行うショップオーナーです。商品を購入してくださったお客様へのお礼メッセージを${lang}で作成してください。

商品名: ${product_name}
販売先: ${platform}
売却価格: ¥${sale_price.toLocaleString()}

要件:
- 購入のお礼を最初に述べる
- 商品が無事届いたことを確認する文を入れる
- ${isEbay ? "Please leave positive feedback if you are satisfied." : "もし良ければレビューを書いていただけると嬉しい旨を、押し付けがましくなく自然に伝える"}
- 末尾に署名は不要（ユーザーが自分で追加）
- 絵文字は控えめに（${isEbay ? "ほぼ使わない" : "1〜2個まで"}）
- ${isEbay ? "150〜250 words" : "150〜250文字"}

以下の形式でJSONのみ返してください（説明文なし、markdownなし）:
{
  "subject": "${isEbay ? "件名（英語・60文字以内）" : "件名（日本語・30文字以内）"}",
  "message": "本文"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
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
