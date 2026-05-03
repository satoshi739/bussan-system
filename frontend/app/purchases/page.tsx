"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getPurchases, createPurchase, updatePurchase, updatePurchaseStatus, deletePurchase,
  calcAllPlatforms, createFulfillment, getProductNames, importPurchasesCSV,
  bulkUpdatePurchases, bulkDeletePurchases, getPurchaseListingLinks,
  type Purchase,
} from "@/lib/api";
import {
  Plus, Trash2, ExternalLink, Search, DollarSign, X, TrendingUp, Package,
  ShoppingCart, CheckCircle, Download, AlertTriangle, Pencil, Save, Truck, Upload,
  Store,
} from "lucide-react";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";
import { usePlan } from "@/lib/usePlan";
import Link from "next/link";

const FREE_PLAN_LIMIT = 30;
const LS_PLATFORM  = "bussan_last_platform";
const LS_SHIPPING  = "bussan_last_shipping";

const inp: React.CSSProperties = {
  background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.3)",
  borderRadius: 8, color: "#F5F0E8", padding: "9px 12px", fontSize: 14,
  width: "100%", outline: "none", boxSizing: "border-box",
};
const inpSm: React.CSSProperties = { ...inp, padding: "6px 8px", fontSize: 13 };
const lbl: React.CSSProperties = {
  fontSize: 12, color: "#8A8278", fontWeight: 600, display: "block", marginBottom: 4,
};

const STATUS = {
  purchased: { label: "仕入済み",  color: "#ffcc44", bg: "rgba(255,204,68,0.12)" },
  listed:    { label: "出品中",    color: "#66ccff", bg: "rgba(102,204,255,0.12)" },
  sold:      { label: "売却済み",  color: "#D4AF37", bg: "rgba(212,175,55,0.12)" },
  cancelled: { label: "キャンセル", color: "#ff6666", bg: "rgba(255,102,102,0.1)" },
};
const PLATFORMS = ["メルカリ", "eBay", "ヤフオク", "Amazon", "楽天", "ラクマ", "その他"];
const today = new Date().toISOString().slice(0, 10);

function makeEmpty() {
  const lastPlatform = (typeof window !== "undefined" && localStorage.getItem(LS_PLATFORM)) || "ヤフオク";
  const lastShipping = (typeof window !== "undefined" && localStorage.getItem(LS_SHIPPING)) || "";
  return { product_name: "", platform: lastPlatform, purchase_price: "", purchase_shipping: lastShipping, purchase_url: "", purchase_date: today, notes: "" };
}

