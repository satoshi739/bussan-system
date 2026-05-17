"use client";

import { useState } from "react";
import Link from "next/link";
import { Truck, Plus, X, Trash2, ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "@/components/Toast";
import {
  useCarriers,
  upsertCarrier,
  deleteCarrier,
  saveCarriers,
} from "@/lib/shipping-store";
import type { Carrier } from "@/types/shipping";

const C = {
  bd: "var(--border)", t1: "var(--text)", t2: "var(--text-2)", t3: "var(--text-3)",
  gold: "var(--blue)", surf: "var(--surface)", surf2: "var(--surface-2)",
};

const card: React.CSSProperties = {
  background: C.surf, border: `1px solid ${C.bd}`, borderRadius: 14, padding: "18px 20px",
};
const inp: React.CSSProperties = {
  background: C.surf2, border: `1px solid ${C.bd}`, borderRadius: 8,
  color: C.t1, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "var(--blue)", color: "#fff", border: "none",
  borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "transparent", border: `1px solid ${C.bd}`,
  color: C.t2, borderRadius: 10, padding: "8px 12px", fontSize: 12,
  fontWeight: 600, cursor: "pointer", textDecoration: "none",
};

export default function CarriersPage() {
  const list = useCarriers();
  const [editing, setEditing] = useState<Carrier | null>(null);
  const [creating, setCreating] = useState(false);

  const toggleActive = (c: Carrier) => {
    upsertCarrier({ ...c, isActive: !c.isActive });
  };

  const handleSave = (form: Partial<Carrier> & { name: string }) => {
    if (!form.name.trim()) {
      toast("配送業者名を入力してください", "error");
      return;
    }
    upsertCarrier(form);
    setEditing(null);
    setCreating(false);
    toast("保存しました");
  };

  const handleDelete = (id: string) => {
    if (!confirm("この配送業者を削除しますか？\n（既存の配送データの業者名表示には影響しません）")) return;
    deleteCarrier(id);
    setEditing(null);
    toast("削除しました", "info");
  };

  const resetToDefault = () => {
    if (!confirm("初期7業者（ヤマト・佐川・日本郵便・FedEx・DHL・UPS・その他）に戻します。よろしいですか？")) return;
    saveCarriers([]);
    toast("初期状態に戻しました");
  };

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 10, flexWrap: "wrap" }}>
        <div>
          <Link href="/shipping" style={{ ...btnGhost, marginBottom: 8 }}>
            <ArrowLeft size={12} /> 配送管理に戻る
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.t1, margin: "6px 0 3px", display: "flex", alignItems: "center", gap: 8 }}>
            <Truck size={20} color={C.gold} /> 配送業者設定
          </h1>
          <div style={{ fontSize: 12, color: C.t3 }}>
            配送業者と追跡URLの形を登録できます。追跡番号を入れると追跡ページに飛べるようになります。
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={resetToDefault} style={btnGhost}>初期業者に戻す</button>
          <button onClick={() => setCreating(true)} style={btnPrimary}>
            <Plus size={14} /> 配送業者を追加
          </button>
        </div>
      </div>

      {/* リスト */}
      <div style={{ display: "grid", gap: 10 }}>
        {list.map(c => (
          <div key={c.id} style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>{c.name}</div>
                {c.apiEnabled && (
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "rgba(30,156,60,0.12)", color: "#1E9C3C", fontWeight: 700 }}>
                    API連携
                  </span>
                )}
                {!c.isActive && (
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "rgba(0,0,0,0.06)", color: C.t3, fontWeight: 700 }}>
                    無効
                  </span>
                )}
              </div>
              {c.trackingUrlTemplate ? (
                <div style={{ fontSize: 11, color: C.t3, fontFamily: "monospace", wordBreak: "break-all", display: "flex", alignItems: "center", gap: 4 }}>
                  <ExternalLink size={10} /> {c.trackingUrlTemplate}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: C.t3 }}>追跡URL未設定</div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* 有効トグル */}
              <button
                onClick={() => toggleActive(c)}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 38, height: 22, borderRadius: 12,
                  background: c.isActive ? C.gold : "var(--border-strong)",
                  border: "none", cursor: "pointer", position: "relative", padding: 0,
                }}
                title={c.isActive ? "有効（クリックで無効化）" : "無効（クリックで有効化）"}
              >
                <span style={{
                  position: "absolute", top: 2, left: c.isActive ? 18 : 2,
                  width: 18, height: 18, borderRadius: 9, background: "#fff",
                  transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
              <button onClick={() => setEditing(c)} style={btnGhost}>編集</button>
            </div>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <CarrierModal
          initial={editing ?? undefined}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={handleSave}
          onDelete={editing ? () => handleDelete(editing.id) : undefined}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
function CarrierModal({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial?: Carrier;
  onClose: () => void;
  onSave: (form: Partial<Carrier> & { name: string }) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<Partial<Carrier> & { name: string }>(
    initial ?? {
      name: "",
      trackingUrlTemplate: "",
      apiEnabled: false,
      apiProvider: null,
      isActive: true,
    }
  );

  const lbl: React.CSSProperties = { fontSize: 11, color: C.t3, fontWeight: 600, display: "block", marginBottom: 5 };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: C.surf, border: `1px solid ${C.bd}`, borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: "20px 24px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.t1, margin: 0 }}>
            {initial ? "配送業者を編集" : "配送業者を追加"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={lbl}>配送業者名 <span style={{ color: "#E02E24" }}>*</span></label>
            <input
              style={{ ...inp, width: "100%" }}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="例：ヤマト運輸"
            />
          </div>

          <div>
            <label style={lbl}>追跡URLテンプレート</label>
            <input
              style={{ ...inp, width: "100%", fontFamily: "monospace" }}
              value={form.trackingUrlTemplate ?? ""}
              onChange={e => setForm(f => ({ ...f, trackingUrlTemplate: e.target.value }))}
              placeholder="https://example.com/track?number={trackingNumber}"
            />
            <div style={{ fontSize: 10, color: C.t3, marginTop: 4 }}>
              {"`{trackingNumber}`"} の部分に追跡番号が自動で入ります。
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>API連携</label>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, apiEnabled: !f.apiEnabled }))}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8,
                  border: `1px solid ${C.bd}`, background: form.apiEnabled ? "rgba(30,156,60,0.08)" : C.surf2,
                  color: form.apiEnabled ? "#1E9C3C" : C.t2,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                {form.apiEnabled ? "ON（API連携あり）" : "OFF（手入力のみ）"}
              </button>
            </div>
            <div>
              <label style={lbl}>API識別子（任意）</label>
              <input
                style={{ ...inp, width: "100%" }}
                value={form.apiProvider ?? ""}
                onChange={e => setForm(f => ({ ...f, apiProvider: e.target.value || null }))}
                placeholder="yamato / sagawa / japan_post など"
              />
            </div>
          </div>

          <div>
            <label style={lbl}>有効/無効</label>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              style={{
                padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.bd}`,
                background: form.isActive ? "rgba(0,111,230,0.06)" : C.surf2,
                color: form.isActive ? C.gold : C.t3, fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              {form.isActive ? "有効（配送追加時の選択肢に出ます）" : "無効（一覧から隠れます）"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.bd}` }}>
          <div>
            {onDelete && (
              <button onClick={onDelete} style={{ ...btnGhost, color: "#E02E24", borderColor: "rgba(224,46,36,0.3)" }}>
                <Trash2 size={13} /> 削除
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={btnGhost}>キャンセル</button>
            <button onClick={() => onSave(form)} style={btnPrimary}>保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}
