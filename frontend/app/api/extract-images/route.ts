/**
 * 仕入URLから商品画像を自動抽出する API
 * - og:image / og:image:secure_url / twitter:image を主に拾う
 * - 相対URLは絶対URLに正規化
 * - メルカリの画像必須要件解消のため imageUrls 自動入力用途
 * - 楽天市場URLは Bot対策(Akamai) で取得不可のため、楽天市場商品検索API を使う
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as dns } from "node:dns";
import net from "node:net";

const FETCH_TIMEOUT_MS = 15_000;

/**
 * SSRF対策: 与えられたhostnameがプライベート/ループバック/リンクローカル/メタデータ
 * エンドポイントを指していないか検証する。IP literalもDNS解決済みIPも両方チェック。
 * 安全なら true、危険なら false を返す。
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local / AWS/GCP metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}
function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::" || v === "0:0:0:0:0:0:0:1") return true;
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique-local
  if (v.startsWith("fe80")) return true; // link-local
  if (v.startsWith("::ffff:")) return isPrivateIPv4(v.replace(/^::ffff:/, ""));
  return false;
}
async function assertSafeHost(hostname: string): Promise<void> {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local") ||
      lower === "metadata.google.internal" || lower.endsWith(".internal")) {
    throw new Error("blocked: private/internal hostname");
  }
  const v = net.isIP(hostname);
  if (v === 4 && isPrivateIPv4(hostname)) throw new Error("blocked: private IPv4");
  if (v === 6 && isPrivateIPv6(hostname)) throw new Error("blocked: private IPv6");
  if (v !== 0) return; // public IP literal → OK
  // ホスト名 → 解決して全アドレスをチェック
  const addrs = await dns.lookup(hostname, { all: true });
  for (const a of addrs) {
    if (a.family === 4 && isPrivateIPv4(a.address)) throw new Error("blocked: resolved to private IPv4");
    if (a.family === 6 && isPrivateIPv6(a.address)) throw new Error("blocked: resolved to private IPv6");
  }
}
const MAX_HTML_BYTES = 2_000_000;
const MAX_RETRIES = 2;

const RAKUTEN_HOST = "item.rakuten.co.jp";
const RAKUTEN_API = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601";
const RAKUTEN_FAIL_MESSAGE = "楽天画像の自動取得に失敗しました。画像URLを手動で追加してください";

/** Bot対策の厳しいサイトに対応するための最新ブラウザUA群 */
const USER_AGENTS = [
  // Chrome on macOS (最新版)
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  // Chrome on Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  // Safari on iPhone (モバイル系で弾かれにくい)
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
];