// RFC 4180準拠のCSVパーサー（カンマを含む商品名も正しく処理）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─────────────────────────────────────────────
export default function PurchasesPage() {
  const { plan } = usePlan();
  const [items, setItems]         = useState<Purchase[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(makeEmpty);
  const [loading, setLoading]     = useState(false);
  const [filter, setFilter]       = useState("");  // デフォルトは「すべて」
  const [search, setSearch]       = useState("");
  const isFree = plan === "FREE";

  // 商品名オートコンプリート
  const [productNames, setProductNames] = useState<string[]>([]);

  // インライン編集
  const [editId,   setEditId]   = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof form>>({});

  // 売却モーダル
  const [quickSell,    setQuickSell]   = useState<Purchase | null>(null);
  const [sellPrice,    setSellPrice]   = useState("");
  const [sellPlatform, setSellPlatform] = useState("メルカリ");
  const [comparison,   setComparison]  = useState<Record<string, { gross_profit: number; profit_rate: number; emoji: string }> | null>(null);
  const [sellResult,   setSellResult]  = useState<{ net_profit: number; monthly_profit: number } | null>(null);

  // 売却価格デバウンス用
  const sellPriceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 発送タスク作成中
  const [fulfillmentLoading, setFulfillmentLoading] = useState<Set<number>>(new Set());

  // 削除確認モーダル
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);

  // 一括操作
  const [selectedIds,    setSelectedIds]   = useState<Set<number>>(new Set());
  const [bulkStatus,     setBulkStatus]    = useState("listed");
  const [bulkLoading,    setBulkLoading]   = useState(false);

  // 出品モーダル
  type ListingLink = { label: string; flag: string; url: string; note: string; category: string; recommended: boolean; price_display: string };
  const [listingModal,   setListingModal]  = useState<{ purchase_id: number; product_name: string; cost_jpy: number; suggested_price_jpy: number; links: Record<string, ListingLink> } | null>(null);
  const [listingLoading, setListingLoading] = useState<number | null>(null);

  // CSVインポート
  const [showCsv,      setShowCsv]     = useState(false);
  const [csvFile,      setCsvFile]     = useState<File | null>(null);
  const [csvRows,      setCsvRows]     = useState<Record<string, string>[]>([]);
  const [csvCols,      setCsvCols]     = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult,    setCsvResult]   = useState<{ imported: number; errors: string[]; parse_errors: string[] } | null>(null);
  const [csvStep,      setCsvStep]     = useState<"upload" | "preview" | "done">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // フォームフィールドの ref（Tab ナビ用）
  const f_name      = useRef<HTMLInputElement>(null);
  const f_platform  = useRef<HTMLSelectElement>(null);
  const f_date      = useRef<HTMLInputElement>(null);
  const f_price     = useRef<HTMLInputElement>(null);
  const f_shipping  = useRef<HTMLInputElement>(null);
  const f_url       = useRef<HTMLInputElement>(null);
  const f_notes     = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    getPurchases().then(setItems).catch(e => toast(errMsg(e), "error"));
    getProductNames().then(setProductNames).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const allItemsCount = items.length;
  const byStatus = (s: string) => items.filter(i => i.status === s);
  const totalCostAll = items.filter(i => i.status !== "cancelled").reduce((s, i) => s + i.purchase_price + i.purchase_shipping, 0);
  const filtered = items
    .filter(i => !filter || i.status === filter)
    .filter(i => !search || i.product_name.toLowerCase().includes(search.toLowerCase()) || i.platform.includes(search));

  const upd = (key: keyof ReturnType<typeof makeEmpty>, val: string) =>
    setForm(n => ({ ...n, [key]: val }));

  // ── フォーム保存 ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.product_name || !form.purchase_price) {
      toast("商品名と仕入れ価格は必須です", "error"); return;
    }
    setLoading(true);
    try {
      await createPurchase({
        product_name: form.product_name, platform: form.platform,
        purchase_price: Number(form.purchase_price),
        purchase_shipping: Number(form.purchase_shipping) || 0,
        purchase_url: form.purchase_url || undefined,
        purchase_date: form.purchase_date, notes: form.notes || undefined,
        image_data: undefined,
      });
      localStorage.setItem(LS_PLATFORM, form.platform);
      localStorage.setItem(LS_SHIPPING, form.purchase_shipping);
      toast("仕入れを追加しました ✅");
      setForm(makeEmpty()); setShowForm(false); load();
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setLoading(false); }
  };

  // ── インライン編集 ─────────────────────────────────────────
  const startEdit = (item: Purchase) => {
    setEditId(item.id);
    setEditForm({
      product_name: item.product_name, platform: item.platform,
      purchase_price: String(item.purchase_price),
      purchase_shipping: String(item.purchase_shipping),
      purchase_url: item.purchase_url ?? "",
      purchase_date: item.purchase_date, notes: item.notes ?? "",
    });
  };

  const cancelEdit = () => { setEditId(null); setEditForm({}); };

  const saveEdit = async (id: number) => {
    if (!editForm.product_name || !editForm.purchase_price) {
      toast("商品名と価格は必須です", "error"); return;
    }
    try {
      await updatePurchase(id, {
        product_name:      editForm.product_name,
        platform:          editForm.platform,
        purchase_price:    Number(editForm.purchase_price),
        purchase_shipping: Number(editForm.purchase_shipping) || 0,
        purchase_url:      editForm.purchase_url || undefined,
        purchase_date:     editForm.purchase_date,
        notes:             editForm.notes || undefined,
      });
      toast("更新しました ✅");
      setEditId(null); setEditForm({}); load();
    } catch (e) { toast(errMsg(e), "error"); }
  };

  // ── ステータス変更・削除 ───────────────────────────────────
  const handleStatusChange = async (id: number, status: string) => {
    await updatePurchaseStatus(id, status); load();
  };

  // confirm()を使わずカスタムモーダルで確認
  const handleDelete = (id: number, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await deletePurchase(deleteConfirm.id);
    toast("削除しました", "info");
    setDeleteConfirm(null);
    load();
  };

  // ── 発送タスク作成ショートカット ──────────────────────────
  const handleCreateFulfillment = async (item: Purchase) => {
    if (fulfillmentLoading.has(item.id)) return;
    setFulfillmentLoading(prev => new Set(prev).add(item.id));
    try {
      await createFulfillment({
        purchase_id: item.id, status: "waiting",
        shipping_company: "ヤマト運輸",
      });
      toast(`「${item.product_name}」の発送タスクを作成しました 📦`);
    } catch (e) { toast(errMsg(e), "error"); }
    finally {
      setFulfillmentLoading(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  };

  // ── 一括操作 ──────────────────────────────────────────────
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(i => i.id)));
    }
  };

  const handleBulkStatus = async () => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    try {
      await bulkUpdatePurchases(Array.from(selectedIds), bulkStatus);
      toast(`${selectedIds.size}件のステータスを変更しました ✅`);
      setSelectedIds(new Set());
      load();
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setBulkLoading(false); }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    try {
      await bulkDeletePurchases(Array.from(selectedIds));
      toast(`${selectedIds.size}件を削除しました`, "info");
      setSelectedIds(new Set());
      load();
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setBulkLoading(false); }
  };

  // ── 出品モーダル ──────────────────────────────────────────
  const openListingModal = async (item: Purchase) => {
    setListingLoading(item.id);
    try {
      const data = await getPurchaseListingLinks(item.id);
      setListingModal(data);
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setListingLoading(null); }
  };

  const markAsListed = async (id: number) => {
    await updatePurchaseStatus(id, "listed");
    toast("出品中に変更しました ✅");
    setListingModal(null);
    load();
  };

  // ── 売却モーダル ──────────────────────────────────────────
  const openSell = (item: Purchase) => {
    setQuickSell(item); setSellPrice(""); setComparison(null);
    setSellPlatform("メルカリ"); setSellResult(null);
  };

  // デバウンス付き売却価格変更（400ms待ってからAPIを叩く）
  const handleSellPriceChange = useCallback((val: string, item: Purchase) => {
    setSellPrice(val);
    if (sellPriceTimer.current) clearTimeout(sellPriceTimer.current);
    if (!val || Number(val) <= 0) { setComparison(null); return; }
    sellPriceTimer.current = setTimeout(async () => {
      try {
        const r = await calcAllPlatforms({
          purchase_price: item.purchase_price,
          purchase_shipping: item.purchase_shipping,
          selling_price: Number(val),
        });
        setComparison(r);
      } catch { /* ignore */ }
    }, 400);
  }, []);

  const handleQuickSell = async () => {
    if (!quickSell || !sellPrice) { toast("売却価格を入力してください", "error"); return; }
    setLoading(true);
    try {
      const { createSaleSimple } = await import("@/lib/api");
      const res = await createSaleSimple({
        purchase_id: quickSell.id, sale_price: Number(sellPrice), sell_platform: sellPlatform,
      });
      setSellResult(res);
      load();
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setLoading(false); }
  };

  const sortedComparison = comparison
    ? Object.entries(comparison).sort((a, b) => b[1].gross_profit - a[1].gross_profit)
    : [];

  // ── CSV パース（RFC4180準拠・ブラウザ側プレビュー用）─────────────────
  const parseCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = (e.target?.result as string) ?? "";
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast("CSVに行データがありません", "error"); return; }
      const cols = parseCSVLine(lines[0]);
      const rows = lines.slice(1, 6).map(line => {
        const vals = parseCSVLine(line);
        return Object.fromEntries(cols.map((c, i) => [c, vals[i] ?? ""]));
      });
      setCsvCols(cols); setCsvRows(rows); setCsvStep("preview");
    };
    reader.readAsText(file, "utf-8");
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file); setCsvResult(null);
    parseCsvFile(file);
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;
    setCsvImporting(true);
    try {
      const result = await importPurchasesCSV(csvFile);
      setCsvResult(result); setCsvStep("done"); load();
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setCsvImporting(false); }
  };

  const resetCsvModal = () => {
    setShowCsv(false); setCsvFile(null); setCsvRows([]); setCsvCols([]);
    setCsvResult(null); setCsvStep("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── キーボードナビ（フォーム） ────────────────────────────
  const navKey = (e: React.KeyboardEvent, next: React.RefObject<HTMLElement | null>, isLast = false) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isLast) handleSubmit();
      else (next.current as HTMLElement | null)?.focus();
    }
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <datalist id="pnames">
        {productNames.map(n => <option key={n} value={n} />)}
      </datalist>

      {/* ── ヘッダー ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", margin: 0 }}>仕入れ管理</h1>
          <div style={{ fontSize: 12, color: "#8A8278", marginTop: 3 }}>仕入れた商品の一覧・ステータス管理</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/purchases/export/csv`}
            download
            style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,40,15,0.8)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 10, color: "#8A8278", padding: "10px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "none" }}
          >
            <Download size={14} /> CSV出力
          </a>
          <button
            onClick={() => setShowCsv(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,30,50,0.8)", border: "1px solid rgba(100,170,255,0.3)", borderRadius: 10, color: "#66aaff", padding: "10px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            <Upload size={14} /> CSV取込
          </button>
          <button
            onClick={() => {
              if (isFree && allItemsCount >= FREE_PLAN_LIMIT) { window.location.href = "/pricing"; return; }
              if (!showForm) setForm(makeEmpty());
              setShowForm(!showForm);
            }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: isFree && allItemsCount >= FREE_PLAN_LIMIT ? "rgba(20,18,8,0.7)" : "linear-gradient(135deg,#1e1608,#2a1e08)", border: `1px solid ${isFree && allItemsCount >= FREE_PLAN_LIMIT ? "rgba(255,80,50,0.3)" : "rgba(212,175,55,0.4)"}`, borderRadius: 10, color: isFree && allItemsCount >= FREE_PLAN_LIMIT ? "#ff9977" : "#D4AF37", padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            <Plus size={16} /> {isFree && allItemsCount >= FREE_PLAN_LIMIT ? "上限到達（アップグレード）" : "仕入れ追加"}
          </button>
        </div>
      </div>

      {/* ── フリープラン制限バナー ── */}
      {isFree && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: allItemsCount >= FREE_PLAN_LIMIT ? "rgba(255,80,50,0.08)" : "rgba(255,180,0,0.06)", border: `1px solid ${allItemsCount >= FREE_PLAN_LIMIT ? "rgba(255,80,50,0.3)" : "rgba(255,180,0,0.25)"}`, borderRadius: 10, padding: "12px 18px", marginBottom: 16, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={15} color={allItemsCount >= FREE_PLAN_LIMIT ? "#ff6644" : "#ffcc44"} />
            <span style={{ fontSize: 13, color: allItemsCount >= FREE_PLAN_LIMIT ? "#ff9977" : "#ffcc66", fontWeight: 600 }}>
              {allItemsCount >= FREE_PLAN_LIMIT ? `フリープランの上限（${FREE_PLAN_LIMIT}件）に達しました` : `フリープラン：${allItemsCount} / ${FREE_PLAN_LIMIT} 件使用中`}
            </span>
          </div>
          <Link href="/pricing" style={{ fontSize: 12, color: "#D4AF37", fontWeight: 700, textDecoration: "none", background: "rgba(0,60,20,0.8)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 6, padding: "5px 12px", flexShrink: 0 }}>
            Standardプランへアップグレード →
          </Link>
        </div>
      )}

      {/* ── サマリーカード ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { key: "purchased", label: "仕入済み", icon: <Package size={18} />, color: "#ffcc44", extra: `合計 ¥${byStatus("purchased").reduce((s,i)=>s+i.purchase_price+i.purchase_shipping,0).toLocaleString()}` },
          { key: "listed",    label: "出品中",   icon: <ShoppingCart size={18} />, color: "#66ccff", extra: `${byStatus("listed").length}件` },
          { key: "sold",      label: "売却済み", icon: <CheckCircle size={18} />, color: "#D4AF37", extra: `${byStatus("sold").length}件` },
          { key: "",          label: "総仕入れコスト", icon: <TrendingUp size={18} />, color: "#aa88ff", extra: `¥${Math.round(totalCostAll).toLocaleString()}` },
        ].map(({ key, label, icon, color, extra }) => (
          <button key={key} onClick={() => setFilter(key)} style={{ background: filter === key ? `${color}18` : "rgba(20,20,22,0.9)", border: `1px solid ${filter === key ? color + "55" : "rgba(212,175,55,0.1)"}`, borderRadius: 12, padding: "14px 16px", cursor: key ? "pointer" : "default", textAlign: "left", transition: "all 0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color, marginBottom: 6 }}>{icon}<span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span></div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", fontFamily: "monospace" }}>{key ? byStatus(key).length : ""}<span style={{ fontSize: 11, color: "#8A8278", marginLeft: 2 }}>{key ? "件" : ""}</span></div>
            <div style={{ fontSize: 11, color, marginTop: 2 }}>{extra}</div>
          </button>
        ))}
      </div>

      {/* ── 追加フォーム ── */}
      {showForm && (
        <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#C8C0B0", marginBottom: 16 }}>新規仕入れ登録</div>
          <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>商品名 *</label>
              <input
                ref={f_name} list="pnames" style={inp} value={form.product_name}
                onChange={e => upd("product_name", e.target.value)}
                onKeyDown={e => navKey(e, f_platform as React.RefObject<HTMLElement>)}
                placeholder="例: Nintendo Switch 本体" autoFocus
              />
            </div>
            <div>
              <label style={lbl}>仕入れ元</label>
              <select
                ref={f_platform} style={inp} value={form.platform}
                onChange={e => upd("platform", e.target.value)}
                onKeyDown={e => navKey(e, f_date as React.RefObject<HTMLElement>)}
              >
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>仕入れ日</label>
              <input
                ref={f_date} type="date" style={inp} value={form.purchase_date}
                onChange={e => upd("purchase_date", e.target.value)}
                onKeyDown={e => navKey(e, f_price as React.RefObject<HTMLElement>)}
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>仕入れ価格 (円) *</label>
              <input
                ref={f_price} type="number" style={inp} value={form.purchase_price}
                onChange={e => upd("purchase_price", e.target.value)}
                onKeyDown={e => navKey(e, f_shipping as React.RefObject<HTMLElement>)}
                placeholder="0"
              />
            </div>
            <div>
              <label style={lbl}>仕入れ送料 (円)</label>
              <input
                ref={f_shipping} type="number" style={inp} value={form.purchase_shipping}
                onChange={e => upd("purchase_shipping", e.target.value)}
                onKeyDown={e => navKey(e, f_url as React.RefObject<HTMLElement>)}
                placeholder="0"
              />
            </div>
            <div>
              <label style={lbl}>URL</label>
              <input
                ref={f_url} style={inp} value={form.purchase_url}
                onChange={e => upd("purchase_url", e.target.value)}
                onKeyDown={e => navKey(e, f_notes as React.RefObject<HTMLElement>)}
                placeholder="https://..."
              />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>メモ</label>
            <input
              ref={f_notes} style={inp} value={form.notes}
              onChange={e => upd("notes", e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
              placeholder="状態・注意点など"
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={handleSubmit} disabled={loading} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, color: "#D4AF37", padding: "10px 28px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              {loading ? "保存中..." : "保存する"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8A8278", padding: "10px 16px", cursor: "pointer" }}>
              キャンセル
            </button>
            <span style={{ fontSize: 11, color: "#3A3830", marginLeft: 4 }}>Enter で保存 · Tab で次へ</span>
          </div>
        </div>
      )}

      {/* ── 検索バー ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#8A8278" }} />
          <input style={{ ...inp, paddingLeft: 32 }} placeholder="商品名・仕入れ元で検索..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {(["purchased", "listed", "sold", ""] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${filter === s ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.12)"}`, background: filter === s ? "rgba(212,175,55,0.12)" : "transparent", color: filter === s ? "#D4AF37" : "#8A8278", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
              {s === "" ? "すべて" : STATUS[s as keyof typeof STATUS]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 一括操作バー（選択中のみ表示） ── */}
      {selectedIds.size > 0 && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 500, background: "#0a0a0b", border: "1px solid rgba(212,175,55,0.5)", borderRadius: 14, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.7)", minWidth: 400 }}>
          <span style={{ fontSize: 13, color: "#D4AF37", fontWeight: 700, flexShrink: 0 }}>{selectedIds.size}件選択中</span>
          <div style={{ height: 20, width: 1, background: "rgba(212,175,55,0.2)" }} />
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#F5F0E8", padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
            {Object.entries(STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </select>
          <button onClick={handleBulkStatus} disabled={bulkLoading} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, color: "#D4AF37", padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: bulkLoading ? 0.6 : 1 }}>
            {bulkLoading ? "処理中..." : "一括変更"}
          </button>
          <button onClick={handleBulkDelete} disabled={bulkLoading} style={{ background: "rgba(255,50,50,0.08)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 8, color: "#ff6666", padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, opacity: bulkLoading ? 0.6 : 1 }}>
            <Trash2 size={12} /> 一括削除
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{ background: "transparent", border: "none", color: "#8A8278", cursor: "pointer", padding: "4px", marginLeft: 4 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── 出品リンクモーダル ── */}
      {listingModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 450, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => e.target === e.currentTarget && setListingModal(null)}
        >
          <div style={{ background: "#0a0a0b", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setListingModal(null)} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "#8A8278", cursor: "pointer" }}>
              <X size={18} />
            </button>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#F5F0E8", marginBottom: 4 }}>🏪 出品する</div>
            <div style={{ fontSize: 13, color: "#C8C0B0", marginBottom: 4 }}>{listingModal.product_name}</div>
            <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 20 }}>
              仕入れコスト ¥{listingModal.cost_jpy.toLocaleString()} · 推奨売価 <span style={{ color: "#D4AF37", fontWeight: 700 }}>¥{listingModal.suggested_price_jpy.toLocaleString()}</span>（利益率30%目安）
            </div>

            {(["国内", "海外"] as const).map(cat => {
              const entries = Object.entries(listingModal.links).filter(([, v]) => v.category === cat);
              if (!entries.length) return null;
              return (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#8A8278", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{cat}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {entries.map(([key, link]) => (
                      <a key={key} href={link.url} target="_blank" rel="noreferrer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderRadius: 10, border: link.recommended ? "1px solid rgba(212,175,55,0.4)" : "1px solid rgba(212,175,55,0.1)", background: link.recommended ? "rgba(212,175,55,0.06)" : "rgba(10,10,11,0.6)", textDecoration: "none", cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 18 }}>{link.flag}</span>
                          <div>
                            <div style={{ fontSize: 13, color: "#F5F0E8", fontWeight: 600 }}>
                              {link.label}
                              {link.recommended && <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(212,175,55,0.2)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10, padding: "1px 6px", color: "#D4AF37" }}>おすすめ</span>}
                            </div>
                            <div style={{ fontSize: 11, color: "#8A8278", marginTop: 1 }}>{link.note}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {link.price_display && <span style={{ fontSize: 13, color: "#D4AF37", fontWeight: 700, fontFamily: "monospace" }}>{link.price_display}</span>}
                          <ExternalLink size={13} color="#8A8278" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(212,175,55,0.1)" }}>
              <button
                onClick={() => listingModal && markAsListed(listingModal.purchase_id)}
                style={{ width: "100%", background: "linear-gradient(135deg,#003060,#004080)", border: "1px solid rgba(102,204,255,0.4)", borderRadius: 10, color: "#66ccff", padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                ✅ 出品済みにする（ステータスを「出品中」に変更）
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 削除確認モーダル ── */}
      {deleteConfirm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}
        >
          <div style={{ background: "#0a0a0b", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 16, padding: 28, width: 420 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#F5F0E8", marginBottom: 8 }}>削除の確認</div>
            <div style={{ fontSize: 13, color: "#8A8278", marginBottom: 20, lineHeight: 1.6 }}>
              <span style={{ color: "#F5F0E8", fontWeight: 600 }}>「{deleteConfirm.name}」</span>
              を削除しますか？<br />
              この操作は取り消せません。
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={confirmDelete}
                style={{ flex: 1, background: "rgba(255,50,50,0.12)", border: "1px solid rgba(255,50,50,0.4)", borderRadius: 8, color: "#ff6666", padding: "10px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                削除する
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8A8278", padding: "10px", cursor: "pointer" }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 売却モーダル ── */}
      {quickSell && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => e.target === e.currentTarget && setQuickSell(null)}
        >
          <div style={{ background: "#0a0a0b", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 16, padding: 28, width: 560, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setQuickSell(null)} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "#8A8278", cursor: "pointer" }}>
              <X size={18} />
            </button>

            {/* ── 売却結果表示 ── */}
            {sellResult ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>🎉</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#C8C0B0", marginBottom: 20 }}>売却完了！</div>

                <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 12, padding: "20px 24px", marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 6 }}>この取引の純利益</div>
                  <div style={{ fontSize: 38, fontWeight: 900, color: sellResult.net_profit >= 0 ? "#D4AF37" : "#ff6666", fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                    {sellResult.net_profit >= 0 ? "+" : ""}¥{Math.round(sellResult.net_profit).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: "rgba(68,204,170,0.06)", border: "1px solid rgba(68,204,170,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#8A8278" }}>今月の累計利益</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#44ccaa", fontFamily: "monospace" }}>
                    ¥{Math.round(sellResult.monthly_profit).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {/* リストに戻って別の商品を選ぶ */}
                  <button
                    onClick={() => setQuickSell(null)}
                    style={{ flex: 1, background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 8, color: "#D4AF37", padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    別の商品を売る
                  </button>
                  <button onClick={() => setQuickSell(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8A8278", padding: "10px 16px", cursor: "pointer" }}>
                    閉じる
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#F5F0E8", marginBottom: 4 }}>💰 売却記録</div>
                <div style={{ background: "rgba(10,10,11,0.8)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, border: "1px solid rgba(212,175,55,0.1)" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#F5F0E8" }}>{quickSell.product_name}</div>
                  <div style={{ fontSize: 12, color: "#8A8278", marginTop: 2 }}>仕入れ: {quickSell.platform} · コスト ¥{(quickSell.purchase_price + quickSell.purchase_shipping).toLocaleString()}</div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>売却価格 (円)</label>
                  <input
                    type="number"
                    style={{ ...inp, fontSize: 22, fontFamily: "monospace", textAlign: "center" }}
                    value={sellPrice}
                    onChange={e => handleSellPriceChange(e.target.value, quickSell)}
                    onKeyDown={e => e.key === "Enter" && handleQuickSell()}
                    autoFocus
                    placeholder="0"
                  />
                </div>

                {sortedComparison.length > 0 ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "#8A8278", fontWeight: 700, marginBottom: 8 }}>どこで売ると一番儲かるか</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {sortedComparison.map(([name, data], i) => {
                        const isBest = i === 0 && data.gross_profit > 0;
                        const isSelected = name === sellPlatform;
                        const profit = Math.round(data.gross_profit);
                        return (
                          <button key={name} onClick={() => setSellPlatform(name)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderRadius: 9, border: isSelected ? "1px solid rgba(212,175,55,0.5)" : isBest ? "1px solid rgba(212,175,55,0.2)" : "1px solid rgba(212,175,55,0.07)", background: isSelected ? "rgba(212,175,55,0.08)" : isBest ? "rgba(212,175,55,0.04)" : "rgba(10,10,11,0.5)", cursor: "pointer", width: "100%" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {isSelected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37" }} />}
                              <span style={{ fontSize: 13, color: "#F5F0E8" }}>{data.emoji} {name}</span>
                              {isBest && <span style={{ fontSize: 10, background: "rgba(212,175,55,0.2)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10, padding: "1px 6px", color: "#D4AF37" }}>最高</span>}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: 15, fontWeight: 700, color: profit >= 0 ? "#D4AF37" : "#ff6666", fontFamily: "monospace" }}>
                                {profit >= 0 ? "+" : ""}¥{profit.toLocaleString()}
                              </span>
                              <span style={{ fontSize: 11, color: "#8A8278", marginLeft: 6 }}>({data.profit_rate.toFixed(1)}%)</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", fontSize: 12, color: "#8A8278", marginBottom: 14, padding: "16px 0" }}>
                    売却価格を入力するとプラットフォーム別利益が表示されます
                  </div>
                )}

                {sellPrice && (
                  <div style={{ marginBottom: 14, padding: "8px 12px", background: "rgba(212,175,55,0.06)", borderRadius: 8, border: "1px solid rgba(212,175,55,0.2)", fontSize: 12, color: "#8A8278" }}>
                    選択中: <span style={{ color: "#D4AF37", fontWeight: 700 }}>{sellPlatform}</span>
                    <span style={{ float: "right", fontSize: 10, color: "#3A3830" }}>Enter で記録</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleQuickSell} disabled={loading || !sellPrice} style={{ flex: 1, background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, color: "#D4AF37", padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: 14, opacity: (!sellPrice || loading) ? 0.5 : 1 }}>
                    {loading ? "記録中..." : "売却を記録する"}
                  </button>
                  <button onClick={() => setQuickSell(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8A8278", padding: "12px 16px", cursor: "pointer" }}>
                    キャンセル
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── CSV インポートモーダル ── */}
      {showCsv && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => e.target === e.currentTarget && resetCsvModal()}
        >
          <div style={{ background: "#0a0a0b", border: "1px solid rgba(100,170,255,0.3)", borderRadius: 18, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid rgba(212,175,55,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#F5F0E8" }}>CSV一括取込</div>
                <div style={{ fontSize: 11, color: "#8A8278", marginTop: 2 }}>
                  {csvStep === "upload" && "CSVファイルを選択してください"}
                  {csvStep === "preview" && `プレビュー（先頭${csvRows.length}行）— 問題なければ取込を実行`}
                  {csvStep === "done" && "取込完了"}
                </div>
              </div>
              <button onClick={resetCsvModal} style={{ background: "transparent", border: "none", color: "#8A8278", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {csvStep === "upload" && (
                <>
                  <div
                    style={{ border: "2px dashed rgba(100,170,255,0.3)", borderRadius: 12, padding: "40px 20px", textAlign: "center", cursor: "pointer", marginBottom: 16 }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={28} color="#66aaff" style={{ margin: "0 auto 10px", display: "block" }} />
                    <div style={{ fontSize: 14, color: "#C8C0B0", fontWeight: 600, marginBottom: 6 }}>クリックしてファイルを選択</div>
                    <div style={{ fontSize: 11, color: "#8A8278" }}>.csv（UTF-8 / Shift-JIS 対応・カンマ含む商品名も対応）</div>
                    <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvFileChange} />
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "14px 16px", fontSize: 12 }}>
                    <div style={{ color: "#66aaff", fontWeight: 700, marginBottom: 8 }}>対応カラム名</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, color: "#8A8278" }}>
                      {[
                        ["商品名（必須）",   "商品名 / product_name"],
                        ["仕入れ価格（必須）", "仕入れ価格 / price"],
                        ["仕入れ先",         "仕入れ先 / platform"],
                        ["仕入れ送料",       "仕入れ送料 / shipping"],
                        ["仕入れ日",         "仕入れ日 / date"],
                        ["URL",              "URL / purchase_url"],
                        ["メモ",             "メモ / notes"],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex", gap: 6 }}>
                          <span style={{ color: "#C8C0B0", flexShrink: 0 }}>{k}:</span>
                          <span style={{ fontFamily: "monospace", fontSize: 11 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, color: "#5A5248", fontSize: 11 }}>
                      ※ エクスポートしたCSVをそのまま再インポートできます
                    </div>
                  </div>
                </>
              )}

              {csvStep === "preview" && (
                <>
                  <div style={{ overflowX: "auto", marginBottom: 16 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          {csvCols.map(c => (
                            <th key={c} style={{ textAlign: "left", color: "#66aaff", padding: "6px 10px", borderBottom: "1px solid rgba(100,170,255,0.15)", whiteSpace: "nowrap", fontWeight: 700 }}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvRows.map((row, i) => (
                          <tr key={i}>
                            {csvCols.map(c => (
                              <td key={c} style={{ color: "#C8C0B0", padding: "6px 10px", borderBottom: "1px solid rgba(212,175,55,0.05)", whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                                {row[c] || <span style={{ color: "#3A3830" }}>—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 16 }}>
                    ファイル: <span style={{ color: "#C8C0B0" }}>{csvFile?.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleCsvImport} disabled={csvImporting} style={{ flex: 1, background: "linear-gradient(135deg,#003d5f,#00508a)", border: "1px solid rgba(100,170,255,0.4)", borderRadius: 8, color: "#66aaff", padding: "12px", fontWeight: 700, cursor: csvImporting ? "not-allowed" : "pointer", fontSize: 14, opacity: csvImporting ? 0.7 : 1 }}>
                      {csvImporting ? "取込中..." : "取込を実行する"}
                    </button>
                    <button onClick={() => { setCsvStep("upload"); setCsvFile(null); setCsvRows([]); if (fileInputRef.current) fileInputRef.current.value = ""; }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8A8278", padding: "12px 16px", cursor: "pointer" }}>
                      戻る
                    </button>
                  </div>
                </>
              )}

              {csvStep === "done" && csvResult && (
                <>
                  <div style={{ textAlign: "center", padding: "16px 0 24px" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>{csvResult.imported > 0 ? "✅" : "⚠️"}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#D4AF37", fontFamily: "monospace", marginBottom: 8 }}>
                      {csvResult.imported} 件取込完了
                    </div>
                  </div>

                  {(csvResult.errors.length > 0 || csvResult.parse_errors.length > 0) && (
                    <div style={{ background: "rgba(255,100,0,0.06)", border: "1px solid rgba(255,100,0,0.25)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#ff9944", marginBottom: 8 }}>スキップされた行</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 140, overflowY: "auto" }}>
                        {[...csvResult.parse_errors, ...csvResult.errors].map((e, i) => (
                          <div key={i} style={{ fontSize: 11, color: "#ff9966", fontFamily: "monospace" }}>{e}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={resetCsvModal} style={{ width: "100%", background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8, color: "#D4AF37", padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                    閉じる
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 商品リスト ── */}
      <style>{`
        .purchase-row:nth-child(even) { background: rgba(212,175,55,0.025) !important; }
        .purchase-row:hover { background: rgba(212,175,55,0.07) !important; border-color: rgba(212,175,55,0.3) !important; }
        .purchase-row { transition: background 0.12s, border-color 0.12s; }
        .purchase-row.editing { background: rgba(212,175,55,0.06) !important; border-color: rgba(212,175,55,0.4) !important; }
      `}</style>

      {filtered.length === 0 ? (
        <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 14, textAlign: "center", padding: 60 }}>
          <Package size={36} color="rgba(212,175,55,0.2)" style={{ margin: "0 auto 12px", display: "block" }} />
          <div style={{ color: "#8A8278", fontSize: 14, marginBottom: 16 }}>
            {search || filter ? "該当する商品がありません" : "まだ仕入れがありません"}
          </div>
          {!search && !filter && (
            <button onClick={() => setShowForm(true)} style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 9, color: "#D4AF37", padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              まずはこれから：仕入れを登録する →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 16px", fontSize: 10, color: "#3A3830", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>
            <input
              type="checkbox"
              checked={filtered.length > 0 && selectedIds.size === filtered.length}
              onChange={toggleSelectAll}
              style={{ width: 15, height: 15, flexShrink: 0, accentColor: "#D4AF37", cursor: "pointer" }}
              title="全選択"
            />
            <div style={{ width: 80, flexShrink: 0 }}>ステータス</div>
            <div style={{ flex: 1 }}>商品名</div>
            <div style={{ width: 100, textAlign: "right", flexShrink: 0 }}>コスト</div>
            <div style={{ width: 200, flexShrink: 0 }} />
          </div>

          {filtered.map(item => {
            const st = STATUS[item.status as keyof typeof STATUS] ?? STATUS.purchased;
            const cost = item.purchase_price + item.purchase_shipping;
            const isEditing = editId === item.id;

            return (
              <div
                key={item.id}
                className={`purchase-row${isEditing ? " editing" : ""}`}
                style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 10, padding: isEditing ? "12px 16px 16px" : "11px 16px", display: "flex", flexDirection: isEditing ? "column" : "row", alignItems: isEditing ? "stretch" : "center", gap: 12 }}
              >
                {isEditing ? (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#D4AF37", marginBottom: 4 }}>編集中: {item.product_name}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={lbl}>商品名</label>
                        <input list="pnames" style={inpSm} value={editForm.product_name ?? ""} onChange={e => setEditForm(p => ({ ...p, product_name: e.target.value }))} />
                      </div>
                      <div>
                        <label style={lbl}>仕入れ元</label>
                        <select style={inpSm} value={editForm.platform ?? ""} onChange={e => setEditForm(p => ({ ...p, platform: e.target.value }))}>
                          {PLATFORMS.map(pl => <option key={pl}>{pl}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>仕入れ日</label>
                        <input type="date" style={inpSm} value={editForm.purchase_date ?? ""} onChange={e => setEditForm(p => ({ ...p, purchase_date: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 2fr", gap: 8, marginBottom: 10 }}>
                      <div>
                        <label style={lbl}>仕入れ価格</label>
                        <input type="number" style={inpSm} value={editForm.purchase_price ?? ""} onChange={e => setEditForm(p => ({ ...p, purchase_price: e.target.value }))} />
                      </div>
                      <div>
                        <label style={lbl}>送料</label>
                        <input type="number" style={inpSm} value={editForm.purchase_shipping ?? ""} onChange={e => setEditForm(p => ({ ...p, purchase_shipping: e.target.value }))} />
                      </div>
                      <div>
                        <label style={lbl}>URL</label>
                        <input style={inpSm} value={editForm.purchase_url ?? ""} onChange={e => setEditForm(p => ({ ...p, purchase_url: e.target.value }))} placeholder="https://..." />
                      </div>
                      <div>
                        <label style={lbl}>メモ</label>
                        <input style={inpSm} value={editForm.notes ?? ""} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder="状態・注意点など"
                          onKeyDown={e => { if (e.key === "Enter") saveEdit(item.id); if (e.key === "Escape") cancelEdit(); }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => saveEdit(item.id)} style={{ display: "flex", alignItems: "center", gap: 4, background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 7, color: "#D4AF37", padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        <Save size={12} /> 保存
                      </button>
                      <button onClick={cancelEdit} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#8A8278", padding: "7px 12px", fontSize: 12, cursor: "pointer" }}>
                        Esc / キャンセル
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* チェックボックス */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: 15, height: 15, flexShrink: 0, accentColor: "#D4AF37", cursor: "pointer" }}
                    />
                    {/* ステータス */}
                    <select
                      value={item.status}
                      onChange={e => handleStatusChange(item.id, e.target.value)}
                      style={{ background: st.bg, border: `1px solid ${st.color}44`, borderRadius: 20, color: st.color, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", appearance: "none", flexShrink: 0, width: 80, textAlign: "center" }}
                    >
                      {Object.entries(STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                    </select>

                    {/* 商品名・仕入れ元 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product_name}</div>
                      <div style={{ fontSize: 11, color: "#8A8278", marginTop: 2, display: "flex", gap: 8 }}>
                        <span>{item.platform}</span>
                        <span style={{ opacity: 0.6 }}>·</span>
                        <span>{item.purchase_date}</span>
                        {item.notes && <><span style={{ opacity: 0.6 }}>·</span><span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.notes}</span></>}
                      </div>
                    </div>

                    {/* コスト */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#F5F0E8", fontSize: 15 }}>¥{cost.toLocaleString()}</div>
                      {item.purchase_shipping > 0 && <div style={{ fontSize: 10, color: "#8A8278" }}>+送料¥{item.purchase_shipping.toLocaleString()}</div>}
                    </div>

                    {/* アクション */}
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      {item.status !== "sold" && item.status !== "cancelled" && (
                        <button
                          onClick={() => openListingModal(item)}
                          disabled={listingLoading === item.id}
                          style={{ background: "rgba(0,40,80,0.7)", border: "1px solid rgba(102,170,255,0.35)", borderRadius: 8, color: "#66aaff", cursor: "pointer", padding: "6px 10px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 3, opacity: listingLoading === item.id ? 0.6 : 1 }}
                        >
                          <Store size={12} /> 出品
                        </button>
                      )}
                      {item.status !== "sold" && item.status !== "cancelled" && (
                        <button onClick={() => openSell(item)} style={{ background: "rgba(0,80,30,0.7)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#9A7D25", cursor: "pointer", padding: "6px 10px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                          <DollarSign size={12} /> 売却
                        </button>
                      )}
                      {/* 発送タスク作成（ラベル付き） */}
                      {item.status !== "cancelled" && (
                        <button
                          onClick={() => handleCreateFulfillment(item)}
                          disabled={fulfillmentLoading.has(item.id)}
                          style={{ background: "rgba(68,204,170,0.06)", border: "1px solid rgba(68,204,170,0.2)", borderRadius: 8, color: "#44ccaa", cursor: "pointer", padding: "6px 10px", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, opacity: fulfillmentLoading.has(item.id) ? 0.5 : 1 }}
                        >
                          <Truck size={12} /> 発送
                        </button>
                      )}
                      <button onClick={() => startEdit(item)} title="編集" style={{ background: "transparent", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 8, color: "#8A8278", cursor: "pointer", padding: "6px 8px", display: "flex", alignItems: "center" }}>
                        <Pencil size={12} />
                      </button>
                      {item.purchase_url && (
                        <a href={item.purchase_url} target="_blank" rel="noreferrer" style={{ background: "transparent", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 8, color: "#8A8278", padding: "6px 8px", display: "flex", alignItems: "center" }}>
                          <ExternalLink size={12} />
                        </a>
                      )}
                      <button onClick={() => handleDelete(item.id, item.product_name)} style={{ background: "transparent", border: "1px solid rgba(255,80,80,0.15)", borderRadius: 8, color: "#ff6666", cursor: "pointer", padding: "6px 8px" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
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
    </div>
  );
}
