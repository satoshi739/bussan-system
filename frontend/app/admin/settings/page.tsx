"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Save, Eye, EyeOff, Trash2, Settings as SettingsIcon, Check, AlertTriangle, Lock } from "lucide-react";

interface SettingItem {
  key: string;
  label: string;
  group: string;
  secret: boolean;
  hasValue: boolean;
  maskedValue: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

export default function AdminSettingsPage() {
  const [items, setItems] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async (key: string) => {
    const value = edits[key];
    if (typeof value !== "string" || !value.trim()) return;
    setSaving(key);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "保存失敗");
      }
      setSavedAt((s) => ({ ...s, [key]: Date.now() }));
      setEdits((e) => ({ ...e, [key]: "" }));
      setVisible((v) => ({ ...v, [key]: false }));
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`${key} の保存値を削除しますか？`)) return;
    try {
      await fetch(`/api/admin/settings?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // group ごとにまとめる
  const grouped = items.reduce<Record<string, SettingItem[]>>((acc, it) => {
    (acc[it.group] = acc[it.group] ?? []).push(it);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 0 80px" }}>
      <Link
        href="/admin"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-3)", textDecoration: "none", fontSize: 13, marginBottom: 20 }}
      >
        <ChevronLeft size={14} /> 管理者ダッシュボードに戻る
      </Link>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <SettingsIcon size={22} color="#D4AF37" /> 設定 / APIキー管理
        </h1>
        <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
          SNS自動発信・外部API用のキーをここに保存します。値は AES-256-GCM で暗号化されて DB に保存されます。
        </div>
      </div>

      {/* セキュリティ警告 */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
        <Lock size={16} color="#D4AF37" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>
          ・保存値は AUTH_SECRET から派生した鍵で暗号化されます<br />
          ・画面上ではマスク表示（先頭4文字 + ***** + 末尾4文字）<br />
          ・ADMIN 権限のユーザーのみアクセス可能
        </div>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,80,50,0.08)", border: "1px solid rgba(255,80,50,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#ff9977", fontSize: 13 }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--text-3)", fontSize: 13 }}>読み込み中...</div>
      ) : (
        Object.entries(grouped).map(([group, settings]) => (
          <div key={group} style={{ marginBottom: 28, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{group}</div>
            </div>
            <div style={{ padding: "12px 18px" }}>
              {settings.map((s) => {
                const editVal = edits[s.key] ?? "";
                const isVisible = visible[s.key] ?? false;
                const justSaved = savedAt[s.key] && Date.now() - savedAt[s.key] < 3000;
                return (
                  <div key={s.key} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                        {s.label}
                        {s.secret && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--text-3)" }}>🔒 暗号化</span>}
                      </label>
                      {s.hasValue && (
                        <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 6 }}>
                          現在: <code style={{ background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4, color: "var(--text-2)" }}>{s.maskedValue || "（空）"}</code>
                          {justSaved && <span style={{ color: "#4ade80", display: "inline-flex", alignItems: "center", gap: 4 }}><Check size={11} />保存済</span>}
                        </div>
                      )}
                      {!s.hasValue && <div style={{ fontSize: 11, color: "var(--text-4)" }}>未設定</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                      <input
                        type={isVisible ? "text" : "password"}
                        value={editVal}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [s.key]: e.target.value }))}
                        placeholder={s.hasValue ? "新しい値を入力すると上書きされます" : "値を入力..."}
                        autoComplete="off"
                        style={{
                          flex: 1,
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          color: "var(--text)",
                          padding: "10px 12px",
                          fontSize: 13,
                          outline: "none",
                        }}
                      />
                      {s.secret && (
                        <button
                          type="button"
                          onClick={() => setVisible((v) => ({ ...v, [s.key]: !isVisible }))}
                          title={isVisible ? "隠す" : "表示"}
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-3)", padding: "0 12px", cursor: "pointer" }}
                        >
                          {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSave(s.key)}
                        disabled={!editVal.trim() || saving === s.key}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          background: !editVal.trim() ? "var(--surface-2)" : "linear-gradient(135deg,#0a2a18,#0d3d24)",
                          border: `1px solid ${!editVal.trim() ? "var(--border)" : "rgba(74,222,128,0.45)"}`,
                          borderRadius: 8,
                          color: !editVal.trim() ? "var(--text-4)" : "#4ade80",
                          padding: "0 14px",
                          fontSize: 12, fontWeight: 800,
                          cursor: !editVal.trim() ? "not-allowed" : "pointer",
                        }}
                      >
                        <Save size={12} /> {saving === s.key ? "保存中..." : "保存"}
                      </button>
                      {s.hasValue && (
                        <button
                          type="button"
                          onClick={() => handleDelete(s.key)}
                          title="削除"
                          style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "#ff6666", padding: "0 12px", cursor: "pointer" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