function absolutize(url: string, base: URL): string | null {
  try {
    const u = new URL(url, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * 楽天市場URL（item.rakuten.co.jp/{shop}/{itemcode}/）から
 * 楽天API用の itemCode（{shop}:{itemcode}）を抽出する。
 * 楽天ドメインでない・shop/itemcode が取れない場合は null。
 */
function extractRakutenItemCode(parsed: URL): string | null {
  if (parsed.host !== RAKUTEN_HOST) return null;
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  const shop = segments[0];
  const itemCode = segments[1];
  if (!shop || !itemCode) return null;
  return `${shop}:${itemCode}`;
}

/**
 * 楽天市場商品検索APIで mediumImageUrls / smallImageUrls を取得する。
 * 失敗時は null を返し、呼び出し側で「自動取得失敗」として扱う。
 * formatVersion=2 を指定して画像URLを単純な string[] で受け取る。
 */
async function fetchRakutenImages(itemCode: string, appId: string): Promise<string[] | null> {
  const apiUrl = new URL(RAKUTEN_API);
  apiUrl.searchParams.set("applicationId", appId);
  apiUrl.searchParams.set("itemCode", itemCode);
  apiUrl.searchParams.set("format", "json");
  apiUrl.searchParams.set("formatVersion", "2");
  apiUrl.searchParams.set("hits", "1");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(apiUrl.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const items = data?.Items;
    if (!Array.isArray(items) || items.length === 0) return null;
    const item = items[0];
    const medium = Array.isArray(item?.mediumImageUrls) ? item.mediumImageUrls : [];
    const small = Array.isArray(item?.smallImageUrls) ? item.smallImageUrls : [];
    const urls = new Set<string>();
    for (const u of [...medium, ...small]) {
      if (typeof u === "string" && (u.startsWith("https://") || u.startsWith("http://"))) {
        urls.add(u);
      }
    }
    return Array.from(urls);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractImageUrls(html: string, base: URL): string[] {
  const found = new Set<string>();

  const patterns: RegExp[] = [
    /<meta[^>]+property=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url|:url)?["']/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/gi,
  ];

  for (const re of patterns) {
    const matches = html.matchAll(re);
    for (const m of matches) {
      const abs = absolutize(m[1], base);
      if (abs) found.add(abs);
    }
  }

  return Array.from(found);
}

export async function POST(req: NextRequest) {
  let url: string | undefined;
  try {
    const body = await req.json();
    url = body?.url;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid URL format" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ ok: false, error: "Only http/https URLs supported" }, { status: 400 });
  }

  // SSRF対策: プライベート/ループバック/メタデータエンドポイントを遮断
  try {
    await assertSafeHost(parsed.hostname);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[extract-images] blocked host=${parsed.hostname}: ${msg}`);
    return NextResponse.json({ ok: false, error: "このURLは取得できません" }, { status: 400 });
  }

  // 楽天市場URLは Bot対策(Akamai) で og:image を取れないため、商品検索APIで取得する
  const rakutenItemCode = extractRakutenItemCode(parsed);
  if (rakutenItemCode) {
    const appId = process.env.RAKUTEN_APP_ID;
    if (!appId) {
      return NextResponse.json(
        { ok: false, error: RAKUTEN_FAIL_MESSAGE },
        { status: 500 }
      );
    }
    const urls = await fetchRakutenImages(rakutenItemCode, appId);
    if (!urls || urls.length === 0) {
      return NextResponse.json(
        { ok: false, error: RAKUTEN_FAIL_MESSAGE },
        { status: 502 }
      );
    }
    return NextResponse.json({
      ok: true,
      urls,
      source: parsed.toString(),
      count: urls.length,
    });
  }

  // 最大 MAX_RETRIES+1 回トライ。UAをローテーションしながら成功するまで試す。
  let lastError: { status: number; message: string } | null = null;
  let res: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const ua = USER_AGENTS[attempt % USER_AGENTS.length];
    const origin = `${parsed.protocol}//${parsed.host}`;

    try {
      res = await fetch(parsed.toString(), {
        headers: {
          "User-Agent": ua,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Referer: origin + "/",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timer);

      if (res.ok) {
        break;
      }
      lastError = { status: res.status, message: `HTTP ${res.status}` };
      res = null;
    } catch (e) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message : String(e);
      const aborted = msg.includes("aborted") || msg.includes("timeout");
      lastError = { status: aborted ? 504 : 500, message: aborted ? "timeout" : msg };
      res = null;
    }

    // 次のトライまで待機（指数バックオフ・250ms / 500ms）
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
    }
  }

  if (!res) {
    const isTimeout = lastError?.message === "timeout";
    return NextResponse.json(
      {
        ok: false,
        error: isTimeout
          ? "Upstream fetch timeout (この商品サイトはBot対策で取得できません。手動で画像URLを追加してください)"
          : `Upstream fetch failed: ${lastError?.message ?? "unknown"}`,
      },
      { status: isTimeout ? 504 : 502 }
    );
  }

  try {
    const reader = res.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          received += value.byteLength;
          if (received > MAX_HTML_BYTES) {
            try { await reader.cancel(); } catch {}
            break;
          }
          chunks.push(value);
        }
      }
    }

    const buffer = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) {
      buffer.set(c, offset);
      offset += c.byteLength;
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);

    const urls = extractImageUrls(html, parsed);

    return NextResponse.json({
      ok: true,
      urls,
      source: parsed.toString(),
      count: urls.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: `Parse error: ${msg}` },
      { status: 500 }
    );
  }
}
