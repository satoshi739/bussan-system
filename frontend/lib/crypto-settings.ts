// 管理者設定の暗号化ユーティリティ
// AES-256-GCM, encryption key は AUTH_SECRET から HKDF-SHA256 で派生（追加ENV不要）
import crypto from "node:crypto";

const SALT = "bussan-saas:app-setting:v1";

function deriveKey(): Buffer {
  const seed = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  if (!seed) {
    throw new Error("AUTH_SECRET/NEXTAUTH_SECRET が未設定です");
  }
  return Buffer.from(crypto.hkdfSync("sha256", seed, Buffer.from(SALT), Buffer.alloc(0), 32));
}

export function encryptValue(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // 形式: "v1:" + base64(iv|tag|ciphertext)
  return "v1:" + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptValue(ciphertextStr: string): string {
  if (!ciphertextStr.startsWith("v1:")) {
    // 平文フォールバック（マイグレーション初回など）
    return ciphertextStr;
  }
  const raw = Buffer.from(ciphertextStr.slice(3), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const key = deriveKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

/**
 * UI表示用にマスクされた値を返す（先頭4文字 + ***** + 末尾4文字）.
 * 値が短い場合は全部 ***** に置換。
 */
export function maskValue(plaintext: string): string {
  if (!plaintext) return "";
  if (plaintext.length <= 12) return "*".repeat(plaintext.length);
  return plaintext.slice(0, 4) + "*".repeat(Math.min(20, plaintext.length - 8)) + plaintext.slice(-4);
}
