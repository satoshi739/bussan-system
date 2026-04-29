"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getFulfillmentVendor, createFulfillmentVendor, updateFulfillmentVendor, testFulfillmentVendor,
  type FulfillmentVendor, type FulfillmentVendorCreate,
} from "@/lib/api";
import { ArrowLeft, CheckCircle, Loader, Eye, EyeOff, ExternalLink, Zap, Mail, MessageCircle, Hand } from "lucide-react";
import { toast } from "@/components/Toast";

const S = {
  bg:       "#0f0f10",
  surface:  "rgba(20,20,22,0.95)",
  border:   "rgba(212,175,55,0.14)",
  brass:    "#D4AF37",
  text:     "#F5F0E8",
  muted:    "#8A8278",
  faint:    "#3A3830",
  green:    "#44ccaa",
  blue:     "#66aaff",
  purple:   "#aa88ff",
} as const;

const inp: React.CSSProperties = { background: "rgba(10,10,11,0.95)", border: `1px solid rgba(212,175,55,0.3)`, borderRadius: 8, color: S.text, padding: "9px 12px", fontSize: 14, width: "100%", outline: "none", fontFamily: "monospace", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, color: S.muted, fontWeight: 600, display: "block", marginBottom: 5 };

const VENDOR_PRESETS: Record<string, {
  name: string; emoji: string; description: string; connection_type: string;
  features: string[]; url: string | null; base_fee: number; per_item_fee: number;
  api_docs?: string; supported_methods: string[];
}> = {
  openlogi: {
    name: "オープンロジ", emoji: "📦",
    description: "EC専用の発送代行サービス。SKU登録・在庫管理・自動出荷に対応。全国対応・翌日出荷も可能。",
    connection_type: "api", features: ["API連携", "自動出荷", "在庫管理", "伝票自動発行"],
    url: "https://openlogi.com", base_fee: 330, per_item_fee: 220,
    api_docs: "https://api-docs.openlogi.com",
    supported_methods: ["nekoposu", "takkyubin60", "takkyubin80", "yu_packet"],
  },
  shippino: {
    name: "シッピーノ", emoji: "🚀",
    description: "多モール一元管理の発送代行。Amazon・楽天・Yahoo!に対応した在庫自動同期。",
    connection_type: "api", features: ["多モール対応", "API連携", "リアルタイム在庫", "返品管理"],
    url: "https://shippino.com", base_fee: 440, per_item_fee: 165,
    api_docs: "https://developers.shippino.com",
    supported_methods: ["takkyubin60", "takkyubin80", "takkyubin100", "yu_pack60"],
  },
  logiless: {
    name: "ロジレス", emoji: "🏭",
    description: "次世代型EC向けWMS。在庫の可視化・自動出荷・柔軟なカスタマイズが可能。",
    connection_type: "api", features: ["WMS機能", "API連携", "自動出荷ルール", "検品対応"],
    url: "https://logiless.com", base_fee: 550, per_item_fee: 200,
    api_docs: "https://app2.logiless.com/developer",
    supported_methods: ["nekoposu", "takkyubin60", "takkyubin80", "letter_pack_light"],
  },
  lojimoplus: {
    name: "ロジモプロ", emoji: "📫",
    description: "小口から大口まで対応の柔軟な発送代行。検品・ラッピングオプション充実。",
    connection_type: "api", features: ["小口対応", "API連携", "検品写真", "ギフト対応"],
    url: "https://logimoplus.jp", base_fee: 300, per_item_fee: 180,
    supported_methods: ["nekoposu", "yu_packet", "takkyubin60", "letter_pack_plus"],
  },
  email: {
    name: "メール連携", emoji: "✉️",
    description: "任意の発送代行業者にメールで依頼。フォーマットを自動生成します。",
    connection_type: "email", features: ["メール自動生成", "任意業者対応", "履歴管理"],
    url: null, base_fee: 0, per_item_fee: 0,
    supported_methods: [],
  },
  line: {
    name: "LINE連携", emoji: "💬",
    description: "LINEメッセージで発送依頼。担当者・業者へリアルタイム通知。",
    connection_type: "line", features: ["LINE通知", "既読確認", "担当者指定"],
    url: null, base_fee: 0, per_item_fee: 0,
    supported_methods: [],
  },
  manual: {
    name: "手動管理", emoji: "📋",
    description: "API・メール連携なし。ステータスを手動で更新して業者を管理します。",
    connection_type: "manual", features: ["ステータス管理", "メモ記録", "履歴確認"],
    url: null, base_fee: 0, per_item_fee: 0,
    supported_methods: [],
  },
};

