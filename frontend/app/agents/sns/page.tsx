"use client";

import { useState, useEffect, useCallback } from "react";
import { Share2, Copy, CheckCircle, RefreshCw } from "lucide-react";
import { getAgentSNSContent, publishSNSContent, type AgentSNSContent } from "@/lib/api";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";

const C = {
  bg0: "#0a0a0b", bg1: "#141414", bg2: "#1c1c1e", bg3: "#242424",
  t1: "#F5F0E8", t2: "#D4CCBC", t3: "#A09488", t4: "#5A5248",
  gold: "#D4AF37", goldLt: "#F0D060", goldDm: "#9A7D25",
  up: "#4ade80", dn: "#f87171", warn: "#fbbf24",
  bd: "rgba(212,175,55,0.18)", bdSt: "rgba(212,175,55,0.38)",
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
  haul: "🛒 仕入れ報告",
  listing: "📦 出品告知",
  sold: "✅ 売れた報告",
};

export default function SNSPage() {
  const [contents, setContents] = useState<AgentSNSContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [copied, setCopied] = useState<number | null>(null);

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
