/**
 * 仕入URLから商品画像を自動抽出する API
 * - og:image / og:image:secure_url / twitter:image を主に拾う
 * - 相対URLは絶対URLに正規化
 * - メルカリの画像必須要件解消のため imageUrls 自動入力用途
 */

import { NextRequest, NextResponse } from "next/server";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 2_000_000;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

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

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Upstream fetch failed: ${res.status}` },
        { status: 502 }
      );
    }

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
    const aborted = msg.includes("aborted") || msg.includes("timeout");
    return NextResponse.json(
      { ok: false, error: aborted ? "Upstream fetch timeout" : `Fetch error: ${msg}` },
      { status: aborted ? 504 : 500 }
    );
  }
}
