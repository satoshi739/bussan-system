"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Copy, Download, CheckCircle2, AlertTriangle,
  ShieldAlert, Tag, RefreshCw, FileText, Image as ImageIcon, X,
} from "lucide-react";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";
import { PLATFORMS, MERCARI_SELL_URL, YAHOO_AUCTIONS_SELL_URL, EBAY_SELL_URL, type TargetPlatform } from "@/lib/publish-adapter";
import { validateListing, hasBlockingError, type ValidationWarning } from "@/lib/listing-validator";

const inp: React.CSSProperties = {
  background: "var(--surface-2)", border: "1px solid var(--border)",
  borderRadius: 12, color: "var(--text)", padding: "12px 14px", fontSize: 15,
  width: "100%", outline: "none", boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  fontSize: 11, color: "var(--text-3)", fontWeight: 700,
  display: "block", marginBottom: 6, letterSpacing: "0.06em",
};

type QuickListingItem = {
  id: string;
  productName: string;
  sourceUrl: string | null;
  buyPrice: number | null;
  estPrice: number | null;
  condition: string | null;
  category: string | null;
  notes: string | null;
  weightG: number | null;
  sizeCode: string | null;
  imageUrls: string[];
  aiTitle: string | null;
  aiDescription: string | null;
  aiCategories: string[];
  aiKeywords: string[];
  aiSuggestedPrice: number | null;
  aiProfitEstimate: number | null;
  aiShippingEstimate: number | null;
  aiWarnings: string[];
  targetPlatform: string;
  status: "DRAFT" | "CONFIRMED" | "CSV_EXPORTED" | "API_PENDING" | "PUBLISHED";
};

const STATUS_LABEL: Record<QuickListingItem["status"], { label: string; color: string }> = {
  DRAFT:         { label: "下書き",         color: "#9aa3b2" },
  CONFIRMED:     { label: "確認済み",       color: "#60BFEF" },
  CSV_EXPORTED:  { label: "CSV出力済み",    color: "#A88BFF" },
  API_PENDING:   { label: "API出品準備中",  color: "#FFC857" },
  PUBLISHED:     { label: "出品済み",       color: "#34C759" },
};

