// AppSetting の取得/保存ヘルパー
import { prisma } from "@/lib/prisma";
import { encryptValue, decryptValue } from "@/lib/crypto-settings";

/**
 * 設定値を取得。secret=true のキーは復号して返す。
 * 見つからない場合は process.env のフォールバックを試す。
 */
export async function getSetting(key: string, envFallback?: string): Promise<string | null> {
  try {
    const rec = await prisma.appSetting.findUnique({ where: { key } });
    if (rec) {
      return rec.secret ? decryptValue(rec.value) : rec.value;
    }
  } catch (err) {
    console.error(`[app-settings] getSetting failed key=${key}:`, err);
  }
  if (envFallback && process.env[envFallback]) {
    return process.env[envFallback] as string;
  }
  return null;
}

/**
 * 設定値を保存。secret=true なら暗号化。
 */
export async function setSetting(
  key: string,
  value: string,
  opts: { secret?: boolean; description?: string; updatedBy?: string } = {},
): Promise<void> {
  const stored = opts.secret ? encryptValue(value) : value;
  await prisma.appSetting.upsert({
    where: { key },
    create: {
      key,
      value: stored,
      secret: opts.secret ?? false,
      description: opts.description,
      updatedBy: opts.updatedBy,
    },
    update: {
      value: stored,
      secret: opts.secret ?? false,
      description: opts.description ?? undefined,
      updatedBy: opts.updatedBy ?? undefined,
    },
  });
}

/**
 * 設定値を削除.
 */
export async function deleteSetting(key: string): Promise<void> {
  await prisma.appSetting.delete({ where: { key } }).catch(() => {});
}

// SNS自動投稿で使う設定キー一覧（UI表示用）
export const SETTING_KEYS = {
  // X (Twitter) API
  X_API_KEY: { key: "x_api_key", label: "X API Key", secret: true, group: "X (Twitter)" },
  X_API_SECRET: { key: "x_api_secret", label: "X API Secret", secret: true, group: "X (Twitter)" },
  X_ACCESS_TOKEN: { key: "x_access_token", label: "X Access Token", secret: true, group: "X (Twitter)" },
  X_ACCESS_SECRET: { key: "x_access_secret", label: "X Access Token Secret", secret: true, group: "X (Twitter)" },

  // TikTok Content Posting
  TIKTOK_CLIENT_KEY: { key: "tiktok_client_key", label: "TikTok Client Key", secret: true, group: "TikTok" },
  TIKTOK_CLIENT_SECRET: { key: "tiktok_client_secret", label: "TikTok Client Secret", secret: true, group: "TikTok" },
  TIKTOK_ACCESS_TOKEN: { key: "tiktok_access_token", label: "TikTok Access Token", secret: true, group: "TikTok" },
  TIKTOK_OPEN_ID: { key: "tiktok_open_id", label: "TikTok Open ID", secret: false, group: "TikTok" },

  // Instagram Graph API
  INSTAGRAM_ACCESS_TOKEN: { key: "instagram_access_token", label: "Instagram Access Token", secret: true, group: "Instagram" },
  INSTAGRAM_BUSINESS_ID: { key: "instagram_business_id", label: "Instagram Business ID", secret: false, group: "Instagram" },
} as const;

export type SettingKeyInfo = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
