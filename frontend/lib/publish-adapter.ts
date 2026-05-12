/**
 * 出品アダプタ層
 *
 * MVP: NoneAdapter のみ実機能（CSV/コピー）。
 * 将来: YahooAuctionsAdapter / EbayAdapter を追加。
 * 各アダプタは PublishAdapter を実装するだけで切り替え可能。
 */

export type TargetPlatform = "none" | "yahoo_auctions" | "ebay";

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
    case "yahoo_auctions": return new YahooAuctionsAdapter();
    case "ebay":           return new EbayAdapter();
    default:               return new NoneAdapter();
  }
}
