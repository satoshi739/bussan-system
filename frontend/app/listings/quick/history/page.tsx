"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft, Edit3, Copy as CopyIcon, Trash2, FileText } from "lucide-react";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";

type Status = "ALL" | "DRAFT" | "CONFIRMED" | "CSV_EXPORTED" | "API_PENDING" | "PUBLISHED";

type Item = {
  id: string;
  productName: string;
  aiTitle: string | null;
  aiSuggestedPrice: number | null;
  buyPrice: number | null;
  aiProfitEstimate: number | null;
  targetPlatform: string;
  status: Exclude<Status, "ALL">;
  updatedAt: string;
};

const STATUS_FILTERS: { key: Status; label: string; color: string }[] = [
  { key: "ALL",          label: "すべて",       color: "var(--text-2)" },
  { key: "DRAFT",        label: "下書き",       color: "#9aa3b2" },
  { key: "CONFIRMED",    label: "確認済み",     color: "#60BFEF" },
  { key: "CSV_EXPORTED", label: "CSV出力済み",  color: "#A88BFF" },
  { key: "API_PENDING",  label: "API出品準備中", color: "#FFC857" },
  { key: "PUBLISHED",    label: "出品済み",     color: "#34C759" },
];

const STATUS_COLOR: Record<Exclude<Status, "ALL">, string> = {
  DRAFT: "#9aa3b2", CONFIRMED: "#60BFEF", CSV_EXPORTED: "#A88BFF",
  API_PENDING: "#FFC857", PUBLISHED: "#34C759",
};

export default function QuickListingHistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter === "ALL" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/listings/quick${qs}`);
      if (!res.ok) throw new Error(await res.text());
      const { items: list } = await res.json();
      setItems(list);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("この出品案を削除しますか？")) return;
    try {
      const res = await fetch(`/api/listings/quick/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast("削除しました");
      load();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const handleDuplicate = async (it: Item) => {
    try {
      const res = await fetch(`/api/listings/quick/${it.id}`);
      const { item } = await res.json();
      const createRes = await fetch("/api/listings/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: `${item.productName} (コピー)`,
          sourceUrl: item.sourceUrl,
          buyPrice: item.buyPrice,
          estPrice: item.estPrice,
          condition: item.condition,
          category: item.category,
          notes: item.notes,
          weightG: item.weightG,
          sizeCode: item.sizeCode,
          imageUrls: item.imageUrls,
          targetPlatform: item.targetPlatform,
        }),
      });
      const { item: created } = await createRes.json();
      // AIフィールドも複製
      await fetch(`/api/listings/quick/${created.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiTitle: item.aiTitle, aiDescription: item.aiDescription,
          aiCategories: item.aiCategories, aiKeywords: item.aiKeywords,
          aiSuggestedPrice: item.aiSuggestedPrice, aiProfitEstimate: item.aiProfitEstimate,
          aiShippingEstimate: item.aiShippingEstimate, aiWarnings: item.aiWarnings,
        }),
      });
      toast("複製しました");
      router.push(`/listings/quick/${created.id}`);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <button onClick={() => router.push("/listings/quick")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "var(--text-3)", padding: "6px 12px", cursor: "pointer", fontSize: 12, marginBottom: 8 }}>
            <ArrowLeft size={12} /> 出品作成へ
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", margin: 0 }}>出品履歴</h1>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
            過去のAI出品案を再編集・複製・削除できます
          </div>
        </div>
        <button onClick={() => router.push("/listings/quick")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#006FE6,#3B8EEA)", border: "none", borderRadius: 10, color: "#fff", padding: "10px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
          <Plus size={14} /> 新規出品作成
        </button>
      </div>

      {/* フィルタ */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {STATUS_FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{
              background: filter === f.key ? `${f.color}22` : "transparent",
              border: `1px solid ${filter === f.key ? `${f.color}55` : "rgba(255,255,255,0.08)"}`,
              borderRadius: 16, padding: "5px 12px",
              color: filter === f.key ? f.color : "var(--text-3)",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* 一覧 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 13 }}>読み込み中...</div>
      ) : items.length === 0 ? (
        <div style={{
          background: "var(--surface)", border: "1px dashed rgba(255,255,255,0.1)",
          borderRadius: 14, padding: 56, textAlign: "center",
        }}>
          <FileText size={36} color="rgba(255,255,255,0.15)" style={{ margin: "0 auto 14px", display: "block" }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-2)", marginBottom: 6 }}>
            まだ出品案がありません
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>
            AIが商品情報から出品文を自動生成します。まずは1件作ってみましょう。
          </div>
          <button onClick={() => router.push("/listings/quick")}
            style={{ background: "linear-gradient(135deg,#006FE6,#3B8EEA)", border: "none", borderRadius: 9, color: "#fff", padding: "10px 22px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            出品作成を開始 →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(it => {
            const profit = it.aiProfitEstimate ?? ((it.aiSuggestedPrice ?? 0) - (it.buyPrice ?? 0));
            return (
              <div key={it.id} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 12, padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{
                      background: `${STATUS_COLOR[it.status]}22`,
                      color: STATUS_COLOR[it.status],
                      border: `1px solid ${STATUS_COLOR[it.status]}44`,
                      borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 700,
                    }}>
                      {STATUS_FILTERS.find(f => f.key === it.status)?.label}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>
                      {new Date(it.updatedAt).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.aiTitle ?? it.productName}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "monospace", fontWeight: 700, color: profit >= 0 ? "#D4AF37" : "#ff6666", fontSize: 14 }}>
                    {profit >= 0 ? "+" : ""}¥{profit.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--text-3)" }}>利益見込み</div>
                </div>
                <button onClick={() => router.push(`/listings/quick/${it.id}`)} title="編集"
                  style={{ background: "rgba(64,170,223,0.1)", border: "1px solid rgba(64,170,223,0.3)", borderRadius: 8, color: "#60BFEF", cursor: "pointer", padding: "7px 10px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <Edit3 size={11} /> 編集
                </button>
                <button onClick={() => handleDuplicate(it)} title="複製"
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-3)", cursor: "pointer", padding: "7px 9px" }}>
                  <CopyIcon size={11} />
                </button>
                <button onClick={() => handleDelete(it.id)} title="削除"
                  style={{ background: "transparent", border: "1px solid rgba(255,90,90,0.2)", borderRadius: 8, color: "#ff8a8a", cursor: "pointer", padding: "7px 9px" }}>
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
