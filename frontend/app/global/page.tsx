"use client";

import RequirePlan from "@/components/RequirePlan";
import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Search, Globe, TrendingUp, ExternalLink, RefreshCw, ChevronDown, ChevronUp, Camera, X } from "lucide-react";

const BASE = "/api/proxy";
const req = async <T,>(path: string, opts?: RequestInit): Promise<T> => {
  const r = await fetch(`${BASE}${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

// ─── 型 ──────────────────────────────────────────────────────

type Item = { name: string; price_local: number; price_jpy: number; url: string; image: string; condition: string };
type Profit = { net_profit_jpy: number; profit_rate: number; fee_jpy: number; intl_shipping: number; is_profitable: boolean; rating?: string };
type PlatformData = {
  platform_key: string; name: string; flag: string; currency: string; area: string; fee_rate: number;
  avg_price_local: number; min_price_local: number; max_price_local: number;
  avg_price_jpy: number; item_count: number; items: Item[]; profit?: Profit;
};
type SearchResult = { keyword: string; buy_price: number | null; platforms: PlatformData[] };

// ─── スタイル ─────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)",
  borderRadius: 14, padding: "20px 24px",
};
const inp: React.CSSProperties = {
  background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.3)",
  borderRadius: 8, color: "#F5F0E8", padding: "10px 14px",
  fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box",
};

const RATING_COLOR: Record<string, string> = {
  excellent: "#D4AF37", good: "#F0D060", ok: "#ffcc44", marginal: "#ff9944", loss: "#ff4444",
};
const RATING_LABEL: Record<string, string> = {
  excellent: "優秀", good: "良い", ok: "まあまあ", marginal: "ギリギリ", loss: "赤字",
};

// 価格フォーマット
function fmtPrice(price: number, currency: string, decimals = 0) {
  if (currency === "JPY") return `¥${Math.round(price).toLocaleString()}`;
  const sym: Record<string, string> = {
    USD: "$", SGD: "S$", MYR: "RM", THB: "฿", PHP: "₱", IDR: "Rp", TWD: "NT$", GBP: "£", EUR: "€",
  };
  const s = sym[currency] ?? currency;
  return `${s}${price.toLocaleString(undefined, { maximumFractionDigits: decimals || (currency === "IDR" ? 0 : 2) })}`;
}

// ─── プラットフォーム行コンポーネント ────────────────────────

function PlatformRow({ p, rank, hasBuyPrice }: { p: PlatformData; rank: number; hasBuyPrice: boolean }) {
  const [open, setOpen] = useState(false);
  const profitColor = p.profit
    ? (RATING_COLOR[p.profit.rating ?? (p.profit.is_profitable ? "ok" : "loss")] ?? "#F5F0E8")
    : "#8A8278";

  return (
    <>
      {/* メイン行 */}
      <tr
        onClick={() => p.items.length > 0 && setOpen(!open)}
        style={{
          cursor: p.items.length > 0 ? "pointer" : "default",
          borderBottom: "1px solid rgba(212,175,55,0.07)",
          background: open ? "rgba(212,175,55,0.03)" : "transparent",
          transition: "background 0.12s",
        }}
      >
        {/* 順位 */}
        <td style={{ padding: "14px 10px", textAlign: "center", fontWeight: 700, color: rank <= 3 && hasBuyPrice ? "#D4AF37" : "#3a6a4a", width: 40 }}>
          {hasBuyPrice ? (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank) : rank}
        </td>

        {/* プラットフォーム */}
        <td style={{ padding: "14px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{p.flag}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "#8A8278" }}>{p.area} · {(p.fee_rate * 100).toFixed(1)}%手数料</div>
            </div>
          </div>
        </td>

        {/* 最安値 */}
        <td style={{ padding: "14px 10px", textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#66aaff" }}>
            {fmtPrice(p.min_price_local, p.currency)}
          </div>
          {p.currency !== "JPY" && (
            <div style={{ fontSize: 11, color: "#8A8278" }}>
              ≈ ¥{Math.round(p.items.find(i => i.price_local === p.min_price_local)?.price_jpy ?? 0).toLocaleString()}
            </div>
          )}
        </td>

        {/* 平均価格 */}
        <td style={{ padding: "14px 10px", textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#F5F0E8" }}>
            {fmtPrice(p.avg_price_local, p.currency)}
          </div>
          {p.currency !== "JPY" && (
            <div style={{ fontSize: 11, color: "#8A8278" }}>≈ ¥{p.avg_price_jpy.toLocaleString()}</div>
          )}
          <div style={{ fontSize: 11, color: "#8A8278", marginTop: 2 }}>{p.item_count}件</div>
        </td>

        {/* 最高値 */}
        <td style={{ padding: "14px 10px", textAlign: "right", color: "#ff9944", fontSize: 14 }}>
          {fmtPrice(p.max_price_local, p.currency)}
        </td>

        {/* 利益（仕入れ価格入力時のみ） */}
        {hasBuyPrice ? (
          <td style={{ padding: "14px 10px", textAlign: "right" }}>
            {p.profit ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: profitColor }}>
                  {p.profit.net_profit_jpy >= 0 ? "+" : ""}¥{p.profit.net_profit_jpy.toLocaleString()}
                </div>
                <div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: profitColor,
                    background: `${profitColor}18`, border: `1px solid ${profitColor}44`,
                    borderRadius: 20, padding: "2px 8px", display: "inline-block", marginTop: 3,
                  }}>
                    {p.profit.profit_rate > 0 ? "+" : ""}{p.profit.profit_rate}%
                    {p.profit.rating && ` · ${RATING_LABEL[p.profit.rating]}`}
                  </span>
                </div>
              </>
            ) : (
              <span style={{ color: "#3a6a4a", fontSize: 12 }}>—</span>
            )}
          </td>
        ) : null}

        {/* 展開アイコン */}
        <td style={{ padding: "14px 10px", textAlign: "center", color: "#3a6a4a", width: 32 }}>
          {p.items.length > 0 && (open ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
        </td>
      </tr>

      {/* 展開: 実際の商品リスト */}
      {open && (
        <tr>
          <td colSpan={hasBuyPrice ? 7 : 6} style={{ padding: "0 10px 16px", background: "rgba(212,175,55,0.02)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10 }}>
              {p.items.map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "rgba(10,10,11,0.7)", borderRadius: 8, padding: "8px 12px",
                    textDecoration: "none", border: "1px solid rgba(212,175,55,0.08)",
                  }}
                >
                  {item.image && (
                    <Image src={item.image} alt="" width={44} height={44} unoptimized style={{ objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#F5F0E8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.name}
                    </div>
                    {item.condition && <div style={{ fontSize: 11, color: "#8A8278" }}>{item.condition}</div>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#66aaff" }}>
                      {fmtPrice(item.price_local, p.currency)}
                    </div>
                    {p.currency !== "JPY" && (
                      <div style={{ fontSize: 11, color: "#8A8278" }}>≈ ¥{Math.round(item.price_jpy).toLocaleString()}</div>
                    )}
                  </div>
                  <ExternalLink size={12} color="#3a6a4a" style={{ flexShrink: 0 }} />
                </a>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── メインページ ─────────────────────────────────────────────

function GlobalPageContent() {
  const [keyword, setKeyword] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");
  const kwRef = useRef<HTMLInputElement>(null);

  // 画像識別
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (file: File) => {
    setImgError("");
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImgLoading(true);
      try {
        const res = await req<{ ok: boolean; product_name: string }>("/api/image/identify", {
          method: "POST",
          body: JSON.stringify({ image_data: dataUrl }),
        });
        setKeyword(res.product_name);
        // 識別後に自動検索
        setTimeout(() => doSearch(res.product_name, buyPrice), 100);
      } catch (e) {
        setImgError(String(e).includes("未設定") ? "Claude APIキーが未設定です（設定ページで登録）" : "識別に失敗しました");
      } finally {
        setImgLoading(false);
      }
    };
    reader.readAsDataURL(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyPrice]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleImageUpload(file);
  }, [handleImageUpload]);

  const clearImage = () => {
    setImagePreview(null);
    setImgError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const doSearch = useCallback(async (kw = keyword, bp = buyPrice) => {
    if (!kw.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await req<SearchResult>("/api/global/all-platforms", {
        method: "POST",
        body: JSON.stringify({
          keyword: kw.trim(),
          buy_price_jpy: bp ? parseFloat(bp) : null,
          limit: 5,
        }),
      });
      setResult(data);
    } catch {
      setError("検索に失敗しました。APIサーバーが起動しているか確認してください。");
    } finally {
      setLoading(false);
    }
  }, [keyword, buyPrice]);

  const hasBuyPrice = !!(result?.buy_price && result.buy_price > 0);
  const bestPlatform = hasBuyPrice
    ? result?.platforms.find(p => p.profit?.is_profitable)
    : result?.platforms[0];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ヘッダー */}
      <div style={{ marginBottom: 28 }}>
        <div className="global-header" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Globe size={22} color="#D4AF37" />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", margin: 0 }}>
            全プラットフォーム相場比較
          </h1>
        </div>
        <p style={{ fontSize: 12, color: "#8A8278", margin: 0, marginTop: 3 }}>
          商品名を入れると、日本・海外の全プラットフォームで「今いくらで売れるか」を一発で比較
        </p>
      </div>

      {/* 検索フォーム */}
      <div style={{ ...card, marginBottom: 24 }}>
        {/* 画像アップロードエリア */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#8A8278", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Camera size={13} color="#8A8278" />
            写真から商品を識別（AI自動認識）
            <span style={{ fontWeight: 400, color: "#3a6a4a" }}>— 商品の写真をアップロードすると自動で検索します</span>
          </div>

          {imagePreview ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Image src={imagePreview} alt="アップロード画像" width={80} height={80} unoptimized style={{ objectFit: "cover", borderRadius: 10, border: "1px solid rgba(212,175,55,0.25)" }} />
                <button onClick={clearImage} style={{ position: "absolute", top: -6, right: -6, background: "rgba(255,80,80,0.9)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                  <X size={10} color="white" />
                </button>
              </div>
              <div style={{ flex: 1 }}>
                {imgLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ffcc44", fontSize: 13 }}>
                    <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
                    AIが商品を識別中...
                  </div>
                ) : imgError ? (
                  <div style={{ fontSize: 12, color: "#ff6644" }}>{imgError}</div>
                ) : keyword ? (
                  <div style={{ fontSize: 13, color: "#D4AF37" }}>
                    識別完了 → <span style={{ fontWeight: 700 }}>「{keyword}」</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{
                border: "2px dashed rgba(212,175,55,0.2)", borderRadius: 10,
                padding: "20px 16px", textAlign: "center", cursor: "pointer",
                background: "rgba(212,175,55,0.02)", transition: "border-color 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              }}
            >
              <Camera size={22} color="#3a7a5a" />
              <div>
                <div style={{ fontSize: 13, color: "#5a9a7a", fontWeight: 600 }}>写真をドラッグ＆ドロップ、またはクリックして選択</div>
                <div style={{ fontSize: 11, color: "#3a6a4a", marginTop: 2 }}>JPG / PNG / WEBP — AI（Claude）が商品名を自動識別して検索します</div>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
        </div>

        <div style={{ borderTop: "1px solid rgba(212,175,55,0.08)", marginBottom: 16 }} />

        <div className="global-search-row" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          {/* キーワード */}
          <div style={{ flex: 2, minWidth: 220 }}>
            <label style={{ fontSize: 12, color: "#8A8278", display: "block", marginBottom: 5, fontWeight: 600 }}>
              商品名・キーワード
            </label>
            <div style={{ position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8A8278" }} />
              <input
                ref={kwRef}
                style={{ ...inp, paddingLeft: 36 }}
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch()}
                placeholder="例: Nintendo Switch、ポケモンカード、鬼滅の刃..."
                autoFocus
              />
            </div>
          </div>

          {/* 仕入れ価格（任意） */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 12, color: "#8A8278", display: "block", marginBottom: 5, fontWeight: 600 }}>
              仕入れ価格（円）<span style={{ color: "#3a5a4a", fontWeight: 400 }}>  任意</span>
            </label>
            <input
              style={inp}
              type="number"
              value={buyPrice}
              onChange={e => setBuyPrice(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder="例: 15000"
            />
          </div>

          {/* 検索ボタン */}
          <button
            onClick={() => doSearch()}
            disabled={loading || !keyword.trim()}
            style={{
              background: loading ? "rgba(212,175,55,0.05)" : "linear-gradient(135deg,#1e1608,#2a1e08)",
              border: "1px solid rgba(212,175,55,0.4)", borderRadius: 10, color: "#D4AF37",
              padding: "10px 28px", fontWeight: 700, fontSize: 14, cursor: loading || !keyword.trim() ? "not-allowed" : "pointer",
              opacity: !keyword.trim() ? 0.5 : 1, whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-end",
            }}
          >
            {loading
              ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> 検索中...</>
              : <><Globe size={14} /> 全プラットフォーム検索</>}
          </button>
        </div>

        {buyPrice && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#8A8278" }}>
            ✦ 仕入れ価格 ¥{parseInt(buyPrice).toLocaleString()} を入力中 — 各プラットフォームでの利益も計算します
          </div>
        )}
      </div>

      {error && (
        <div style={{ ...card, borderColor: "rgba(255,80,80,0.3)", color: "#ff6644", marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* 検索中プレースホルダー */}
      {loading && (
        <div style={{ ...card, textAlign: "center", padding: "48px 24px" }}>
          <RefreshCw size={32} color="#D4AF37" style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <div style={{ color: "#F5F0E8", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>全プラットフォームを検索中...</div>
          <div style={{ color: "#8A8278", fontSize: 13 }}>
            メルカリ・ヤフオク・ラクマ・eBay・Shopee・Lazada を同時に検索しています
          </div>
        </div>
      )}

      {/* 検索結果 */}
      {result && !loading && (
        <>
          {/* サマリーバナー */}
          <div className="global-summary-cards" style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ ...card, flex: 1, minWidth: 180, padding: "14px 20px" }}>
              <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 4 }}>検索キーワード</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#F5F0E8" }}>「{result.keyword}」</div>
            </div>
            <div style={{ ...card, flex: 1, minWidth: 160, padding: "14px 20px" }}>
              <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 4 }}>データ取得プラットフォーム</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#D4AF37" }}>{result.platforms.length} サイト</div>
            </div>
            {bestPlatform && (
              <div style={{ ...card, flex: 2, minWidth: 260, padding: "14px 20px", borderColor: "rgba(212,175,55,0.4)" }}>
                <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 4 }}>
                  {hasBuyPrice ? "🥇 最も利益が出るプラットフォーム" : "💰 最も高く売れるプラットフォーム"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{bestPlatform.flag}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#D4AF37" }}>{bestPlatform.name}</div>
                    <div style={{ fontSize: 13, color: "#F5F0E8" }}>
                      平均 {fmtPrice(bestPlatform.avg_price_local, bestPlatform.currency)}
                      {bestPlatform.currency !== "JPY" && ` ≈ ¥${bestPlatform.avg_price_jpy.toLocaleString()}`}
                      {hasBuyPrice && bestPlatform.profit && (
                        <span style={{ color: "#D4AF37", fontWeight: 700, marginLeft: 10 }}>
                          利益 +¥{bestPlatform.profit.net_profit_jpy.toLocaleString()} ({bestPlatform.profit.profit_rate}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* メイン: 全プラットフォーム一覧テーブル */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <TrendingUp size={16} color="#D4AF37" />
              <span style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 15 }}>
                {hasBuyPrice ? "利益ランキング" : "販売相場一覧"}
              </span>
              <span style={{ fontSize: 12, color: "#8A8278" }}>
                {hasBuyPrice
                  ? `仕入れ ¥${parseInt(String(result.buy_price)).toLocaleString()} ベースで計算`
                  : "行をクリックで実際の商品を確認"}
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
                    <th style={{ padding: "8px 10px", color: "#8A8278", fontWeight: 600, textAlign: "center", width: 40 }}>#</th>
                    <th style={{ padding: "8px 10px", color: "#8A8278", fontWeight: 600, textAlign: "left" }}>プラットフォーム</th>
                    <th style={{ padding: "8px 10px", color: "#8A8278", fontWeight: 600, textAlign: "right" }}>最安値</th>
                    <th style={{ padding: "8px 10px", color: "#8A8278", fontWeight: 600, textAlign: "right" }}>平均価格</th>
                    <th style={{ padding: "8px 10px", color: "#8A8278", fontWeight: 600, textAlign: "right" }}>最高値</th>
                    {hasBuyPrice && (
                      <th style={{ padding: "8px 10px", color: "#8A8278", fontWeight: 600, textAlign: "right" }}>利益（推定）</th>
                    )}
                    <th style={{ width: 32 }} />
                  </tr>
                </thead>
                <tbody>
                  {result.platforms.map((p, i) => (
                    <PlatformRow key={p.platform_key} p={p} rank={i + 1} hasBuyPrice={hasBuyPrice} />
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 14, fontSize: 11, color: "#3a6a4a" }}>
              * 行をクリックすると実際の商品一覧を表示 /
              価格は現時点の相場（リアルタイム取得） /
              海外プラットフォームの利益には国際送料を含む
            </div>
          </div>
        </>
      )}

      {/* 初期状態 */}
      {!result && !loading && !error && (
        <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, textAlign: "center", padding: "56px 24px" }}>
          <Globe size={40} color="rgba(212,175,55,0.25)" style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: "#C8C0B0", marginBottom: 8 }}>
            商品名を入力して検索してください
          </div>
          <div style={{ fontSize: 13, color: "#8A8278", marginBottom: 20 }}>
            日本（メルカリ・ヤフオク・ラクマ）と海外（eBay・Shopee・Lazada）の<br />
            現在の販売価格を同時に取得して比較します
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {["Nintendo Switch", "ポケモンカード", "AirPods Pro", "LEGO"].map(kw => (
              <button
                key={kw}
                onClick={() => { setKeyword(kw); doSearch(kw, buyPrice); }}
                style={{
                  background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)",
                  borderRadius: 20, color: "#8A8278", padding: "6px 16px", fontSize: 13, cursor: "pointer",
                }}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes sk { 0%,100%{opacity:.9} 50%{opacity:.4} }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
        .global-row:hover { background: rgba(212,175,55,0.05) !important; }
        .global-row { transition: background 0.12s; }
        @media (max-width: 768px) {
          .global-header { flex-direction: column !important; gap: 6px; }
          .global-search-row { flex-direction: column !important; }
          .global-search-row > * { width: 100% !important; min-width: unset !important; }
          .global-summary-cards { flex-direction: column !important; }
          .global-summary-cards > * { min-width: unset !important; width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

export default function GlobalPage() {
  return (
    <RequirePlan requiredPlan="STANDARD" featureName="グローバル検索">
      <GlobalPageContent />
    </RequirePlan>
  );
}