export default function QuickListingPreviewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<QuickListingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 編集用ローカル状態
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [platform, setPlatform] = useState<TargetPlatform>("none");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImg, setNewImg] = useState("");
  const [fetchingImages, setFetchingImages] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/quick/${id}`);
      if (!res.ok) throw new Error(await res.text());
      const { item: i } = await res.json();
      setItem(i);
      setTitle(i.aiTitle ?? i.productName ?? "");
      setDescription(i.aiDescription ?? i.notes ?? "");
      setCategory(i.category ?? i.aiCategories[0] ?? "");
      setPrice(i.aiSuggestedPrice ?? i.estPrice ?? 0);
      setShippingFee(i.aiShippingEstimate ?? 0);
      setKeywords(i.aiKeywords ?? []);
      setWarnings(i.aiWarnings ?? []);
      setPlatform((i.targetPlatform as TargetPlatform) ?? "none");
      setImageUrls(i.imageUrls ?? []);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const buyPrice = item?.buyPrice ?? 0;
  const profit = price - buyPrice - shippingFee;
  const profitRate = price > 0 ? (profit / price) * 100 : 0;

  // ライブバリデーション
  const liveWarnings: ValidationWarning[] = validateListing({
    title, description, price, shippingFee, category, imageUrls, platform,
  });
  const blocked = hasBlockingError(liveWarnings);

  // メルカリのタイトル文字数色分け
  const titleOver = platform === "mercari" && title.length > 40;

  const handleSave = async (extra: Partial<QuickListingItem> = {}) => {
    if (!item) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/quick/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiTitle: title,
          aiDescription: description,
          category,
          aiSuggestedPrice: price,
          aiShippingEstimate: shippingFee,
          aiKeywords: keywords,
          targetPlatform: platform,
          imageUrls,
          ...extra,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { item: updated } = await res.json();
      setItem(updated);
      toast("保存しました");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!item) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/ai/listing-quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: item.productName,
          source_url: item.sourceUrl || undefined,
          buy_price: item.buyPrice ?? undefined,
          est_price: price || undefined,
          condition: item.condition || undefined,
          category: category || undefined,
          notes: item.notes || undefined,
          weight_g: item.weightG ?? undefined,
          size_code: item.sizeCode || undefined,
          target_platform: platform,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { draft } = await res.json();
      setTitle(draft.title);
      setDescription(draft.description);
      setPrice(draft.suggested_price ?? price);
      setShippingFee(draft.shipping_estimate ?? shippingFee);
      setKeywords(draft.keywords ?? []);
      setWarnings(draft.warnings ?? []);
      toast("AIで再生成しました");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setRegenerating(false);
    }
  };

  const handleMarkConfirmed = async () => {
    await handleSave({ status: "CONFIRMED" });
  };

  /**
   * コピー＋外部サイト起動の擬似1クリック出品。
   * メルカリ・ヤフオク・eBay 共通フロー。
   */
  const handlePlatformPublish = async (sellUrl: string, label: string) => {
    if (!item) return;
    if (blocked) {
      toast("エラー項目を解消してから出品してください", "error");
      return;
    }
    setPublishing(true);
    try {
      await handleSave();
      const res = await fetch(`/api/listings/quick/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "copy" }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast(data.reason ?? data.error ?? "出品処理に失敗しました", "error");
        return;
      }
      await navigator.clipboard.writeText(data.text);
      window.open(sellUrl, "_blank", "noopener,noreferrer");
      toast(`コピー完了！${label}の出品画面で貼り付けてください`);
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setPublishing(false);
    }
  };

  const handleMercariPublish = () => handlePlatformPublish(MERCARI_SELL_URL, "メルカリ");
  const handleYahooPublish   = () => handlePlatformPublish(YAHOO_AUCTIONS_SELL_URL, "ヤフオク");
  const handleEbayPublish    = () => handlePlatformPublish(EBAY_SELL_URL, "eBay");

  const handlePublish = async (mode: "csv" | "copy" | "api") => {
    if (!item) return;
    if (blocked) {
      toast("エラー項目を解消してから出品してください", "error");
      return;
    }
    setPublishing(true);
    try {
      // まず編集中の内容を保存
      await handleSave();

      const res = await fetch(`/api/listings/quick/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();

      if (!data.ok) {
        toast(data.reason ?? data.error ?? "出品処理に失敗しました", "error");
        return;
      }

      if (data.mode === "csv") {
        const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = data.filename; a.click();
        URL.revokeObjectURL(url);
        toast("CSVをダウンロードしました");
      } else if (data.mode === "copy") {
        await navigator.clipboard.writeText(data.text);
        toast("出品文をコピーしました");
      } else {
        toast("API出品が完了しました");
      }
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setPublishing(false);
    }
  };

  const addImg = () => {
    const v = newImg.trim();
    if (!v) return;
    if (imageUrls.includes(v)) { toast("既に追加されています", "error"); return; }
    setImageUrls([...imageUrls, v]);
    setNewImg("");
  };
  const rmImg = (i: number) => setImageUrls(imageUrls.filter((_, idx) => idx !== i));

  const fetchImagesFromUrl = async () => {
    if (!item?.sourceUrl) {
      toast("商品URLが登録されていません", "error");
      return;
    }
    setFetchingImages(true);
    try {
      const res = await fetch("/api/extract-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.sourceUrl }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast(data.error ?? "画像を取得できませんでした", "error");
        return;
      }
      const fetched: string[] = data.urls ?? [];
      if (fetched.length === 0) {
        toast("このURLからは画像を抽出できませんでした", "error");
        return;
      }
      const merged = Array.from(new Set([...imageUrls, ...fetched]));
      const added = merged.length - imageUrls.length;
      setImageUrls(merged);
      toast(`画像を ${added} 件取得しました`);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setFetchingImages(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 0" }}>
        <style>{`
          @keyframes sk-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.85; } }
          .sk { background: var(--surface-2); border-radius: 10px; animation: sk-pulse 1.4s ease-in-out infinite; }
        `}</style>
        <div className="sk" style={{ height: 28, width: "40%", marginBottom: 18 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
          <div>
            <div className="sk" style={{ height: 220, marginBottom: 16 }} />
            <div className="sk" style={{ height: 140, marginBottom: 16 }} />
            <div className="sk" style={{ height: 180 }} />
          </div>
          <div>
            <div className="sk" style={{ height: 120, marginBottom: 14 }} />
            <div className="sk" style={{ height: 160 }} />
          </div>
        </div>
      </div>
    );
  }
  if (!item) {
    return (
      <div style={{ maxWidth: 900, margin: "60px auto", textAlign: "center", color: "var(--text-3)" }}>
        出品案が見つかりませんでした
      </div>
    );
  }

  const platformMeta = PLATFORMS.find(p => p.id === platform) ?? PLATFORMS[0];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        .ql-prv-row { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
        @media (max-width: 900px) { .ql-prv-row { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/listings/quick")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "var(--text-3)", padding: "7px 12px", cursor: "pointer", fontSize: 12 }}>
          <ArrowLeft size={13} /> 入力画面へ戻る
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            background: `${STATUS_LABEL[item.status].color}22`,
            border: `1px solid ${STATUS_LABEL[item.status].color}55`,
            color: STATUS_LABEL[item.status].color,
            borderRadius: 16, padding: "3px 12px", fontSize: 11, fontWeight: 700,
          }}>{STATUS_LABEL[item.status].label}</span>
          <button onClick={handleRegenerate} disabled={regenerating}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(64,170,223,0.12)", border: "1px solid rgba(64,170,223,0.3)", borderRadius: 8, color: "#60BFEF", padding: "7px 12px", cursor: regenerating ? "wait" : "pointer", fontSize: 12, fontWeight: 700 }}>
            <RefreshCw size={12} /> {regenerating ? "再生成中..." : "AIで再生成"}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", margin: 0 }}>
          出品プレビュー
        </h1>
        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
          STEP 2 / 3 — 内容を確認・編集してください。各項目は直接編集できます。
        </div>
      </div>

      {/* 警告バナー */}
      {liveWarnings.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {liveWarnings.map((w, i) => (
            <div key={i} style={{
              background: w.level === "error" ? "rgba(255,90,90,0.08)" : "rgba(255,200,87,0.06)",
              border: `1px solid ${w.level === "error" ? "rgba(255,90,90,0.3)" : "rgba(255,200,87,0.25)"}`,
              borderRadius: 8, padding: "8px 12px", marginBottom: 6,
              display: "flex", alignItems: "center", gap: 8,
              color: w.level === "error" ? "#ff8a8a" : "#FFC857",
              fontSize: 12,
            }}>
              {w.level === "error" ? <ShieldAlert size={13} /> : <AlertTriangle size={13} />}
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="ql-prv-row">
        {/* 左カラム: 編集エリア */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 14, padding: "20px 22px",
        }}>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>商品タイトル</label>
            <input
              style={{
                ...inp,
                border: titleOver ? "1px solid rgba(255,90,90,0.5)" : inp.border,
              }}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <div style={{ fontSize: 10, color: titleOver ? "#ff6a6a" : "var(--text-3)", marginTop: 4, fontWeight: titleOver ? 700 : 400 }}>
              {title.length} 文字
              {platform === "mercari" && (
                <span style={{ marginLeft: 6, opacity: 0.85 }}>
                  / メルカリ上限 40文字
                </span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>商品説明</label>
            <textarea
              style={{ ...inp, minHeight: 200, fontFamily: "inherit", resize: "vertical", lineHeight: 1.65 }}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>{description.length} 文字</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lbl}>カテゴリ</label>
              <input style={inp} value={category} onChange={e => setCategory(e.target.value)} placeholder="例: 家電・カメラ" />
              {item.aiCategories.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {item.aiCategories.slice(0, 3).map(c => (
                    <button key={c} type="button" onClick={() => setCategory(c)}
                      style={{ background: "rgba(64,170,223,0.06)", border: "1px solid rgba(64,170,223,0.2)", borderRadius: 12, padding: "2px 8px", fontSize: 10, color: "#60BFEF", cursor: "pointer" }}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>販売価格（円）</label>
              <input type="number" min={0} step={100} inputMode="numeric" style={inp} value={price || ""} onChange={e => setPrice(Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <div>
              <label style={lbl}>送料目安（円）</label>
              <input type="number" min={0} step={50} inputMode="numeric" style={inp} value={shippingFee || ""} onChange={e => setShippingFee(Math.max(0, Number(e.target.value) || 0))} />
            </div>
          </div>

          {/* キーワード */}
          {keywords.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>検索キーワード（AI生成）</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {keywords.map((k, i) => (
                  <span key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "3px 10px", fontSize: 11, color: "var(--text-2)" }}>
                    #{k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 画像 */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>画像URL</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input style={inp} placeholder="https://..." value={newImg}
                onChange={e => setNewImg(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addImg(); } }} />
              <button onClick={addImg} style={{ background: "rgba(64,170,223,0.12)", border: "1px solid rgba(64,170,223,0.3)", borderRadius: 8, color: "#60BFEF", padding: "0 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>追加</button>
            </div>
            {item?.sourceUrl && (
              <button
                onClick={fetchImagesFromUrl}
                disabled={fetchingImages}
                style={{
                  marginTop: 8,
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(255,170,90,0.10)",
                  border: "1px solid rgba(255,170,90,0.35)",
                  borderRadius: 8,
                  color: "#ffb56b",
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: fetchingImages ? "not-allowed" : "pointer",
                  opacity: fetchingImages ? 0.5 : 1,
                }}
              >
                <Download size={11} /> {fetchingImages ? "取得中…" : "商品URLから画像を自動取得"}
              </button>
            )}
            {imageUrls.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {imageUrls.map((u, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "3px 8px 3px 6px", fontSize: 10, color: "var(--text-3)", maxWidth: 240 }}>
                    <ImageIcon size={10} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{u}</span>
                    <button onClick={() => rmImg(i)} style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", padding: 0 }}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* AI注意事項 */}
          {warnings.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <label style={lbl}>AIからの注意事項</label>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* 右カラム: サマリ + 出品アクション */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 利益見込みカード */}
          <div style={{
            background: "linear-gradient(135deg,rgba(212,175,55,0.08),rgba(212,175,55,0.02))",
            border: "1px solid rgba(212,175,55,0.25)",
            borderRadius: 14, padding: "18px 20px",
          }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>
              利益見込み
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: profit >= 0 ? "#D4AF37" : "#ff6666" }}>
              {profit >= 0 ? "+" : ""}¥{profit.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
              利益率 {profitRate.toFixed(1)}%
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 12, paddingTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, color: "var(--text-3)" }}>
              <div>販売価格<br /><span style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>¥{price.toLocaleString()}</span></div>
              <div>仕入れ価格<br /><span style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>¥{buyPrice.toLocaleString()}</span></div>
              <div>送料目安<br /><span style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>¥{shippingFee.toLocaleString()}</span></div>
              <div>カテゴリ<br /><span style={{ color: "var(--text)", fontWeight: 700, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{category || "未設定"}</span></div>
            </div>
          </div>

          {/* 出品先選択 */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 14, padding: "16px 18px",
          }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>
              出品先
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => p.available || p.id === "none" ? setPlatform(p.id) : null}
                  disabled={!p.available && p.id !== "none"}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: platform === p.id ? "rgba(64,170,223,0.12)" : "transparent",
                    border: platform === p.id ? "1px solid rgba(64,170,223,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8, padding: "8px 12px", cursor: (p.available || p.id === "none") ? "pointer" : "not-allowed",
                    opacity: (p.available || p.id === "none") ? 1 : 0.5, textAlign: "left", width: "100%",
                  }}>
                  <span style={{ fontSize: 13, color: platform === p.id ? "#60BFEF" : "var(--text-2)", fontWeight: 600 }}>
                    {p.label}
                  </span>
                  <span style={{ fontSize: 10, color: p.available ? "#34C759" : "var(--text-3)" }}>
                    {p.statusLabel}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 8, lineHeight: 1.5 }}>
              {platformMeta.available
                ? "現在の出品先はCSV/コピーで運用します。API連携後は自動切替されます。"
                : "API連携の準備が完了次第、ここから直接出品できるようになります。"}
            </div>
          </div>

          {/* アクションボタン */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 14, padding: "16px 18px",
          }}>
            <button
              onClick={handleMarkConfirmed}
              disabled={blocked || saving}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: blocked ? "rgba(100,100,100,0.2)" : "linear-gradient(135deg,#1e1608,#2a1e08)",
                border: blocked ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(212,175,55,0.45)",
                borderRadius: 10, color: blocked ? "var(--text-3)" : "var(--blue)",
                padding: "12px", fontSize: 14, fontWeight: 800,
                cursor: blocked || saving ? "not-allowed" : "pointer",
                marginBottom: 8,
              }}>
              <CheckCircle2 size={14} /> {saving ? "保存中..." : "出品準備完了"}
            </button>

            {/* メイン出品アクション（プラットフォーム別・コピー＋外部サイト起動方式） */}
            {platform === "mercari" && (
              <>
                <button onClick={handleMercariPublish} disabled={publishing || blocked}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: "linear-gradient(135deg,#ff4f81,#ff2d65)",
                    border: "1px solid rgba(255,79,129,0.5)",
                    borderRadius: 14, color: "#fff", padding: "14px",
                    fontSize: 14, fontWeight: 800,
                    cursor: (publishing || blocked) ? "not-allowed" : "pointer",
                    opacity: (publishing || blocked) ? 0.5 : 1,
                    boxShadow: (publishing || blocked) ? "none" : "0 4px 14px rgba(255,79,129,0.28)",
                    marginBottom: 6,
                  }}>
                  <Tag size={14} /> メルカリで出品（コピー＋アプリ起動）
                </button>
                <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5, marginBottom: 10, textAlign: "center" }}>
                  ※ 出品文がクリップボードにコピーされます。メルカリアプリの出品画面で長押し→貼り付けてください。
                </div>
              </>
            )}
            {platform === "yahoo_auctions" && (
              <>
                <button onClick={handleYahooPublish} disabled={publishing || blocked}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                    border: "1px solid rgba(124,58,237,0.5)",
                    borderRadius: 14, color: "#fff", padding: "14px",
                    fontSize: 14, fontWeight: 800,
                    cursor: (publishing || blocked) ? "not-allowed" : "pointer",
                    opacity: (publishing || blocked) ? 0.5 : 1,
                    boxShadow: (publishing || blocked) ? "none" : "0 4px 14px rgba(124,58,237,0.28)",
                    marginBottom: 6,
                  }}>
                  <Tag size={14} /> ヤフオクで出品（コピー＋画面起動）
                </button>
                <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5, marginBottom: 10, textAlign: "center" }}>
                  ※ 出品文がクリップボードにコピーされます。ヤフオクの出品画面で貼り付けてください。
                </div>
              </>
            )}
            {platform === "ebay" && (
              <>
                <button onClick={handleEbayPublish} disabled={publishing || blocked}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                    border: "1px solid rgba(14,165,233,0.5)",
                    borderRadius: 14, color: "#fff", padding: "14px",
                    fontSize: 14, fontWeight: 800,
                    cursor: (publishing || blocked) ? "not-allowed" : "pointer",
                    opacity: (publishing || blocked) ? 0.5 : 1,
                    boxShadow: (publishing || blocked) ? "none" : "0 4px 14px rgba(14,165,233,0.28)",
                    marginBottom: 6,
                  }}>
                  <Tag size={14} /> eBayで出品（コピー＋画面起動）
                </button>
                <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5, marginBottom: 10, textAlign: "center" }}>
                  ※ 出品文がクリップボードにコピーされます。eBayの出品画面で貼り付けてください。
                </div>
              </>
            )}

            {/* セカンダリ：CSV / 出品文コピー */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => handlePublish("csv")} disabled={publishing || blocked}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(168,139,255,0.10)", border: "1px solid rgba(168,139,255,0.28)", borderRadius: 12, color: "#A88BFF", padding: "10px", fontSize: 12, fontWeight: 700, cursor: (publishing || blocked) ? "not-allowed" : "pointer", opacity: (publishing || blocked) ? 0.5 : 1 }}>
                <Download size={12} /> CSV出力
              </button>
              <button onClick={() => handlePublish("copy")} disabled={publishing || blocked}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(64,170,223,0.10)", border: "1px solid rgba(64,170,223,0.28)", borderRadius: 12, color: "#60BFEF", padding: "10px", fontSize: 12, fontWeight: 700, cursor: (publishing || blocked) ? "not-allowed" : "pointer", opacity: (publishing || blocked) ? 0.5 : 1 }}>
                <Copy size={12} /> 出品文コピー
              </button>
            </div>

            {blocked && (
              <div style={{ fontSize: 11, color: "#ff8a8a", marginTop: 10, textAlign: "center" }}>
                エラー項目を解消してください
              </div>
            )}
          </div>

          {/* メタ情報 */}
          <div style={{
            background: "transparent", border: "1px solid var(--border)",
            borderRadius: 10, padding: "12px 14px", fontSize: 11, color: "var(--text-3)", lineHeight: 1.7,
          }}>
            <div><FileText size={10} style={{ verticalAlign: "middle", marginRight: 4 }} /> 元の商品名: {item.productName}</div>
            {item.sourceUrl && <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>URL: {item.sourceUrl}</div>}
            {item.condition && <div>状態: {item.condition}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
