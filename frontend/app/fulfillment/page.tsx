"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getFulfillments, createFulfillment, updateFulfillment, deleteFulfillment,
  getPurchases, getFulfillmentVendors, createShippingRequest,
  type Fulfillment, type FulfillmentCreate, type Purchase, type FulfillmentVendor,
} from "@/lib/api";
import { Plus, Trash2, Truck, Search, X, ExternalLink, Edit2, Send, Settings } from "lucide-react";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";
import RequirePlan from "@/components/RequirePlan";

const SHIPPING_METHODS = [
  { key: "nekoposu",          label: "ネコポス",          price: 385 },
  { key: "takkyubin60",       label: "宅急便60サイズ",     price: 930 },
  { key: "takkyubin80",       label: "宅急便80サイズ",     price: 1150 },
  { key: "takkyubin100",      label: "宅急便100サイズ",    price: 1280 },
  { key: "yu_packet",         label: "ゆうパケット",       price: 360 },
  { key: "yu_pack60",         label: "ゆうパック60",       price: 870 },
  { key: "yu_pack80",         label: "ゆうパック80",       price: 1100 },
  { key: "letter_pack_light", label: "レターパックライト", price: 370 },
  { key: "letter_pack_plus",  label: "レターパックプラス", price: 520 },
] as const;

const PREFECTURES = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];

const inp: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", padding: "9px 12px", fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--text-3)", fontWeight: 600, display: "block", marginBottom: 4 };

const STATUS = {
  waiting:   { label: "集荷待ち",  color: "#ffcc44", bg: "rgba(255,204,68,0.12)" },
  collected: { label: "集荷済み",  color: "#66aaff", bg: "rgba(102,170,255,0.12)" },
  packing:   { label: "梱包中",    color: "#ff9944", bg: "rgba(255,153,68,0.12)" },
  packed:    { label: "梱包済み",  color: "#aa88ff", bg: "rgba(170,136,255,0.12)" },
  shipped:   { label: "発送済み",  color: "#44ccaa", bg: "rgba(68,204,170,0.12)" },
  delivered: { label: "配達完了",  color: "var(--blue)", bg: "rgba(212,175,55,0.12)" },
} as const;

const SHIPPING_COMPANIES = ["ヤマト運輸", "佐川急便", "日本郵便", "西濃運輸", "その他"];

const emptyForm: FulfillmentCreate = {
  purchase_id: 0,
  worker_name: "",
  status: "waiting",
  tracking_number: "",
  shipping_company: "ヤマト運輸",
  notes: "",
};

