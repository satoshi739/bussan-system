"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, History as HistoryIcon, ArrowRight, Plus, Image as ImageIcon, X, Download } from "lucide-react";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";
import { SIZE_OPTIONS, AREA_OPTIONS, type SizeCode, type AreaCode } from "@/lib/shipping-table";
import { PLATFORMS, type TargetPlatform } from "@/lib/publish-adapter";

const inp: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  padding: "9px 12px",
  fontSize: 14,
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-3)",
  fontWeight: 600,
  display: "block",
  marginBottom: 4,
};

const CONDITIONS = ["新品・未開封", "新品・未使用", "未使用に近い", "目立った傷や汚れなし", "やや傷や汚れあり", "傷や汚れあり", "全体的に状態が悪い"];

type Form = {
  sourceUrl: string;
  productName: string;
  buyPrice: string;
  estPrice: string;
  condition: string;
  category: string;
  notes: string;
  weightG: string;
  sizeCode: SizeCode | "";
  area: AreaCode;
  imageUrls: string[];
  targetPlatform: TargetPlatform;
};

const emptyForm: Form = {
  sourceUrl: "",
  productName: "",
  buyPrice: "",
  estPrice: "",
  condition: "未使用に近い",
  category: "",
  notes: "",
  weightG: "",
  sizeCode: "",
  area: "middle",
  imageUrls: [],
  targetPlatform: "none",
};

