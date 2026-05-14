/**
 * 出品アダプタ層
 *
 * MVP: NoneAdapter のみ実機能（CSV/コピー）。
 * 将来: YahooAuctionsAdapter / EbayAdapter を追加。
 * 各アダプタは PublishAdapter を実装するだけで切り替え可能。
 */

export type TargetPlatform = "none" | "mercari" | "yahoo_auctions" | "ebay";

/** メルカリ出品ページURL（新タブで開く想定） */
export const MERCARI_SELL_URL = "https://jp.mercari.com/sell";

export type PublishablePayload = {
  title: string;
  description: string;
  price: number;
  shippingFee: number;
  category?: string | null;
  keywords?: string[];
  imageUrls?: string[];
  condition?: string | null;
};

export type PublishMode = "csv" | "copy" | "api";

export type PublishResult =
  | { ok: true; mode: "csv"; csv: string; filename: string }
  | { ok: true; mode: "copy"; text: string }
  | { ok: true; mode: "api"; externalId: string; platform: TargetPlatform }
  | { ok: false; reason: string; status: "not_connected" | "not_implemented" | "error" };

export type PlatformMeta = {
  id: TargetPlatform;
  label: string;
  statusLabel: string;
  available: boolean;
};

export const PLATFORMS: PlatformMeta[] = [
  { id: "none",            label: "未連携（CSV/コピー）",   statusLabel: "利用可",          available: true },
  { id: "mercari",         label: "メルカリ",               statusLabel: "コピー＋起動",    available: true },
  { id: "yahoo_auctions",  label: "ヤフオク",               statusLabel: "API準備中",       available: false },
  { id: "ebay",            label: "eBay",                  statusLabel: "API準備中",       available: false },
];

export interface PublishAdapter {
  platform: TargetPlatform;
  publish(payload: PublishablePayload, mode: PublishMode): Promise<PublishResult>;
}

/** CSV用：ダブルクォートエスケープ */
function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

class NoneAdapter implements PublishAdapter {
  platform: TargetPlatform = "none";

  async publish(p: PublishablePayload, mode: PublishMode): Promise<PublishResult> {
    if (mode === "csv") {
      const header = ["タイトル", "説明", "価格", "送料", "カテゴリ", "状態", "キーワード", "画像URL"];
      const row = [
        csvCell(p.title),
        csvCell(p.description),
        csvCell(p.price),
        csvCell(p.shippingFee),
        csvCell(p.category ?? ""),
        csvCell(p.condition ?? ""),
        csvCell((p.keywords ?? []).join(" / ")),
        csvCell((p.imageUrls ?? []).join(" | ")),
      ].join(",");
      const csv = `${header.join(",")}\n${row}\n`;
      const safeTitle = p.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 30);
      return {
        ok: true,
        mode: "csv",
        csv,
        filename: `listing_${safeTitle}_${Date.now()}.csv`,
      };
    }

    if (mode === "copy") {
      const text =
        `${p.title}\n\n` +
        `${p.description}\n\n` +
        `価格: ¥${p.price.toLocaleString()}\n` +
        `送料目安: ¥${p.shippingFee.toLocaleString()}\n` +
        (p.category ? `カテゴリ: ${p.category}\n` : "") +
        (p.keywords?.length ? `\nキーワード: ${p.keywords.join(", ")}` : "");
      return { ok: true, mode: "copy", text };
    }

    return { ok: false, status: "not_implemented", reason: "未連携モードはAPI出品をサポートしません" };
  }
}

/** メルカリの価格レンジ */
const MERCARI_MIN_PRICE = 300;
const MERCARI_MAX_PRICE = 9_999_999;
/** メルカリのタイトル最大文字数 */
const MERCARI_TITLE_MAX = 40;

class MercariAdapter implements PublishAdapter {
  platform: TargetPlatform = "mercari";

  async publish(p: PublishablePayload, mode: PublishMode): Promise<PublishResult> {
    // タイトル40文字に丸める（メルカリ仕様）
    const title = p.title.length > MERCARI_TITLE_MAX
      ? p.title.slice(0, MERCARI_TITLE_MAX)
      : p.title;

    // 価格レンジチェック（範囲外は警告として返したいがCSV/copyとも形上は出力）
    const safePrice = Math.min(Math.max(p.price, MERCARI_MIN_PRICE), MERCARI_MAX_PRICE);

    if (mode === "csv") {
      const header = ["タイトル", "説明", "価格", "送料負担", "カテゴリ", "状態", "ハッシュタグ", "画像URL"];
      const row = [
        csvCell(title),
        csvCell(p.description),
        csvCell(safePrice),
        csvCell("送料込み（出品者負担）"),
        csvCell(p.category ?? ""),
        csvCell(p.condition ?? ""),
        csvCell((p.keywords ?? []).map(k => `#${k}`).join(" ")),
        csvCell((p.imageUrls ?? []).join(" | ")),
      ].join(",");
      const csv = `${header.join(",")}\n${row}\n`;
      const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 30);
      return {
        ok: true,
        mode: "csv",
        csv,
        filename: `mercari_${safeTitle}_${Date.now()}.csv`,
      };
    }

    if (mode === "copy") {
      // メルカリ向け：タイトル → 説明本文 → 状態 → ハッシュタグ の構成
      const hashtags = (p.keywords ?? []).map(k => `#${k.replace(/\s+/g, "")}`).join(" ");
      const lines = [
        title,
        "",
        p.description,
        "",
        "▼ 商品情報",
        p.condition ? `状態：${p.condition}` : null,
        p.category ? `カテゴリ：${p.category}` : null,
        "発送：送料込み（出品者負担）",
        "支払い：即購入OK／コメントなし購入歓迎",
        "",
        hashtags || null,
      ].filter(Boolean) as string[];

      return { ok: true, mode: "copy", text: lines.join("\n") };
    }

    return {
      ok: false,
      status: "not_implemented",
      reason: "メルカリは公式APIがありません。コピー＋出品画面起動でご利用ください。",
    };
  }
}

class YahooAuctionsAdapter implements PublishAdapter {
  platform: TargetPlatform = "yahoo_auctions";
  async publish(): Promise<PublishResult> {
    return {
      ok: false,
      status: "not_connected",
      reason: "ヤフオクAPI連携は準備中です。現在はCSV出力またはコピーをご利用ください。",
    };
  }
}

class EbayAdapter implements PublishAdapter {
  platform: TargetPlatform = "ebay";
  async publish(): Promise<PublishResult> {
    return {
      ok: false,
      status: "not_connected",
      reason: "eBay API連携は準備中です。現在はCSV出力またはコピーをご利用ください。",
    };
  }
}

export function getAdapter(platform: TargetPlatform): PublishAdapter {
  switch (platform) {
    case "mercari":        return new MercariAdapter();
    case "yahoo_auctions": return new YahooAuctionsAdapter();
    case "ebay":           return new EbayAdapter();
    default:               return new NoneAdapter();
  }
}
