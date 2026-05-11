"use client";

import { useEffect, useState, useCallback } from "react";
import { getPendingThanks, markThanksSent, type PendingThanks } from "@/lib/api";
import { MessageCircle, Copy, Sparkles, Check, X, Mail } from "lucide-react";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";

type ThanksDraft = { subject: string; message: string };

export default function ThanksPage() {
  const [items, setItems] = useState<PendingThanks[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, ThanksDraft>>({});
  const [genLoading, setGenLoading] = useState<number | null>(null);
  const [markLoading, setMarkLoading] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPendingThanks();
      setItems(data ?? []);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const generate = async (item: PendingThanks) => {
    setGenLoading(item.id);
    try {
      const res = await fetch("/api/ai/thanks-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: item.product_name,
          sell_platform: item.selling_platform,
          sale_price: item.sale_price,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setDrafts(prev => ({ ...prev, [item.id]: data.draft }));
      setOpenId(item.id);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setGenLoading(null);
    }
  };

  const doCopy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what}をコピーしました`);
    } catch {
      toast("コピーに失敗しました", "error");
    }
  };

  const copyAll = (d: ThanksDraft) => {
    doCopy(`${d.subject}\n\n${d.message}`, "件名と本文");
  };

  const markSent = async (id: number) => {
    setMarkLoading(id);
    try {
      await markThanksSent(id);
      toast("送信済みにしました");
      setItems(prev => prev.filter(i => i.id !== id));
      setOpenId(null);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setMarkLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <style>{`
        @media (max-width: 768px) {
          .thanks-item-row { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .thanks-item-row button { width: 100% !important; justify-content: center !important; min-height: 44px !important; }
        }
      `}</style>

      {/* ── ヘッダー ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <MessageCircle size={20} color="#1E9C3C" />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", margin: 0, letterSpacing: "-0.01em" }}>お礼メッセージ</h1>
          <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 6 }}>
            お礼待ち <span style={{ color: "#1E9C3C", fontWeight: 700 }}>{items.length}件</span>
          </span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-3)" }}>
          AI が販路別に最適化されたお礼文を生成します。コピーして各販路のメッセージ機能に貼り付けてください。
        </div>
      </div>

      {/* ── ローディング ── */}
      {loading && (
        <div style={{ background: "rgba(20,20,22,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 32, textAlign: "center", color: "var(--text-3)" }}>
          読み込み中...
        </div>
      )}

      {/* ── 空状態 ── */}
      {!loading && items.length === 0 && (
        <div style={{ background: "rgba(20,20,22,0.6)", border: "1px solid rgba(30,156,60,0.15)", borderRadius: 14, padding: 48, textAlign: "center" }}>
          <Mail size={36} color="rgba(30,156,60,0.4)" style={{ margin: "0 auto 16px", display: "block" }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>お礼待ちはありません</div>
          <div style={{ color: "var(--text-3)", fontSize: 13 }}>
            売却が確定すると、ここにお礼を送るリストが表示されます。
          </div>
        </div>
      )}

      {/* ── リスト ── */}
      {!loading && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(item => {
            const draft = drafts[item.id];
            const isOpen = openId === item.id && draft;
            return (
              <div key={item.id} style={{ background: "rgba(20,20,22,0.9)", border: `1px solid ${isOpen ? "rgba(30,156,60,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "14px 16px", transition: "border-color 0.2s" }}>
                <div className="thanks-item-row" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product_name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span>📦 {item.selling_platform}</span>
                      <span>💰 売却 ¥{item.sale_price.toLocaleString()}</span>
                      <span>📅 {item.sale_date}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {!draft && (
                      <button
                        onClick={() => generate(item)}
                        disabled={genLoading === item.id}
                        style={{ background: "linear-gradient(135deg,#1E9C3C,#22B045)", border: "none", borderRadius: 8, color: "#FFFFFF", padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: genLoading === item.id ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <Sparkles size={12} />
                        {genLoading === item.id ? "生成中..." : "お礼を生成"}
                      </button>
                    )}
                    {draft && (
                      <button
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        style={{ background: "rgba(30,156,60,0.12)", border: "1px solid rgba(30,156,60,0.3)", borderRadius: 8, color: "#22B045", padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        {isOpen ? "閉じる" : "表示"}
                      </button>
                    )}
                    <button
                      onClick={() => markSent(item.id)}
                      disabled={markLoading === item.id}
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "var(--text-3)", padding: "8px 12px", fontSize: 12, cursor: markLoading === item.id ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <Check size={12} />
                      {markLoading === item.id ? "..." : "送信済み"}
                    </button>
                  </div>
                </div>

                {/* 生成結果 */}
                {isOpen && draft && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* 件名 */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em" }}>件名</span>
                        <button onClick={() => doCopy(draft.subject, "件名")} style={{ background: "rgba(30,156,60,0.12)", border: "1px solid rgba(30,156,60,0.3)", borderRadius: 6, color: "#22B045", padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Copy size={10} /> コピー
                        </button>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--text)" }}>
                        {draft.subject}
                      </div>
                    </div>

                    {/* 本文 */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em" }}>本文</span>
                        <button onClick={() => doCopy(draft.message, "本文")} style={{ background: "rgba(30,156,60,0.12)", border: "1px solid rgba(30,156,60,0.3)", borderRadius: 6, color: "#22B045", padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Copy size={10} /> コピー
                        </button>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                        {draft.message}
                      </div>
                    </div>

                    {/* 全部コピー + 再生成 */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => copyAll(draft)} style={{ flex: 1, background: "linear-gradient(135deg,#1E9C3C,#22B045)", border: "none", borderRadius: 8, color: "#FFFFFF", padding: "10px", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <Copy size={13} /> 件名と本文をまとめてコピー
                      </button>
                      <button onClick={() => generate(item)} disabled={genLoading === item.id} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "var(--text-3)", padding: "10px 14px", fontSize: 12, cursor: genLoading === item.id ? "wait" : "pointer" }}>
                        {genLoading === item.id ? "..." : "再生成"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 操作ガイド ── */}
      {!loading && items.length > 0 && (
        <div style={{ marginTop: 24, background: "rgba(30,156,60,0.06)", border: "1px solid rgba(30,156,60,0.15)", borderRadius: 12, padding: "14px 18px", fontSize: 12, color: "var(--text-3)", lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, color: "#22B045", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <X size={12} style={{ visibility: "hidden" }} />使い方
          </div>
          1. 「お礼を生成」をクリック → AIが販路別に最適化された文章を作成<br />
          2. 「件名」「本文」をそれぞれコピー、または「まとめてコピー」<br />
          3. 各販路（eBay/メルカリ/Amazon等）のメッセージ機能に貼り付けて送信<br />
          4. 送信後「送信済み」を押すとリストから外れます
        </div>
      )}
    </div>
  );
}