export default function QuickListingCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(emptyForm);
  const [imgInput, setImgInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fetchingImages, setFetchingImages] = useState(false);

  const setField = <K extends keyof Form>(k: K, v: Form[K]) => setForm(p => ({ ...p, [k]: v }));

  const addImage = () => {
    const v = imgInput.trim();
    if (!v) return;
    if (form.imageUrls.includes(v)) { toast("既に追加されています", "error"); return; }
    setField("imageUrls", [...form.imageUrls, v]);
    setImgInput("");
  };
  const removeImage = (i: number) => {
    setField("imageUrls", form.imageUrls.filter((_, idx) => idx !== i));
  };

  const fetchImagesFromUrl = async () => {
    const src = form.sourceUrl.trim();
    if (!src) {
      toast("先に「商品URL」を入力してください", "error");
      return;
    }
    setFetchingImages(true);
    try {
      const res = await fetch("/api/extract-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: src }),
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
      const merged = Array.from(new Set([...form.imageUrls, ...fetched]));
      setField("imageUrls", merged);
      const added = merged.length - form.imageUrls.length;
      toast(`画像を ${added} 件取得しました`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "画像取得エラー", "error");
    } finally {
      setFetchingImages(false);
    }
  };

  const handleGenerate = async () => {
    if (!form.productName && !form.sourceUrl) {
      toast("商品名または商品URLを入力してください", "error");
      return;
    }
    setSubmitting(true);
    try {
      // 1) 下書きを保存
      const createRes = await fetch("/api/listings/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: form.productName,
          sourceUrl: form.sourceUrl || undefined,
          buyPrice: form.buyPrice ? Number(form.buyPrice) : undefined,
          estPrice: form.estPrice ? Number(form.estPrice) : undefined,
          condition: form.condition,
          category: form.category,
          notes: form.notes,
          weightG: form.weightG ? Number(form.weightG) : undefined,
          sizeCode: form.sizeCode || undefined,
          imageUrls: form.imageUrls,
          targetPlatform: form.targetPlatform,
        }),
      });
      if (!createRes.ok) throw new Error(await createRes.text());
      const { item } = await createRes.json();

      // 2) AI生成
      const aiRes = await fetch("/api/ai/listing-quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: form.productName,
          source_url: form.sourceUrl || undefined,
          buy_price: form.buyPrice ? Number(form.buyPrice) : undefined,
          est_price: form.estPrice ? Number(form.estPrice) : undefined,
          condition: form.condition,
          category: form.category,
          notes: form.notes,
          weight_g: form.weightG ? Number(form.weightG) : undefined,
          size_code: form.sizeCode || undefined,
          area: form.area,
          target_platform: form.targetPlatform,
        }),
      });
      if (!aiRes.ok) throw new Error(await aiRes.text());
      const { draft } = await aiRes.json();

      // 3) 生成結果を保存
      const patchRes = await fetch(`/api/listings/quick/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiTitle: draft.title,
          aiDescription: draft.description,
          aiCategories: draft.categories ?? [],
          aiKeywords: draft.keywords ?? [],
          aiSuggestedPrice: draft.suggested_price ?? null,
          aiProfitEstimate: draft.profit_estimate ?? null,
          aiShippingEstimate: draft.shipping_estimate ?? null,
          aiWarnings: draft.warnings ?? [],
        }),
      });
      if (!patchRes.ok) throw new Error(await patchRes.text());

      toast("AI生成が完了しました。プレビューで確認してください");
      router.push(`/listings/quick/${item.id}`);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <style>{`
        .ql-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ql-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        @media (max-width: 768px) {
          .ql-grid-2, .ql-grid-3 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", margin: 0 }}>
            出品作成（AI）
          </h1>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
            商品情報を入力 → AIが出品文を生成 → プレビューで確認 → 出品/CSV出力
          </div>
        </div>
        <button
          onClick={() => router.push("/listings/quick/history")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10, color: "var(--text-3)", padding: "9px 16px",
            fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}
        >
          <HistoryIcon size={14} /> 履歴
        </button>
      </div>

      {/* ステップ案内 */}
      <div style={{
        background: "linear-gradient(135deg,rgba(64,170,223,0.06),rgba(64,170,223,0.02))",
        border: "1px solid rgba(64,170,223,0.18)",
        borderRadius: 12, padding: "12px 16px", marginBottom: 20,
        fontSize: 12, color: "var(--text-2)",
      }}>
        <span style={{ color: "#60BFEF", fontWeight: 700 }}>STEP 1 / 3</span>
        <span style={{ marginLeft: 10 }}>商品情報を入力します。URLだけでも開始できます。不足項目は次のプレビュー画面で編集できます。</span>
      </div>

      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "22px 24px",
      }}>
        {/* 必須エリア */}
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>商品URL（任意・URLだけでもOK）</label>
          <input
            style={inp}
            placeholder="https://page.auctions.yahoo.co.jp/jp/... または https://www.ebay.com/..."
            value={form.sourceUrl}
            onChange={e => setField("sourceUrl", e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>商品名 *</label>
          <input
            style={inp}
            placeholder="例: Apple AirPods Pro 第2世代 MagSafe充電ケース付き"
            value={form.productName}
            onChange={e => setField("productName", e.target.value)}
          />
        </div>

        <div className="ql-grid-3" style={{ marginBottom: 16 }}>
          <div>
            <label style={lbl}>仕入れ価格（円）</label>
            <input type="number" style={inp} placeholder="0" value={form.buyPrice}
              onChange={e => setField("buyPrice", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>想定販売価格（円）</label>
            <input type="number" style={inp} placeholder="未入力ならAIが提案" value={form.estPrice}
              onChange={e => setField("estPrice", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>状態</label>
            <select style={inp} value={form.condition} onChange={e => setField("condition", e.target.value)}>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="ql-grid-2" style={{ marginBottom: 16 }}>
          <div>
            <label style={lbl}>カテゴリ希望</label>
            <input style={inp} placeholder="例: 家電・カメラ" value={form.category}
              onChange={e => setField("category", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>出品先（将来切替）</label>
            <select style={inp} value={form.targetPlatform}
              onChange={e => setField("targetPlatform", e.target.value as TargetPlatform)}>
              {PLATFORMS.map(p => (
                <option key={p.id} value={p.id} disabled={!p.available && p.id !== "none"}>
                  {p.label} {p.available ? "" : `（${p.statusLabel}）`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>説明メモ（AI生成のヒント・なくてもOK）</label>
          <textarea
            style={{ ...inp, minHeight: 80, fontFamily: "inherit", resize: "vertical" }}
            placeholder="動作確認済み・付属品の有無・購入元・使用期間など、AIに伝えたい情報を自由に"
            value={form.notes}
            onChange={e => setField("notes", e.target.value)}
          />
        </div>

        {/* サイズ・重量・エリア */}
        <div style={{
          background: "rgba(0,0,0,0.18)", borderRadius: 10, padding: "14px 16px", marginBottom: 16,
          border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em", marginBottom: 10 }}>
            送料の概算用（任意）
          </div>
          <div className="ql-grid-3">
            <div>
              <label style={lbl}>重量（g）</label>
              <input type="number" style={inp} placeholder="500" value={form.weightG}
                onChange={e => setField("weightG", e.target.value)} />
            </div>
            <div>
              <label style={lbl}>サイズ</label>
              <select style={inp} value={form.sizeCode}
                onChange={e => setField("sizeCode", e.target.value as SizeCode | "")}>
                <option value="">未指定</option>
                {SIZE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label} — {s.hint}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>発送エリア</label>
              <select style={inp} value={form.area}
                onChange={e => setField("area", e.target.value as AreaCode)}>
                {AREA_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 画像URL */}
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>画像URL（複数可・任意）</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={inp}
              placeholder="https://..."
              value={imgInput}
              onChange={e => setImgInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addImage(); } }}
            />
            <button
              type="button"
              onClick={addImage}
              style={{
                background: "rgba(64,170,223,0.12)", border: "1px solid rgba(64,170,223,0.3)",
                borderRadius: 8, color: "#60BFEF", padding: "0 14px", cursor: "pointer", fontSize: 13, fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={14} style={{ verticalAlign: "middle" }} /> 追加
            </button>
          </div>

          {/* 仕入URLから画像を自動取得 */}
          <button
            type="button"
            onClick={fetchImagesFromUrl}
            disabled={fetchingImages || !form.sourceUrl.trim()}
            style={{
              marginTop: 8,
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(255,170,90,0.10)",
              border: "1px solid rgba(255,170,90,0.35)",
              borderRadius: 8,
              color: "#ffb56b",
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: (fetchingImages || !form.sourceUrl.trim()) ? "not-allowed" : "pointer",
              opacity: (fetchingImages || !form.sourceUrl.trim()) ? 0.5 : 1,
            }}
            title={!form.sourceUrl.trim() ? "先に商品URLを入力してください" : "仕入URLから画像を自動取得"}
          >
            <Download size={12} /> {fetchingImages ? "取得中…" : "商品URLから画像を自動取得"}
          </button>
          {form.imageUrls.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {form.imageUrls.map((u, i) => (
                <span key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 18, padding: "4px 10px 4px 8px", fontSize: 11, color: "var(--text-2)",
                  maxWidth: "100%", overflow: "hidden",
                }}>
                  <ImageIcon size={10} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{u}</span>
                  <button onClick={() => removeImage(i)} style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", padding: 0 }}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 生成ボタン */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={() => setForm(emptyForm)}
            style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, color: "var(--text-3)", padding: "11px 18px", cursor: "pointer", fontSize: 13,
            }}
          >
            クリア
          </button>
          <button
            onClick={handleGenerate}
            disabled={submitting}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: submitting ? "rgba(100,100,100,0.3)" : "linear-gradient(135deg,#006FE6,#3B8EEA)",
              border: "none", borderRadius: 10, color: "#fff",
              padding: "11px 22px", fontSize: 14, fontWeight: 800,
              cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1,
            }}
          >
            <Sparkles size={14} />
            {submitting ? "AI生成中..." : "AIで出品文を作成"}
            {!submitting && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