export default function VendorConnectPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const router = useRouter();

  const isNew = isNaN(Number(vendorId));
  const preset = isNew ? VENDOR_PRESETS[vendorId] : null;

  const [step, setStep] = useState(1);
  const [existingVendor, setExistingVendor] = useState<FulfillmentVendor | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: preset?.name ?? "",
    api_key: "",
    api_endpoint: "",
    contact_email: "",
    line_token: "",
    base_fee: String(preset?.base_fee ?? 0),
    per_item_fee: String(preset?.per_item_fee ?? 0),
    notes: "",
  });

  useEffect(() => {
    if (!isNew) {
      getFulfillmentVendor(Number(vendorId)).then(v => {
        setExistingVendor(v);
        setForm({
          name: v.name,
          api_key: v.api_key ?? "",
          api_endpoint: v.api_endpoint ?? "",
          contact_email: v.contact_email ?? "",
          line_token: v.line_token ?? "",
          base_fee: String(v.base_fee ?? 0),
          per_item_fee: String(v.per_item_fee ?? 0),
          notes: v.notes ?? "",
        });
      }).catch(console.error);
    }
  }, [isNew, vendorId]);

  const upd = (key: keyof typeof form, val: string) =>
    setForm(n => ({ ...n, [key]: val }));

  const connectionType = (existingVendor?.connection_type ?? preset?.connection_type ?? "manual") as string;
  const vendorEmoji = (existingVendor ? VENDOR_PRESETS[existingVendor.vendor_type]?.emoji : preset?.emoji) ?? "🏢";
  const vendorName = existingVendor?.name ?? preset?.name ?? "業者";

  const handleTest = async () => {
    if (!existingVendor) { toast("先に保存してから接続テストしてください", "error"); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testFulfillmentVendor(existingVendor.id);
      setTestResult(r);
      if (r.ok) toast("接続テスト成功 ✅");
      else toast("接続テスト失敗: " + r.message, "error");
    } catch { toast("テストに失敗しました", "error"); }
    finally { setTesting(false); }
  };

  const handleSave = async () => {
    if (!form.name) { toast("業者名を入力してください", "error"); return; }
    setSaving(true);
    try {
      if (isNew && preset) {
        const body: FulfillmentVendorCreate = {
          name: form.name,
          vendor_type: vendorId,
          connection_type: preset.connection_type,
          status: "inactive",
          api_key: form.api_key || undefined,
          api_endpoint: form.api_endpoint || undefined,
          contact_email: form.contact_email || undefined,
          line_token: form.line_token || undefined,
          base_fee: Number(form.base_fee) || 0,
          per_item_fee: Number(form.per_item_fee) || 0,
          supported_methods: JSON.stringify(preset.supported_methods),
          notes: form.notes || undefined,
        };
        const { id } = await createFulfillmentVendor(body);
        toast("業者を追加しました ✅");
        router.push(`/fulfillment/vendors/${id}/connect`);
      } else if (existingVendor) {
        await updateFulfillmentVendor(existingVendor.id, {
          name: form.name,
          api_key: form.api_key || undefined,
          api_endpoint: form.api_endpoint || undefined,
          contact_email: form.contact_email || undefined,
          line_token: form.line_token || undefined,
          base_fee: Number(form.base_fee) || 0,
          per_item_fee: Number(form.per_item_fee) || 0,
          notes: form.notes || undefined,
        });
        toast("設定を保存しました ✅");
        setStep(3);
      }
    } catch { toast("保存に失敗しました", "error"); }
    finally { setSaving(false); }
  };

  const handleActivate = async () => {
    if (!existingVendor) return;
    await updateFulfillmentVendor(existingVendor.id, { status: "active" });
    toast(`${existingVendor.name} を有効化しました ✅`);
    router.push("/fulfillment/vendors");
  };

  const STEPS = ["概要", "認証情報", "テスト・有効化"];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* パンくず */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 12, color: S.muted }}>
        <Link href="/fulfillment" style={{ color: S.muted, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}><ArrowLeft size={13} /> 発送管理</Link>
        <span style={{ color: S.faint }}>/</span>
        <Link href="/fulfillment/vendors" style={{ color: S.muted, textDecoration: "none" }}>業者一覧</Link>
        <span style={{ color: S.faint }}>/</span>
        <span style={{ color: S.text }}>{vendorName}</span>
      </div>

      {/* ステップインジケーター */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
        {STEPS.map((s, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
              <button
                onClick={() => (done || active) && setStep(n)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: done ? "pointer" : "default", padding: "4px 0" }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? S.green : active ? S.brass : "rgba(255,255,255,0.05)",
                  border: `2px solid ${done ? S.green : active ? S.brass : S.faint}`,
                  fontSize: 11, fontWeight: 800,
                  color: (done || active) ? "#000" : S.faint,
                }}>
                  {done ? <CheckCircle size={14} /> : n}
                </div>
                <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? S.text : done ? S.green : S.faint, whiteSpace: "nowrap" }}>{s}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${done ? S.green : S.faint}, ${S.faint})`, margin: "0 12px" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: 概要 */}
      {step === 1 && (
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: "24px 28px" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
            <span style={{ fontSize: 48 }}>{vendorEmoji}</span>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: S.text, margin: "0 0 6px" }}>{vendorName}</h2>
              <p style={{ fontSize: 13, color: S.muted, margin: 0, lineHeight: 1.7 }}>
                {existingVendor ? `${existingVendor.name} の設定を編集します。` : preset?.description}
              </p>
              {(preset?.url || (existingVendor && VENDOR_PRESETS[existingVendor.vendor_type]?.url)) && (
                <a
                  href={preset?.url ?? VENDOR_PRESETS[existingVendor?.vendor_type ?? ""]?.url ?? ""}
                  target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: S.blue, marginTop: 8, textDecoration: "none" }}
                >
                  <ExternalLink size={12} /> 公式サイトを見る
                </a>
              )}
            </div>
          </div>

          {/* 接続タイプ */}
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>接続方式</div>
            <div style={{ display: "flex", gap: 12 }}>
              {connectionType === "api" && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: S.blue }}><Zap size={14} /> API連携（自動化可能）</div>}
              {connectionType === "email" && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: S.purple }}><Mail size={14} /> メール連携</div>}
              {connectionType === "line" && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: S.green }}><MessageCircle size={14} /> LINE連携</div>}
              {connectionType === "manual" && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: S.muted }}><Hand size={14} /> 手動管理</div>}
            </div>
          </div>

          {/* 特徴 */}
          {(preset?.features ?? (existingVendor && VENDOR_PRESETS[existingVendor.vendor_type]?.features)) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
              {(preset?.features ?? VENDOR_PRESETS[existingVendor?.vendor_type ?? ""]?.features ?? []).map(f => (
                <span key={f} style={{ fontSize: 11, background: "rgba(212,175,55,0.06)", border: `1px solid rgba(212,175,55,0.18)`, borderRadius: 20, padding: "3px 10px", color: S.muted }}>
                  <CheckCircle size={9} style={{ display: "inline", marginRight: 4 }} />{f}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            style={{ width: "100%", background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: `1px solid rgba(212,175,55,0.4)`, borderRadius: 8, color: S.brass, padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}
          >
            {existingVendor ? "設定を変更する →" : "連携を設定する →"}
          </button>
        </div>
      )}

      {/* Step 2: 認証情報 */}
      {step === 2 && (
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: "24px 28px" }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: S.text, marginTop: 0, marginBottom: 20 }}>
            {existingVendor ? "設定を更新" : "認証情報を入力"}
          </h2>

          {/* 業者名 */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>業者の表示名</label>
            <input style={inp} value={form.name} onChange={e => upd("name", e.target.value)} placeholder={preset?.name ?? "業者名"} />
          </div>

          {/* API連携 */}
          {connectionType === "api" && (
            <>
              <div style={{ background: "rgba(102,170,255,0.05)", border: "1px solid rgba(102,170,255,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 14, fontSize: 12 }}>
                <div style={{ color: S.blue, fontWeight: 700, marginBottom: 6 }}>APIキーの取得方法</div>
                <div style={{ color: S.muted, lineHeight: 1.8 }}>
                  1. {vendorName}の管理画面にログイン<br />
                  2.「API設定」または「連携設定」を開く<br />
                  3. APIキーを発行してコピー<br />
                  4. 以下に貼り付けて保存
                  {(preset?.api_docs ?? VENDOR_PRESETS[existingVendor?.vendor_type ?? ""]?.api_docs) && (
                    <><br />→ <a href={preset?.api_docs ?? VENDOR_PRESETS[existingVendor?.vendor_type ?? ""]?.api_docs} target="_blank" rel="noreferrer" style={{ color: S.blue }}>APIドキュメント</a></>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>APIキー *</label>
                <div style={{ position: "relative" }}>
                  <input
                    style={inp} type={showKey ? "text" : "password"}
                    value={form.api_key} onChange={e => upd("api_key", e.target.value)}
                    placeholder="APIキーを貼り付け..."
                  />
                  <button
                    onClick={() => setShowKey(v => !v)}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: S.muted, cursor: "pointer" }}
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>APIエンドポイント（カスタムの場合）</label>
                <input style={inp} value={form.api_endpoint} onChange={e => upd("api_endpoint", e.target.value)} placeholder="https://api.example.com（空欄でデフォルト使用）" />
              </div>
            </>
          )}

          {/* メール連携 */}
          {connectionType === "email" && (
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>依頼先メールアドレス *</label>
              <input style={{ ...inp, fontFamily: "sans-serif" }} type="email" value={form.contact_email} onChange={e => upd("contact_email", e.target.value)} placeholder="vendor@example.com" />
              <div style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>発送依頼時にこのアドレスへ自動フォーマットされたメールを送信します</div>
            </div>
          )}

          {/* LINE連携 */}
          {connectionType === "line" && (
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>LINE Notify トークン *</label>
              <input style={inp} type="password" value={form.line_token} onChange={e => upd("line_token", e.target.value)} placeholder="LINE Notify のトークンを貼り付け..." />
            </div>
          )}

          {/* 料金設定 */}
          <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.muted, marginBottom: 10 }}>料金設定（見積もり計算用）</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={lbl}>基本料金（円）</label>
                <input style={{ ...inp, fontFamily: "sans-serif" }} type="number" value={form.base_fee} onChange={e => upd("base_fee", e.target.value)} placeholder="0" />
              </div>
              <div>
                <label style={lbl}>1件あたり手数料（円）</label>
                <input style={{ ...inp, fontFamily: "sans-serif" }} type="number" value={form.per_item_fee} onChange={e => upd("per_item_fee", e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>メモ</label>
            <input style={{ ...inp, fontFamily: "sans-serif" }} value={form.notes} onChange={e => upd("notes", e.target.value)} placeholder="担当者名・契約内容のメモなど" />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSave} disabled={saving}
              style={{ flex: 1, background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: `1px solid rgba(212,175,55,0.4)`, borderRadius: 8, color: S.brass, padding: "12px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 14, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "保存中..." : existingVendor ? "更新して次へ →" : "保存して次へ →"}
            </button>
            <button onClick={() => setStep(1)} style={{ background: "transparent", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, color: S.muted, padding: "12px 16px", cursor: "pointer" }}>戻る</button>
          </div>
        </div>
      )}

      {/* Step 3: テスト・有効化 */}
      {step === 3 && (
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: "24px 28px" }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: S.text, marginTop: 0, marginBottom: 20 }}>
            接続テスト・有効化
          </h2>

          {/* テスト */}
          {connectionType !== "manual" && (
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "16px", marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: S.text, marginBottom: 8 }}>接続テスト</div>
              <div style={{ fontSize: 12, color: S.muted, marginBottom: 12 }}>入力した認証情報で実際に接続できるか確認します。</div>
              <button
                onClick={handleTest} disabled={testing}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(102,170,255,0.08)", border: "1px solid rgba(102,170,255,0.3)", borderRadius: 8, color: S.blue, padding: "10px 20px", fontWeight: 700, cursor: testing ? "not-allowed" : "pointer", fontSize: 13 }}
              >
                {testing ? <><Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> テスト中...</> : <><Zap size={14} /> 接続テストを実行</>}
              </button>
              {testResult && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: testResult.ok ? "rgba(68,204,170,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${testResult.ok ? "rgba(68,204,170,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                  <CheckCircle size={14} color={testResult.ok ? S.green : "#ff6666"} />
                  <span style={{ fontSize: 13, color: testResult.ok ? S.green : "#ff6666" }}>{testResult.message}</span>
                </div>
              )}
            </div>
          )}

          {/* 設定サマリー */}
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>設定内容</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
              <div><span style={{ color: S.faint }}>業者名:</span> <span style={{ color: S.text }}>{existingVendor?.name ?? form.name}</span></div>
              <div><span style={{ color: S.faint }}>接続:</span> <span style={{ color: S.text }}>{connectionType}</span></div>
              {existingVendor?.contact_email && <div style={{ gridColumn: "1 / -1" }}><span style={{ color: S.faint }}>メール:</span> <span style={{ color: S.text }}>{existingVendor.contact_email}</span></div>}
              <div><span style={{ color: S.faint }}>基本料:</span> <span style={{ color: S.text }}>¥{Number(existingVendor?.base_fee ?? form.base_fee).toLocaleString()}</span></div>
              <div><span style={{ color: S.faint }}>1件:</span> <span style={{ color: S.text }}>¥{Number(existingVendor?.per_item_fee ?? form.per_item_fee).toLocaleString()}</span></div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleActivate}
              style={{ flex: 1, background: "linear-gradient(135deg,#003d30,#005040)", border: "1px solid rgba(68,204,170,0.4)", borderRadius: 8, color: S.green, padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <CheckCircle size={16} /> 有効化して完了
            </button>
            <button onClick={() => setStep(2)} style={{ background: "transparent", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, color: S.muted, padding: "12px 16px", cursor: "pointer" }}>設定を変更</button>
            <Link href="/fulfillment/vendors" style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderRadius: 8, border: `1px solid rgba(255,255,255,0.08)`, color: S.faint, fontSize: 12, textDecoration: "none" }}>
              後で有効化
            </Link>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
