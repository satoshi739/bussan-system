"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import {
  getApprovalQueue, approveQueueItem, rejectQueueItem,
  generateListing, generateSNSContent,
  type ApprovalQueueItem,
} from "@/lib/api";
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

type StatusFilter = "pending" | "approved" | "rejected" | "all";

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: number; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [summary, setSummary] = useState({ pending_count: 0, total_investment_jpy: 0, total_expected_profit_jpy: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getApprovalQueue(filter === "all" ? undefined : filter);
      setItems(data.items);
      setSummary({ pending_count: data.pending_count, total_investment_jpy: data.total_investment_jpy, total_expected_profit_jpy: data.total_expected_profit_jpy });
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (item: ApprovalQueueItem) => {
    setProcessing(item.id);
    try {
      const res = await approveQueueItem(item.id);
      toast(`承認しました（仕入れID: ${res.purchase_id}）`, "success");
      // 出品文 + SNS コンテンツを自動生成
      await Promise.allSettled([
        generateListing({
          approval_queue_id: item.id,
          purchase_id: res.purchase_id,
          product_name: item.product_name,
          buy_price: item.buy_price,
          buy_source: item.buy_source,
          sell_platform: item.sell_platform,
          est_sell_price: item.est_sell_price,
        }),
        generateSNSContent({
          approval_queue_id: item.id,
          purchase_id: res.purchase_id,
          product_name: item.product_name,
          buy_price: item.buy_price,
          sell_price: item.est_sell_price,
          profit_jpy: item.net_profit_jpy,
          buy_source: item.buy_source,
          sell_platform: item.sell_platform,
          post_type: "haul",
        }),
      ]);
      toast("出品文・SNSコンテンツを自動生成しました", "success");
      load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal.id);
    try {
      await rejectQueueItem(rejectModal.id, rejectReason);
      toast("却下しました", "success");
      setRejectModal(null);
      setRejectReason("");
      load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setProcessing(null);
    }
  };

  const scoreColor = (score: number) =>
    score >= 70 ? C.up : score >= 40 ? C.warn : C.dn;

  const rateColor = (rate: number) =>
    rate >= 30 ? C.up : rate >= 20 ? C.warn : C.dn;

  return (
    <div style={{ background: C.bg0, minHeight: "100vh", padding: "24px 20px", maxWidth: 1000, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLt})`, borderRadius: 12, padding: 10, display: "flex" }}>
          <CheckCircle size={24} color="#0a0a0b" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: C.t1, fontSize: 22, fontWeight: 700, margin: 0 }}>仕入れ承認キュー</h1>
          <p style={{ color: C.t3, fontSize: 13, margin: 0 }}>AIが発見した候補を確認し、承認/却下してください</p>
        </div>
        <button onClick={load} style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t3, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <RefreshCw size={14} /> 更新
        </button>
      </div>

      {/* サマリー */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "承認待ち", value: summary.pending_count + "件", color: summary.pending_count > 0 ? C.warn : C.t3 },
          { label: "合計仕入れ額", value: `¥${summary.total_investment_jpy.toLocaleString()}`, color: C.gold },
          { label: "期待利益合計", value: `¥${summary.total_expected_profit_jpy.toLocaleString()}`, color: C.up },
        ].map((s, i) => (
          <div key={i} style={{ ...card, padding: "14px 18px" }}>
            <div style={{ color: s.color, fontSize: 18, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: C.t4, fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* フィルター */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["pending", "approved", "rejected", "all"] as StatusFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? C.gold : C.bg2,
              border: `1px solid ${filter === f ? C.gold : C.bd}`,
              borderRadius: 20, color: filter === f ? "#0a0a0b" : C.t3,
              padding: "6px 14px", fontSize: 12, fontWeight: filter === f ? 700 : 400,
              cursor: "pointer",
            }}
          >
            {f === "pending" ? "承認待ち" : f === "approved" ? "承認済み" : f === "rejected" ? "却下済み" : "すべて"}
          </button>
        ))}
      </div>

      {/* アイテム一覧 */}
      {loading ? (
        <div style={{ textAlign: "center", color: C.t4, padding: "40px 0" }}>読み込み中...</div>
      ) : items.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: C.t4, padding: "48px 0" }}>
          <CheckCircle size={40} color={C.t4} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14 }}>
            {filter === "pending" ? "承認待ちのアイテムはありません" : "アイテムが見つかりません"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map(item => (
            <div key={item.id} style={{
              ...card,
              borderColor: item.status === "approved" ? C.up + "44"
                : item.status === "rejected" ? C.dn + "44" : C.bd,
            }}>
              <div style={{ display: "flex", gap: 16 }}>
                {/* 商品画像 */}
                {item.buy_image && (
                  <img
                    src={item.buy_image}
                    alt=""
                    style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}

                {/* 商品情報 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <h3 style={{ color: C.t1, fontSize: 15, fontWeight: 700, margin: 0, flex: 1 }}>
                      {item.product_name}
                    </h3>
                    {/* スコアバッジ */}
                    <span style={{
                      background: scoreColor(item.score) + "22",
                      color: scoreColor(item.score),
                      borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                    }}>
                      スコア {item.score}
                    </span>
                  </div>

                  {/* 価格グリッド */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
                    {[
                      { label: "仕入れ価格", value: `¥${item.buy_price.toLocaleString()}`, color: C.t2 },
                      { label: "推定販売価格", value: `¥${item.est_sell_price.toLocaleString()}`, color: C.t2 },
                      { label: "純利益", value: `¥${item.net_profit_jpy.toLocaleString()}`, color: C.up },
                      { label: "利益率", value: `${item.profit_rate.toFixed(1)}%`, color: rateColor(item.profit_rate) },
                    ].map((stat, i) => (
                      <div key={i} style={{ background: C.bg2, borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ color: stat.color, fontSize: 14, fontWeight: 700 }}>{stat.value}</div>
                        <div style={{ color: C.t4, fontSize: 11 }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* CEO理由 */}
                  {item.ceo_reason && (
                    <div style={{
                      background: `rgba(212,175,55,0.06)`, border: `1px solid ${C.bd}`,
                      borderRadius: 8, padding: "8px 12px", marginBottom: 10,
                    }}>
                      <div style={{ color: C.gold, fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                        🤖 AI CEO 推薦理由
                      </div>
                      <div style={{ color: C.t2, fontSize: 13, lineHeight: 1.6 }}>{item.ceo_reason}</div>
                    </div>
                  )}

                  {/* メタ情報 */}
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: C.t3, fontSize: 12 }}>仕入れ: {item.buy_source}</span>
                    <span style={{ color: C.t3, fontSize: 12 }}>→ 販売: {item.sell_platform}</span>
                    {item.buy_url && (
                      <a href={item.buy_url} target="_blank" rel="noopener noreferrer"
                        style={{ color: C.gold, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        <ExternalLink size={11} /> 商品ページ
                      </a>
                    )}
                    <span style={{ color: C.t4, fontSize: 11, marginLeft: "auto" }}>
                      {new Date(item.created_at).toLocaleString("ja-JP")}
                    </span>
                  </div>
                </div>
              </div>

              {/* アクションボタン */}
              {item.status === "pending" && (
                <div style={{ display: "flex", gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.bd}` }}>
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={processing === item.id}
                    style={{
                      flex: 1, background: processing === item.id ? C.bg3 : `linear-gradient(135deg, ${C.up}, #22c55e)`,
                      border: "none", borderRadius: 10, color: processing === item.id ? C.t4 : "#0a0a0b",
                      padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: processing === item.id ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <CheckCircle size={15} />
                    {processing === item.id ? "処理中..." : "承認して購入 + 出品・SNS自動生成"}
                  </button>
                  <button
                    onClick={() => setRejectModal({ id: item.id, name: item.product_name })}
                    disabled={processing === item.id}
                    style={{
                      background: C.bg2, border: `1px solid ${C.dn}44`, borderRadius: 10,
                      color: C.dn, padding: "10px 20px", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <XCircle size={15} /> 却下
                  </button>
                </div>
              )}

              {item.status === "approved" && (
                <div style={{
                  marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.bd}`,
                  display: "flex", alignItems: "center", gap: 8, color: C.up, fontSize: 13,
                }}>
                  <CheckCircle size={14} />
                  <span>承認済み — 仕入れID: {item.purchase_id}</span>
                  <span style={{ color: C.t4, fontSize: 11 }}>
                    {item.approved_at ? new Date(item.approved_at).toLocaleString("ja-JP") : ""}
                  </span>
                </div>
              )}

              {item.status === "rejected" && (
                <div style={{
                  marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.bd}`,
                  display: "flex", alignItems: "center", gap: 8, color: C.dn, fontSize: 13,
                }}>
                  <XCircle size={14} />
                  <span>却下済み</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 却下モーダル */}
      {rejectModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
        }}>
          <div style={{ background: C.bg1, borderRadius: 16, padding: 28, width: "100%", maxWidth: 440, border: `1px solid ${C.dn}44` }}>
            <h3 style={{ color: C.dn, margin: "0 0 8px 0", fontSize: 16 }}>却下の確認</h3>
            <p style={{ color: C.t2, fontSize: 13, marginBottom: 16 }}>
              「{rejectModal.name}」を却下します。理由を入力してください（任意）。
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="却下理由（例: 価格が高すぎる、需要が不明）"
              rows={3}
              style={{
                width: "100%", background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 8,
                color: C.t1, padding: "10px 12px", fontSize: 13, outline: "none", resize: "vertical",
                fontFamily: "inherit", boxSizing: "border-box", marginBottom: 16,
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleReject} style={{ flex: 1, background: C.dn, border: "none", borderRadius: 8, color: "#fff", padding: "10px 0", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                却下する
              </button>
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} style={{ background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.t2, padding: "10px 20px", cursor: "pointer", fontSize: 13 }}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
