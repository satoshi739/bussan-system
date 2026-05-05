"use client";

import { useState, useEffect, useCallback } from "react";
import { Share2, Copy, CheckCircle, RefreshCw, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { getAgentSNSContent, publishSNSContent, generateSNSContent, type AgentSNSContent } from "@/lib/api";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";

const C = {
  bg0: "#07101f", bg1: "#0a1530", bg2: "#111e44", bg3: "#1a2956",
  t1: "#f5f1e8", t2: "#e5d9bc", t3: "#8a9ab8", t4: "#4d6080",
  gold: "#c9a96b", goldLt: "#e6c87a", goldDm: "#8a6d35",
  azure: "#4a7fc1",
  up: "#4ade80", dn: "#c46060", warn: "#c9993a",
  bd: "rgba(201,169,107,0.18)", bdSt: "rgba(201,169,107,0.38)",
};

const card: React.CSSProperties = {
  background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 14, padding: "20px 24px",
};

const PLATFORM_META: Record<string, { color: string; label: string; icon: string }> = {
  instagram: { color: "#E1306C", label: "Instagram", icon: "📸" },
  twitter: { color: "#1DA1F2", label: "X (Twitter)", icon: "🐦" },
  tiktok: { color: "#69C9D0", label: "TikTok", icon: "🎵" },
};

const POST_TYPE_LABELS: Record<string, string> = {
  haul: "仕入れ報告",
  listing: "出品告知",
  sold: "売れた報告",
};

const DEFAULT_FORM = {
  product_name: "",
  buy_price: "",
  sell_price: "",
  buy_source: "eBay",
  sell_platform: "メルカリ",
  post_type: "listing" as "haul" | "listing" | "sold",
  platforms: ["instagram", "twitter", "tiktok"] as string[],
};

export default function SNSPage() {
  const [contents, setContents] = useState<AgentSNSContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [copied, setCopied] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAgentSNSContent();
      setContents(data);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCopy = async (id: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
      toast("コピーしました", "success");
    } catch {
      toast("コピーに失敗しました", "error");
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await publishSNSContent(id);
      toast("公開済みにマークしました", "success");
      load();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const togglePlatform = (p: string) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p],
    }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_name || !form.buy_price || !form.sell_price) {
      toast("商品名・仕入れ値・販売価格を入力してください", "error");
      return;
    }
    if (form.platforms.length === 0) {
      toast("投稿するSNSを1つ以上選択してください", "error");
      return;
    }
    setGenerating(true);
    try {
      const buyNum = Number(form.buy_price);
      const sellNum = Number(form.sell_price);
      await generateSNSContent({
        product_name: form.product_name,
        buy_price: buyNum,
        sell_price: sellNum,
        profit_jpy: sellNum - buyNum,
        buy_source: form.buy_source,
        sell_platform: form.sell_platform,
        post_type: form.post_type,
        platforms: form.platforms,
      });
      toast("SNS投稿文を生成しました", "success");
      setForm(DEFAULT_FORM);
      setShowForm(false);
      load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setGenerating(false);
    }
  };

  const platforms = ["all", "instagram", "twitter", "tiktok"];
  const filtered = filter === "all" ? contents : contents.filter(c => c.platform === filter);

  const draftCount = contents.filter(c => c.status === "draft").length;
  const publishedCount = contents.filter(c => c.status === "published").length;

  return (
    <div style={{ background: C.bg0, minHeight: "100vh", padding: "24px 20px", maxWidth: 900, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ background: `linear-gradient(135deg, #E1306C, #833AB4)`, borderRadius: 12, padding: 10, display: "flex" }}>
          <Share2 size={24} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: C.t1, fontSize: 22, fontWeight: 700, margin: 0 }}>SNS コンテンツ管理</h1>
          <p style={{ color: C.t3, fontSize: 13, margin: 0 }}>AI生成の投稿文をコピーして各SNSに投稿してください</p>
        </div>
        <button onClick={load} style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t3, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <RefreshCw size={14} /> 更新
        </button>
      </div>

      {/* 生成フォーム */}
      <div style={{ ...card, marginBottom: 20 }}>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: 0 }}
        >
          <div style={{ background: `linear-gradient(135deg, #D4AF37, #F0D060)`, borderRadius: 8, padding: "6px 8px", display: "flex" }}>
            <Sparkles size={16} color="#07101f" />
          </div>
          <span style={{ color: C.t1, fontSize: 15, fontWeight: 700, flex: 1, textAlign: "left" }}>SNS投稿を生成する</span>
          {showForm ? <ChevronUp size={16} color={C.t3} /> : <ChevronDown size={16} color={C.t3} />}
        </button>

        {showForm && (
          <form onSubmit={handleGenerate} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: C.t3, display: "block", marginBottom: 6, fontWeight: 600 }}>商品名 *</label>
                <input
                  value={form.product_name}
                  onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                  placeholder="例: セイコー 5 SNXS79 自動巻き 中古"
                  style={{ width: "100%", background: C.bg0, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t1, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.t3, display: "block", marginBottom: 6, fontWeight: 600 }}>仕入れ値（円） *</label>
                <input
                  type="number" value={form.buy_price}
                  onChange={e => setForm(f => ({ ...f, buy_price: e.target.value }))}
                  placeholder="例: 4200"
                  style={{ width: "100%", background: C.bg0, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t1, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.t3, display: "block", marginBottom: 6, fontWeight: 600 }}>販売価格（円） *</label>
                <input
                  type="number" value={form.sell_price}
                  onChange={e => setForm(f => ({ ...f, sell_price: e.target.value }))}
                  placeholder="例: 12800"
                  style={{ width: "100%", background: C.bg0, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t1, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.t3, display: "block", marginBottom: 6, fontWeight: 600 }}>仕入れ元</label>
                <select
                  value={form.buy_source}
                  onChange={e => setForm(f => ({ ...f, buy_source: e.target.value }))}
                  style={{ width: "100%", background: C.bg0, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t1, padding: "10px 14px", fontSize: 13, outline: "none" }}
                >
                  {["eBay", "メルカリ", "ヤフオク", "Shopee", "店舗", "その他"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.t3, display: "block", marginBottom: 6, fontWeight: 600 }}>販売先</label>
                <select
                  value={form.sell_platform}
                  onChange={e => setForm(f => ({ ...f, sell_platform: e.target.value }))}
                  style={{ width: "100%", background: C.bg0, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t1, padding: "10px 14px", fontSize: 13, outline: "none" }}
                >
                  {["メルカリ", "Amazon", "eBay", "ヤフオク", "楽天", "その他"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* 投稿タイプ */}
            <div>
              <label style={{ fontSize: 12, color: C.t3, display: "block", marginBottom: 8, fontWeight: 600 }}>投稿タイプ</label>
              <div style={{ display: "flex", gap: 8 }}>
                {([["haul", "仕入れ報告"], ["listing", "出品告知"], ["sold", "売れた報告"]] as const).map(([v, l]) => (
                  <button
                    key={v} type="button"
                    onClick={() => setForm(f => ({ ...f, post_type: v }))}
                    style={{ flex: 1, background: form.post_type === v ? `${C.gold}22` : C.bg2, border: `1px solid ${form.post_type === v ? C.gold : C.bd}`, borderRadius: 8, color: form.post_type === v ? C.gold : C.t3, padding: "8px 6px", fontSize: 12, fontWeight: form.post_type === v ? 700 : 400, cursor: "pointer" }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* SNSプラットフォーム */}
            <div>
              <label style={{ fontSize: 12, color: C.t3, display: "block", marginBottom: 8, fontWeight: 600 }}>投稿するSNS（複数選択可）</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["instagram", "twitter", "tiktok"] as const).map(p => {
                  const meta = { instagram: { icon: "📸", label: "Instagram", color: "#E1306C" }, twitter: { icon: "🐦", label: "X", color: "#1DA1F2" }, tiktok: { icon: "🎵", label: "TikTok", color: "#69C9D0" } }[p];
                  const active = form.platforms.includes(p);
                  return (
                    <button key={p} type="button" onClick={() => togglePlatform(p)}
                      style={{ flex: 1, background: active ? `${meta.color}22` : C.bg2, border: `1px solid ${active ? meta.color : C.bd}`, borderRadius: 8, color: active ? meta.color : C.t3, padding: "8px 6px", fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer" }}
                    >
                      {meta.icon} {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 利益プレビュー */}
            {form.buy_price && form.sell_price && (
              <div style={{ background: C.bg0, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 20, fontSize: 12 }}>
                <span style={{ color: C.t3 }}>利益: <span style={{ color: C.up, fontWeight: 700, fontFamily: "monospace" }}>¥{(Number(form.sell_price) - Number(form.buy_price)).toLocaleString()}</span></span>
                <span style={{ color: C.t3 }}>利益率: <span style={{ color: C.gold, fontWeight: 700, fontFamily: "monospace" }}>{Number(form.sell_price) > 0 ? ((Number(form.sell_price) - Number(form.buy_price)) / Number(form.sell_price) * 100).toFixed(1) : 0}%</span></span>
              </div>
            )}

            <button
              type="submit" disabled={generating}
              style={{ background: generating ? C.bg2 : `linear-gradient(135deg, #D4AF37, #F0D060)`, border: "none", borderRadius: 9, color: generating ? C.t3 : "#07101f", padding: "13px 0", fontSize: 14, fontWeight: 800, cursor: generating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Sparkles size={15} />
              {generating ? "AI生成中..." : "SNS投稿文を生成する"}
            </button>
          </form>
        )}
      </div>

      {/* サマリー */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "投稿下書き", value: draftCount + "件", color: C.warn },
          { label: "公開済み", value: publishedCount + "件", color: C.up },
          { label: "合計", value: contents.length + "件", color: C.gold },
        ].map((s, i) => (
          <div key={i} style={{ ...card, padding: "14px 18px" }}>
            <div style={{ color: s.color, fontSize: 18, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: C.t4, fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* プラットフォームフィルター */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {platforms.map(p => {
          const meta = PLATFORM_META[p];
          return (
            <button
              key={p}
              onClick={() => setFilter(p)}
              style={{
                background: filter === p ? (meta?.color ?? C.gold) : C.bg2,
                border: `1px solid ${filter === p ? (meta?.color ?? C.gold) : C.bd}`,
                borderRadius: 20, color: filter === p ? "#fff" : C.t3,
                padding: "6px 14px", fontSize: 12, fontWeight: filter === p ? 700 : 400,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}
            >
              {meta?.icon} {meta?.label ?? "すべて"}
            </button>
          );
        })}
      </div>

      {/* コンテンツ一覧 */}
      {loading ? (
        <div style={{ textAlign: "center", color: C.t4, padding: "40px 0" }}>読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: C.t4, padding: "48px 0" }}>
          <Share2 size={40} color={C.t4} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14 }}>SNSコンテンツがありません</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>仕入れ承認キューで商品を承認すると自動生成されます</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map(content => {
            const meta = PLATFORM_META[content.platform] ?? { color: C.gold, label: content.platform, icon: "📱" };
            const fullText = content.hashtags.length > 0
              ? content.content + "\n\n" + content.hashtags.join(" ")
              : content.content;

            return (
              <div key={content.id} style={{
                ...card,
                borderLeft: `3px solid ${meta.color}`,
                opacity: content.status === "published" ? 0.7 : 1,
              }}>
                {/* ヘッダー */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>{meta.icon}</span>
                  <span style={{ color: meta.color, fontWeight: 700, fontSize: 13 }}>{meta.label}</span>
                  <span style={{
                    background: C.bg2, borderRadius: 6, color: C.t3, fontSize: 11, padding: "2px 8px",
                  }}>
                    {POST_TYPE_LABELS[content.post_type] ?? content.post_type}
                  </span>
                  {content.status === "published" && (
                    <span style={{ background: C.up + "22", color: C.up, borderRadius: 6, fontSize: 11, padding: "2px 8px", fontWeight: 600, marginLeft: "auto" }}>
                      公開済み
                    </span>
                  )}
                  <span style={{ color: C.t4, fontSize: 11, marginLeft: content.status !== "published" ? "auto" : 0 }}>
                    {new Date(content.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>

                {/* 投稿文 */}
                <div style={{
                  background: C.bg2, borderRadius: 10, padding: "14px 16px",
                  color: C.t1, fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap",
                  marginBottom: 10,
                }}>
                  {content.content}
                </div>

                {/* ハッシュタグ */}
                {content.hashtags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                    {content.hashtags.map((tag, i) => (
                      <span key={i} style={{
                        background: meta.color + "18", color: meta.color,
                        borderRadius: 6, fontSize: 11, padding: "3px 8px",
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* アクション */}
                {content.status === "draft" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleCopy(content.id, fullText)}
                      style={{
                        flex: 1, background: copied === content.id ? C.up + "22" : C.bg2,
                        border: `1px solid ${copied === content.id ? C.up : C.bd}`,
                        borderRadius: 8, color: copied === content.id ? C.up : C.t2,
                        padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      {copied === content.id ? <CheckCircle size={13} /> : <Copy size={13} />}
                      {copied === content.id ? "コピー完了" : "全文コピー"}
                    </button>
                    <button
                      onClick={() => handlePublish(content.id)}
                      style={{
                        background: meta.color + "22", border: `1px solid ${meta.color}44`,
                        borderRadius: 8, color: meta.color, padding: "8px 16px",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      <CheckCircle size={13} /> 投稿済みにする
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