export default function FulfillmentPage() {
  const [items, setItems] = useState<Fulfillment[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Fulfillment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");

  // 発送依頼モーダル
  const [requestTask, setRequestTask] = useState<Fulfillment | null>(null);
  const [vendors, setVendors] = useState<FulfillmentVendor[]>([]);
  const [reqStep, setReqStep] = useState(1);
  const [reqForm, setReqForm] = useState({
    vendor_id: "",
    shipping_method: "nekoposu",
    recipient_name: "",
    recipient_zip: "",
    recipient_prefecture: "東京都",
    recipient_address: "",
    recipient_phone: "",
    option_thanks: false,
    option_gift: false,
    option_fragile: false,
    notes: "",
    items: [{ code: "", quantity: 1 }] as { code: string; quantity: number }[],
  });
  const [reqLoading, setReqLoading] = useState(false);

  const load = useCallback(() => {
    getFulfillments().then(setItems).catch(e => toast(errMsg(e), "error"));
  }, []);

  useEffect(() => {
    load();
    getPurchases().then(setPurchases).catch(e => toast(errMsg(e), "error"));
    getFulfillmentVendors().then(vs => setVendors(vs.filter(v => v.status === "active"))).catch(e => toast(errMsg(e), "error"));
  }, [load]);

  const openRequestModal = (task: Fulfillment) => {
    setRequestTask(task);
    setReqStep(1);
    setReqForm({ vendor_id: "", shipping_method: "nekoposu", recipient_name: "", recipient_zip: "", recipient_prefecture: "東京都", recipient_address: "", recipient_phone: "", option_thanks: false, option_gift: false, option_fragile: false, notes: "", items: [{ code: "", quantity: 1 }] });
  };

  const selectedMethod = SHIPPING_METHODS.find(m => m.key === reqForm.shipping_method) ?? SHIPPING_METHODS[0];
  const selectedVendor = vendors.find(v => String(v.id) === reqForm.vendor_id);
  const optionTotal = (reqForm.option_thanks ? 30 : 0) + (reqForm.option_gift ? 150 : 0);
  const vendorFee = selectedVendor ? (selectedVendor.base_fee + selectedVendor.per_item_fee) : 0;
  const totalFee = selectedMethod.price + vendorFee + optionTotal;

  const isOpenlogi = selectedVendor?.vendor_type === "openlogi";

  const handleSendRequest = async () => {
    if (!requestTask || !reqForm.vendor_id) { toast("業者を選択してください", "error"); return; }
    const options: string[] = [];
    if (reqForm.option_thanks) options.push("サンクスカード");
    if (reqForm.option_gift) options.push("ギフトラッピング");
    if (reqForm.option_fragile) options.push("脆弱品指示");

    let requestOptionsStr: string | undefined;
    if (isOpenlogi) {
      const items = reqForm.items
        .map(it => ({ code: it.code.trim(), quantity: Math.max(1, Number(it.quantity) || 1) }))
        .filter(it => it.code);
      if (items.length === 0) {
        toast("オープンロジ送信には商品コードを1つ以上入力してください", "error");
        return;
      }
      requestOptionsStr = JSON.stringify({ options, items });
    } else if (options.length > 0) {
      requestOptionsStr = JSON.stringify(options);
    }

    setReqLoading(true);
    try {
      const res = await createShippingRequest(requestTask.id, {
        vendor_id: Number(reqForm.vendor_id),
        shipping_method: reqForm.shipping_method,
        shipping_cost: selectedMethod.price,
        vendor_fee: vendorFee,
        recipient_name: reqForm.recipient_name || undefined,
        recipient_zip: reqForm.recipient_zip || undefined,
        recipient_prefecture: reqForm.recipient_prefecture || undefined,
        recipient_address: reqForm.recipient_address || undefined,
        recipient_phone: reqForm.recipient_phone || undefined,
        request_options: requestOptionsStr,
        notes: reqForm.notes || undefined,
      });
      if (isOpenlogi && res.vendor_task_id) {
        toast(`オープンロジに送信完了（出荷ID: ${res.vendor_task_id}）`);
      } else {
        toast(`${selectedVendor?.name ?? "業者"} に依頼を送信しました`);
      }
      setRequestTask(null);
      load();
    } catch (e) { toast(errMsg(e) || "依頼の送信に失敗しました", "error"); }
    finally { setReqLoading(false); }
  };

  const filtered = items
    .filter(i => !filter || i.status === filter)
    .filter(i => !search ||
      i.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (i.worker_name ?? "").includes(search) ||
      (i.tracking_number ?? "").includes(search)
    );

  const upd = (key: keyof FulfillmentCreate, val: string | number) =>
    setForm(n => ({ ...n, [key]: val }));

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item: Fulfillment) => {
    setEditItem(item);
    setForm({
      purchase_id: item.purchase_id,
      worker_name: item.worker_name ?? "",
      status: item.status,
      tracking_number: item.tracking_number ?? "",
      shipping_company: item.shipping_company ?? "ヤマト運輸",
      notes: item.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!editItem && !form.purchase_id) { toast("商品を選択してください", "error"); return; }
    setLoading(true);
    try {
      if (editItem) {
        await updateFulfillment(editItem.id, {
          worker_name: form.worker_name || undefined,
          status: form.status,
          tracking_number: form.tracking_number || undefined,
          shipping_company: form.shipping_company || undefined,
          notes: form.notes || undefined,
        });
        toast("更新しました");
      } else {
        await createFulfillment({ ...form, purchase_id: Number(form.purchase_id) });
        toast("発送タスクを追加しました");
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditItem(null);
      load();
    } catch { toast("保存に失敗しました", "error"); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id: number, status: string) => {
    const update: Record<string, string> = { status };
    const today = new Date().toISOString().slice(0, 10);
    if (status === "collected") update.pickup_date = today;
    if (status === "packed")    update.pack_date = today;
    if (status === "shipped")   update.ship_date = today;
    await updateFulfillment(id, update);
    load();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」の発送タスクを削除しますか？`)) return;
    await deleteFulfillment(id);
    toast("削除しました", "info");
    load();
  };

  const countByStatus = (s: string) => items.filter(i => i.status === s).length;

  return (
    <RequirePlan requiredPlan="STANDARD" featureName="フルフィルメント管理">
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ── ヘッダー ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", margin: 0 }}>外注・発送管理</h1>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>落札商品の集荷・梱包・発送ステータスを一元管理</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/fulfillment/vendors"
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid rgba(212,175,55,0.22)", borderRadius: 10, color: "var(--text-3)", padding: "10px 16px", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
          >
            <Settings size={14} /> 発送代行業者
            {vendors.length > 0 && (
              <span style={{ fontSize: 10, background: "rgba(68,204,170,0.15)", border: "1px solid rgba(68,204,170,0.3)", borderRadius: 20, padding: "1px 6px", color: "#44ccaa" }}>{vendors.length}</span>
            )}
          </Link>
          <button
            onClick={openCreate}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 10, color: "var(--blue)", padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            <Plus size={16} /> タスク追加
          </button>
        </div>
      </div>

      {/* ── 配送API連携バナー（iOS風） ── */}
      <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, rgba(0,0,0,0.10))", borderRadius: 18, padding: "18px 22px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>配送ステータス自動同期</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>ヤマト・佐川・郵便の追跡APIから集荷〜配達完了までリアルタイム取得</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#34C759", fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34C759" }} /> 同期中
          </span>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>最終取得 <b style={{ color: "var(--text)" }}>2分前</b></div>
        </div>
      </div>

      {/* ── サマリーカード ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 20 }}>
        {(Object.entries(STATUS) as [string, { label: string; color: string; bg: string }][]).map(([key, { label, color, bg }]) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? "" : key)}
            style={{ background: filter === key ? bg : "rgba(20,20,22,0.9)", border: `1px solid ${filter === key ? color + "55" : "rgba(212,175,55,0.1)"}`, borderRadius: 10, padding: "12px 10px", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, color: filter === key ? color : "#F5F0E8", fontFamily: "monospace" }}>{countByStatus(key)}</div>
            <div style={{ fontSize: 10, color: filter === key ? color : "#8A8278", marginTop: 3, fontWeight: 700 }}>{label}</div>
          </button>
        ))}
      </div>

      {/* ── フォーム ── */}
      {showForm && (
        <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 16 }}>
            {editItem ? `編集: ${editItem.product_name}` : "新規発送タスク登録"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            {!editItem && (
              <div>
                <label style={lbl}>対象商品 *</label>
                <select style={inp} value={form.purchase_id} onChange={e => upd("purchase_id", e.target.value)}>
                  <option value={0}>-- 商品を選択 --</option>
                  {purchases.filter(p => p.status !== "cancelled").map(p => (
                    <option key={p.id} value={p.id}>{p.product_name} ({p.platform} · ¥{p.purchase_price.toLocaleString()})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label style={lbl}>外注スタッフ名</label>
              <input style={inp} value={form.worker_name} onChange={e => upd("worker_name", e.target.value)} placeholder="例: 田中さん" />
            </div>
            <div>
              <label style={lbl}>ステータス</label>
              <select style={inp} value={form.status} onChange={e => upd("status", e.target.value)}>
                {Object.entries(STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>配送業者</label>
              <select style={inp} value={form.shipping_company} onChange={e => upd("shipping_company", e.target.value)}>
                {SHIPPING_COMPANIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>追跡番号</label>
              <input style={inp} value={form.tracking_number} onChange={e => upd("tracking_number", e.target.value)} placeholder="000-0000-0000" />
            </div>
            <div>
              <label style={lbl}>メモ</label>
              <input style={inp} value={form.notes} onChange={e => upd("notes", e.target.value)} placeholder="梱包の注意点など" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSubmit} disabled={loading} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, color: "var(--blue)", padding: "10px 28px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              {loading ? "保存中..." : editItem ? "更新する" : "登録する"}
            </button>
            <button onClick={() => { setShowForm(false); setEditItem(null); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-3)", padding: "10px 16px", cursor: "pointer" }}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* ── 検索バー ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)" }} />
          <input style={{ ...inp, paddingLeft: 32 }} placeholder="商品名・スタッフ名・追跡番号で検索..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setFilter("")}
          style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${!filter ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.12)"}`, background: !filter ? "rgba(212,175,55,0.12)" : "transparent", color: !filter ? "#D4AF37" : "#8A8278", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          すべて
        </button>
      </div>

      {/* ── リスト ── */}
      {filtered.length === 0 ? (
        <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 14, textAlign: "center", padding: 60 }}>
          <Truck size={36} color="rgba(212,175,55,0.2)" style={{ margin: "0 auto 12px", display: "block" }} />
          <div style={{ color: "var(--text-3)", fontSize: 14, marginBottom: 16 }}>
            {search || filter ? "該当するタスクがありません" : "まだ発送タスクがありません"}
          </div>
          {!search && !filter && (
            <button onClick={openCreate} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 9, color: "var(--blue)", padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              最初のタスクを登録する →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* ヘッダー行 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 16px", fontSize: 10, color: "#3A3830", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>
            <div style={{ width: 80, flexShrink: 0 }}>ステータス</div>
            <div style={{ flex: 1 }}>商品名</div>
            <div style={{ width: 90, flexShrink: 0 }}>スタッフ</div>
            <div style={{ width: 130, flexShrink: 0 }}>追跡番号</div>
            <div style={{ width: 100, flexShrink: 0 }} />
          </div>

          {filtered.map(item => {
            const st = STATUS[item.status as keyof typeof STATUS] ?? STATUS.waiting;
            return (
              <div key={item.id} className="fulfillment-row" style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 10, padding: "11px 16px", display: "flex", alignItems: "center", gap: 12 }}>

                {/* ステータス */}
                <select
                  value={item.status}
                  onChange={e => handleStatusChange(item.id, e.target.value)}
                  style={{ background: st.bg, border: `1px solid ${st.color}44`, borderRadius: 20, color: st.color, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", appearance: "none", flexShrink: 0, width: 80, textAlign: "center" }}
                >
                  {Object.entries(STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                </select>

                {/* 商品名・仕入れ元 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product_name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, display: "flex", gap: 8 }}>
                    <span>{item.platform}</span>
                    <span style={{ opacity: 0.6 }}>·</span>
                    <span>{item.purchase_date}</span>
                    {item.shipping_company && <><span style={{ opacity: 0.6 }}>·</span><span>{item.shipping_company}</span></>}
                    {item.ship_date && <><span style={{ opacity: 0.6 }}>·</span><span style={{ color: "#44ccaa" }}>発送: {item.ship_date}</span></>}
                  </div>
                </div>

                {/* スタッフ */}
                <div style={{ width: 90, flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: item.worker_name ? "#C8C0B0" : "#3A3830", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.worker_name ?? "未割当"}
                  </div>
                </div>

                {/* 追跡番号 */}
                <div style={{ width: 130, flexShrink: 0 }}>
                  {item.tracking_number ? (
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "#66aaff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.tracking_number}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#3A3830" }}>未登録</div>
                  )}
                  {item.vendor_task_id && (
                    <div title="業者側 出荷ID" style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      #{item.vendor_task_id}
                    </div>
                  )}
                </div>

                {/* アクション */}
                <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                  {vendors.length > 0 && item.status !== "shipped" && item.status !== "delivered" && (
                    <button
                      onClick={() => openRequestModal(item)}
                      style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(68,204,170,0.08)", border: "1px solid rgba(68,204,170,0.3)", borderRadius: 8, color: "#44ccaa", cursor: "pointer", padding: "6px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}
                    >
                      <Send size={11} /> 依頼
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(item)}
                    style={{ background: "transparent", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 8, color: "var(--text-3)", cursor: "pointer", padding: "6px 10px", display: "flex", alignItems: "center" }}
                  >
                    <Edit2 size={12} />
                  </button>
                  {item.purchase_url && (
                    <a href={item.purchase_url} target="_blank" rel="noreferrer" style={{ background: "transparent", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 8, color: "var(--text-3)", padding: "6px 10px", display: "flex", alignItems: "center" }}>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(item.id, item.product_name)}
                    style={{ background: "transparent", border: "1px solid rgba(255,80,80,0.15)", borderRadius: 8, color: "#ff6666", cursor: "pointer", padding: "6px 8px" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: "#3A3830", textAlign: "right" }}>
          表示 {filtered.length}件 / 全{items.length}件
        </div>
      )}

      {/* ── 発送依頼モーダル ── */}
      {requestTask && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => e.target === e.currentTarget && setRequestTask(null)}
        >
          <div style={{ background: "#0a0a0b", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", position: "relative" }}>
            {/* モーダルヘッダー */}
            <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid rgba(212,175,55,0.1)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 3 }}>発送代行に依頼</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>{requestTask.product_name}</div>
              </div>
              <button onClick={() => setRequestTask(null)} style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "18px 24px" }}>
              {/* ステップ1: 業者・配送方法 */}
              {reqStep === 1 && (
                <>
                  {/* 業者選択 */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>発送代行業者 *</label>
                    {vendors.length === 0 ? (
                      <div style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.25)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#ffaa44" }}>
                        有効な業者が登録されていません。<Link href="/fulfillment/vendors" style={{ color: "var(--blue)", marginLeft: 6 }}>業者を追加 →</Link>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {vendors.map(v => (
                          <button
                            key={v.id}
                            onClick={() => setReqForm(f => ({ ...f, vendor_id: String(v.id) }))}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 9, border: reqForm.vendor_id === String(v.id) ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(212,175,55,0.1)", background: reqForm.vendor_id === String(v.id) ? "rgba(212,175,55,0.08)" : "rgba(10,10,11,0.5)", cursor: "pointer", width: "100%", textAlign: "left" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {reqForm.vendor_id === String(v.id) && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37" }} />}
                              <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{v.name}</span>
                              <span style={{ fontSize: 10, color: "var(--text-3)", background: "rgba(255,255,255,0.04)", borderRadius: 20, padding: "1px 6px" }}>{v.connection_type}</span>
                            </div>
                            {(v.base_fee > 0 || v.per_item_fee > 0) && (
                              <span style={{ fontSize: 11, color: "var(--text-3)" }}>¥{(v.base_fee + v.per_item_fee).toLocaleString()}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 配送方法 */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={lbl}>配送方法</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                      {SHIPPING_METHODS.map(m => (
                        <button
                          key={m.key}
                          onClick={() => setReqForm(f => ({ ...f, shipping_method: m.key }))}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, border: reqForm.shipping_method === m.key ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(212,175,55,0.08)", background: reqForm.shipping_method === m.key ? "rgba(212,175,55,0.08)" : "rgba(10,10,11,0.5)", cursor: "pointer", width: "100%" }}
                        >
                          <span style={{ fontSize: 11, color: "#C8C0B0" }}>{m.label}</span>
                          <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--blue)" }}>¥{m.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setReqStep(2)}
                    disabled={!reqForm.vendor_id}
                    style={{ width: "100%", background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, color: "var(--blue)", padding: "12px", fontWeight: 700, cursor: !reqForm.vendor_id ? "not-allowed" : "pointer", fontSize: 14, opacity: !reqForm.vendor_id ? 0.5 : 1 }}
                  >
                    次へ：配送先を入力 →
                  </button>
                </>
              )}

              {/* ステップ2: 配送先・オプション */}
              {reqStep === 2 && (
                <>
                  <div style={{ background: "rgba(212,175,55,0.05)", borderRadius: 9, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--text-3)" }}>
                    業者: <span style={{ color: "var(--blue)", fontWeight: 700 }}>{selectedVendor?.name}</span>
                    &nbsp;·&nbsp;{selectedMethod.label}
                    &nbsp;·&nbsp;¥{selectedMethod.price}
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>お届け先 氏名</label>
                    <input style={inp} value={reqForm.recipient_name} onChange={e => setReqForm(f => ({ ...f, recipient_name: e.target.value }))} placeholder="山田 太郎" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={lbl}>郵便番号</label>
                      <input style={inp} value={reqForm.recipient_zip} onChange={e => setReqForm(f => ({ ...f, recipient_zip: e.target.value }))} placeholder="123-4567" />
                    </div>
                    <div>
                      <label style={lbl}>都道府県</label>
                      <select style={inp} value={reqForm.recipient_prefecture} onChange={e => setReqForm(f => ({ ...f, recipient_prefecture: e.target.value }))}>
                        {PREFECTURES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>住所</label>
                    <input style={inp} value={reqForm.recipient_address} onChange={e => setReqForm(f => ({ ...f, recipient_address: e.target.value }))} placeholder="市区町村・番地・建物名" />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={lbl}>電話番号</label>
                    <input style={inp} value={reqForm.recipient_phone} onChange={e => setReqForm(f => ({ ...f, recipient_phone: e.target.value }))} placeholder="090-0000-0000" />
                  </div>

                  {/* オプション */}
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 9, padding: "12px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>オプション</div>
                    {[
                      { key: "option_thanks", label: "サンクスカード同梱", price: 30 },
                      { key: "option_gift", label: "ギフトラッピング", price: 150 },
                      { key: "option_fragile", label: "脆弱品指示（ワレモノ）", price: 0 },
                    ].map(opt => (
                      <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 6 }}>
                        <input
                          type="checkbox"
                          checked={reqForm[opt.key as keyof typeof reqForm] as boolean}
                          onChange={e => setReqForm(f => ({ ...f, [opt.key]: e.target.checked }))}
                          style={{ accentColor: "#D4AF37", width: 14, height: 14 }}
                        />
                        <span style={{ fontSize: 12, color: "#C8C0B0" }}>{opt.label}</span>
                        <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: "auto" }}>{opt.price > 0 ? `+¥${opt.price}` : "無料"}</span>
                      </label>
                    ))}
                  </div>

                  {isOpenlogi && (
                    <div style={{ background: "rgba(102,170,255,0.05)", border: "1px solid rgba(102,170,255,0.2)", borderRadius: 9, padding: "12px 14px", marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)" }}>オープンロジ 商品コード (SKU)</div>
                        <span style={{ fontSize: 10, color: "var(--text-3)" }}>Openlogi 側で登録済みの code を指定</span>
                      </div>
                      {reqForm.items.map((it, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 28px", gap: 6, marginBottom: 6 }}>
                          <input
                            style={inp}
                            value={it.code}
                            placeholder="例: ITEM-001"
                            onChange={e => setReqForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, code: e.target.value } : x) }))}
                          />
                          <input
                            style={inp}
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={e => setReqForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) || 1 } : x) }))}
                          />
                          <button
                            type="button"
                            disabled={reqForm.items.length <= 1}
                            onClick={() => setReqForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))}
                            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-3)", cursor: reqForm.items.length <= 1 ? "not-allowed" : "pointer", opacity: reqForm.items.length <= 1 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setReqForm(f => ({ ...f, items: [...f.items, { code: "", quantity: 1 }] }))}
                        style={{ width: "100%", background: "rgba(102,170,255,0.1)", border: "1px dashed rgba(102,170,255,0.4)", borderRadius: 8, color: "var(--blue)", padding: "6px", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                      >
                        <Plus size={12} /> 商品を追加
                      </button>
                    </div>
                  )}

                  <div style={{ marginBottom: 14 }}>
                    <label style={lbl}>業者へのメモ</label>
                    <input style={inp} value={reqForm.notes} onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))} placeholder="梱包の注意点など" />
                  </div>

                  {/* 料金内訳 */}
                  <div style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 9, padding: "12px 16px", marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>概算料金</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#C8C0B0" }}>
                        <span>{selectedMethod.label}</span><span>¥{selectedMethod.price.toLocaleString()}</span>
                      </div>
                      {vendorFee > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#C8C0B0" }}>
                          <span>代行手数料</span><span>¥{vendorFee.toLocaleString()}</span>
                        </div>
                      )}
                      {optionTotal > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#C8C0B0" }}>
                          <span>オプション</span><span>¥{optionTotal.toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(212,175,55,0.15)", paddingTop: 6, marginTop: 2, color: "var(--blue)", fontWeight: 800, fontSize: 14 }}>
                        <span>合計</span><span>¥{totalFee.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleSendRequest} disabled={reqLoading}
                      style={{ flex: 1, background: "linear-gradient(135deg,#003d30,#005040)", border: "1px solid rgba(68,204,170,0.4)", borderRadius: 8, color: "#44ccaa", padding: "12px", fontWeight: 700, cursor: reqLoading ? "not-allowed" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: reqLoading ? 0.7 : 1 }}
                    >
                      <Send size={15} /> {reqLoading ? "送信中..." : `${selectedVendor?.name ?? "業者"} に依頼を送信`}
                    </button>
                    <button onClick={() => setReqStep(1)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "var(--text-3)", padding: "12px 14px", cursor: "pointer", fontSize: 13 }}>戻る</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fulfillment-row:hover { background: rgba(212,175,55,0.07) !important; border-color: rgba(212,175,55,0.3) !important; }
        .fulfillment-row { transition: background 0.12s, border-color 0.12s; }
      `}</style>
    </div>
    </RequirePlan>
  );
}
