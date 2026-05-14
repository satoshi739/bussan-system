/**
 * 仕入URLから商品画像を自動抽出する API
 * - og:image / og:image:secure_url / twitter:image を主に拾う
 * - 相対URLは絶対URLに正規化
 * - メルカリの画像必須要件解消のため imageUrls 自動入力用途
 */

import { NextRequest, NextResponse } from "next/server";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_RETRIES = 2;

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
