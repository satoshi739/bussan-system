import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { estimateShipping, type SizeCode, type AreaCode } from "@/lib/shipping-table";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Body = {
  product_name?: string;
  source_url?: string;
  buy_price?: number;
  est_price?: number;
  condition?: string;
  category?: string;
  notes?: string;
  weight_g?: number;
  size_code?: SizeCode;
  area?: AreaCode;
  target_platform?: "none" | "mercari" | "yahoo_auctions" | "ebay";
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  if (!body.product_name && !body.source_url) {
    return NextResponse.json(
      { error: "商品名または商品URLのいずれかが必要です" },
      { status: 400 }
    );
  }

  // 送料目安（DBテーブルで先に概算）
  const shipping = estimateShipping({
    sizeCode: body.size_code ?? null,
    weightG: body.weight_g ?? null,
    area: body.area ?? null,
  });

  const isEbay = body.target_platform === "ebay";
  const isMercari = body.target_platform === "mercari";
  const lang = isEbay ? "英語" : "日本語";
  const platformLabel = isEbay ? "eBay（グローバル）"
    : body.target_platform === "yahoo_auctions" ? "ヤフオク"
    : isMercari ? "メルカリ"
    : "国内モール汎用";

  // タイトル文字数（メルカリ・国内モールは40文字、eBayは80文字）
  const titleMaxText = isEbay ? "80文字以内" : "40文字以内（メルカリ仕様）";
  // 説明文の文字数レンジ
  const descRangeText = isEbay
    ? "300〜500文字"
    : isMercari
      ? "200〜400文字、改行を多めに入れて読みやすく"
      : "150〜300文字";
  // キーワード数（メルカリはハッシュタグ多めが効く）
  const keywordsCountText = isMercari ? "6〜10語" : "5〜8語";

  // メルカリ固有の文体ルール
  const mercariStyleRules = isMercari
    ? `
- メルカリ向けの文体に最適化する:
  - 送料は「送料込み（出品者負担）」前提で書く
  - 「即購入OK」「コメントなし購入歓迎」など、メルカリで好まれる常套句を自然に1〜2個入れる
  - 喫煙・ペットの有無、自宅保管である旨など、買い手が気にする情報を補う
  - 「★」「◆」「■」など過剰な記号は避け、改行で見やすく
- "suggested_price" はメルカリの最低価格300円〜上限9,999,999円の範囲に収める。`
    : "";

  const prompt = `あなたは日本の物販プロです。以下の商品情報から、確認用の出品ドラフトをJSONで生成してください。

# 入力
- 商品名: ${body.product_name ?? "(未入力)"}
- 商品URL: ${body.source_url ?? "(未入力)"}
- 仕入れ価格: ${body.buy_price != null ? `¥${body.buy_price.toLocaleString()}` : "未入力"}
- 想定販売価格: ${body.est_price != null ? `¥${body.est_price.toLocaleString()}` : "未入力（適正価格を提案）"}
- 状態: ${body.condition ?? "未指定"}
- カテゴリ希望: ${body.category ?? "未指定"}
- 説明メモ: ${body.notes ?? "なし"}
- 重量目安: ${body.weight_g ? `${body.weight_g}g` : "未指定"}
- サイズ目安: ${body.size_code ? `${body.size_code}サイズ` : "未指定"}
- 出品先: ${platformLabel}
- 送料概算（システム計算済み・参考用）: ¥${shipping.fee}（${shipping.method}）

# 厳守ルール
- 偽ブランド・効能誇張・規約違反語は使わない。
- "title" は ${titleMaxText}。
- "description" は ${lang}。${descRangeText}。改行可。
- "categories" は候補3つを優先度順に。
- "keywords" は検索ヒット狙いで${keywordsCountText}。
- "suggested_price" は想定販売価格が未入力の場合のみ提案。入力済みなら同値を返してよい。
- "profit_estimate" = suggested_price - (buy_price ?? 0) - shipping_estimate を整数で。マイナスになっても正直に。
- "shipping_estimate" は送料概算（¥${shipping.fee}）をそのまま採用してよい。
- "warnings" にはユーザーが出品前に確認すべき注意点（例: 状態説明の補足、写真の追加、規約上のリスク等）を3つ以内で。${mercariStyleRules}

# 出力
以下のJSONのみ返す（前後の説明文なし）:
{
  "title": "...",
  "description": "...",
  "categories": ["...", "...", "..."],
  "keywords": ["...", "..."],
  "suggested_price": 0,
  "profit_estimate": 0,
  "shipping_estimate": 0,
  "warnings": ["...", "..."]
}`;

  try {
    // 30秒タイムアウト: Claudeが詰まっても「AI生成中…」が永遠表示されないように
    const message = await client.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      },
      { timeout: 30_000 }
    );

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI応答のパースに失敗しました" }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      title: string;
      description: string;
      categories: string[];
      keywords: string[];
      suggested_price: number;
      profit_estimate: number;
      shipping_estimate: number;
      warnings: string[];
    };

    return NextResponse.json({
      ok: true,
      draft: {
        ...parsed,
        shipping_estimate: parsed.shipping_estimate || shipping.fee,
      },
      shipping_meta: shipping,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.toLowerCase().includes("timeout") || msg.includes("aborted");
    if (isTimeout) {
      return NextResponse.json(
        { error: "AIが混み合っています。少し時間をおいて再度お試しください。" },
        { status: 504 }
      );
    }
    return NextResponse.json({ error: `AI生成に失敗しました: ${msg}` }, { status: 500 });
  }
}
