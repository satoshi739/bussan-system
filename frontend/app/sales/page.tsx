"use client";

import { useEffect, useState, useMemo } from "react";
import { getSales, type Sale } from "@/lib/api";
import { TrendingUp, TrendingDown, BarChart2, Download, Search, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const C = {
  bg1:    "rgba(20,20,22,0.9)",
  bd:     "rgba(212,175,55,0.15)",
  gold:   "#D4AF37",
  goldDm: "#9A7D25",
  t1:     "#F5F0E8",
  t2:     "#C8C0B0",
  t3:     "#8A8278",
  up:     "#D4AF37",
  dn:     "#ff6666",
  blue:   "#66ccff",
  warn:   "#ff9966",
};

const card: React.CSSProperties = { background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 14, padding: "20px 24px" };
const inp: React.CSSProperties = { background: "rgba(10,10,11,0.95)", border: `1px solid rgba(212,175,55,0.3)`, borderRadius: 8, color: C.t1, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" };

function Sk({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return <div style={{ width: w, height: h, borderRadius: 6, background: "rgba(212,175,55,0.07)", animation: "sk 1.6s ease-in-out infinite" }} />;
}

type SortKey = "date_desc" | "date_asc" | "profit_desc" | "profit_asc" | "rate_desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "date_desc",   label: "日付 新しい順" },
  { key: "date_asc",    label: "日付 古い順" },
  { key: "profit_desc", label: "利益 高い順" },
  { key: "profit_asc",  label: "利益 低い順" },
  { key: "rate_desc",   label: "利益率 高い順" },
];

export default function SalesPage() {
  const [sales, setSales]     = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [search, setSearch]   = useState("");
  const [platform, setPlatform] = useState("");
  const [month, setMonth]     = useState("");
  const [sort, setSort]       = useState<SortKey>("date_desc");
  const [showSort, setShowSort] = useState(false);

  useEffect(() => {
    getSales()
      .then(setSales)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // プラットフォーム一覧
  const platforms = useMemo(() => {
    const s = new Set(sales.map(s => s.selling_platform).filter(Boolean));
    return Array.from(s).sort();
  }, [sales]);

  // 月一覧
  const months = useMemo(() => {
    const s = new Set(sales.map(s => s.sale_date?.slice(0, 7)).filter(Boolean));
    return Array.from(s).sort().reverse();
  }, [sales]);

  // フィルタ＋ソート
  const filtered = useMemo(() => {
    let list = sales.filter(s => {
      if (search && !s.product_name.toLowerCase().includes(search.toLowerCase()) &&
          !s.selling_platform?.toLowerCase().includes(search.toLowerCase())) return false;
      if (platform && s.selling_platform !== platform) return false;
      if (month && !s.sale_date?.startsWith(month)) return false;
      return true;
    });
    switch (sort) {
      case "date_desc":   list = [...list].sort((a, b) => (b.sale_date ?? "").localeCompare(a.sale_date ?? "")); break;
      case "date_asc":    list = [...list].sort((a, b) => (a.sale_date ?? "").localeCompare(b.sale_date ?? "")); break;
      case "profit_desc": list = [...list].sort((a, b) => b.net_profit - a.net_profit); break;
      case "profit_asc":  list = [...list].sort((a, b) => a.net_profit - b.net_profit); break;
      case "rate_desc":   list = [...list].sort((a, b) => (b.sale_price > 0 ? b.net_profit / b.sale_price : 0) - (a.sale_price > 0 ? a.net_profit / a.sale_price : 0)); break;
    }
    return list;
  }, [sales, search, platform, month, sort]);

  // KPI（フィルタ後）
  const totalProfit = filtered.reduce((s, r) => s + r.net_profit, 0);
  const avgProfit   = filtered.length > 0 ? totalProfit / filtered.length : 0;
  const bestSale    = filtered.length > 0 ? filtered.reduce((a, b) => a.net_profit > b.net_profit ? a : b) : null;
  const winRate     = filtered.length > 0 ? (filtered.filter(s => s.net_profit > 0).length / filtered.length * 100) : 0;

  const hasFilter = search || platform || month;
  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sort)?.label ?? "";

  return (
    <div>
      <style>{`
        @keyframes sk { 0%,100%{opacity:.9} 50%{opacity:.4} }
        .sale-row:hover { background: rgba(212,175,55,0.05) !important; }
        .sale-row { transition: background 0.12s; }
        .sort-opt:hover { background: rgba(212,175,55,0.08) !important; }
        .ptab:hover { border-color: rgba(212,175,55,0.35) !important; color: #C8C0B0 !important; }
      `}</style>

      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.t1, margin: 0 }}>売上履歴</h1>
          <div style={{ fontSize: 12, color: C.t3, marginTop: 3 }}>
            {hasFilter
              ? <span>{filtered.length}件表示 <span style={{ color: C.t3 }}>/ 全{sales.length}件</span></span>
              : <span>{sales.length}件の取引</span>
            }
          </div>
        </div>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/sales/export/csv`}
          download
          style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,40,15,0.8)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 10, color: C.t3, padding: "8px 14px", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
        >
          <Download size={14} /> CSV
        </a>
      </div>

      {/* サマリーカード */}
      {!loading && sales.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
          {[
            { label: "純利益合計", value: `¥${Math.round(totalProfit).toLocaleString()}`, color: totalProfit >= 0 ? C.up : C.dn },
            { label: "平均利益/件", value: `¥${Math.round(avgProfit).toLocaleString()}`, color: C.blue },
            { label: "最高利益",   value: `¥${bestSale ? Math.round(bestSale.net_profit).toLocaleString() : 0}`, color: C.goldDm, sub: bestSale?.product_name },
            { label: "勝率",       value: `${winRate.toFixed(0)}%`, color: winRate >= 70 ? C.up : winRate >= 50 ? "#ffcc44" : C.dn },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={card}>
              <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color, fontFamily: "monospace" }}>{value}</div>
              {sub && <div style={{ fontSize: 10, color: C.t3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* フィルタバー */}
      {!loading && sales.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
          {/* 検索 */}
          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.t3, pointerEvents: "none" }} />
            <input
              style={{ ...inp, width: "100%", paddingLeft: 30 }}
              placeholder="商品名・プラットフォームで検索..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.t3, cursor: "pointer", padding: 2 }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* プラットフォームタブ */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["", ...platforms].map(p => (
              <button
                key={p || "all"}
                className="ptab"
                onClick={() => setPlatform(p)}
                style={{ padding: "7px 13px", borderRadius: 20, border: `1px solid ${platform === p ? "rgba(212,175,55,0.5)" : "rgba(212,175,55,0.12)"}`, background: platform === p ? "rgba(212,175,55,0.12)" : "transparent", color: platform === p ? C.gold : C.t3, fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.12s" }}
              >
                {p || "すべて"}
              </button>
            ))}
          </div>

          {/* 月フィルタ */}
          {months.length > 1 && (
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              style={{ ...inp, width: "auto", fontSize: 12, paddingRight: 28, cursor: "pointer" }}
            >
              <option value="">全期間</option>
              {months.map(m => (
                <option key={m} value={m}>{m?.replace("-", "年").replace(/(\d+)$/, "$1月")}</option>
              ))}
            </select>
          )}

          {/* ソート */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowSort(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 5, ...inp, width: "auto", cursor: "pointer", paddingRight: 12, fontSize: 12, color: C.t3, whiteSpace: "nowrap" }}
            >
              <ArrowUpDown size={12} /> {currentSortLabel}
            </button>
            {showSort && (
              <div
                style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#141414", border: `1px solid rgba(212,175,55,0.2)`, borderRadius: 10, overflow: "hidden", zIndex: 50, minWidth: 160, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
                onMouseLeave={() => setShowSort(false)}
              >
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.key}
                    className="sort-opt"
                    onClick={() => { setSort(o.key); setShowSort(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: sort === o.key ? "rgba(212,175,55,0.1)" : "transparent", border: "none", color: sort === o.key ? C.gold : C.t2, fontSize: 12, cursor: "pointer", textAlign: "left", fontWeight: sort === o.key ? 700 : 400, transition: "background 0.1s" }}
                  >
                    {sort === o.key
                      ? <ArrowUp size={11} color={C.gold} />
                      : <ArrowDown size={11} color={C.t3} />
                    }
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* フィルタリセット */}
          {hasFilter && (
            <button
              onClick={() => { setSearch(""); setPlatform(""); setMonth(""); }}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid rgba(255,100,100,0.2)`, borderRadius: 8, color: "#ff9988", padding: "7px 12px", fontSize: 12, cursor: "pointer" }}
            >
              <X size={11} /> リセット
            </button>
          )}
        </div>
      )}

      {/* 取引一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {loading ? (
          [1,2,3,4].map(i => (
            <div key={i} style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <Sk w={36} h={36} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}><Sk w="55%" h={14} /><Sk w="38%" h={11} /></div>
              <Sk w={80} h={20} />
            </div>
          ))
        ) : error ? (
          <div style={{ ...card, textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ color: "#ff9966", fontWeight: 700, marginBottom: 8 }}>サーバーに接続できませんでした</div>
            <div style={{ color: C.t3, fontSize: 13, lineHeight: 1.8 }}>
              バックエンドが起動中の可能性があります。<br />しばらくしてから再読み込みしてください。
            </div>
            <button onClick={() => window.location.reload()} style={{ marginTop: 16, background: "transparent", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: C.gold, padding: "8px 20px", fontSize: 13, cursor: "pointer" }}>
              再読み込み
            </button>
          </div>
        ) : sales.length === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: 60 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 16, padding: 18 }}>
                <BarChart2 size={32} color={C.t3} />
              </div>
            </div>
            <div style={{ color: C.t3, fontSize: 14, marginBottom: 12 }}>まだ売上データがありません</div>
            <div style={{ color: "#3a5a4a", fontSize: 12, marginBottom: 16 }}>仕入れ管理ページから売却を記録してください</div>
            <a href="/purchases" style={{ display: "inline-block", background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 9, color: C.gold, padding: "10px 22px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              まずはこれから：仕入れを登録する →
            </a>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: 40 }}>
            <div style={{ color: C.t3, fontSize: 13, marginBottom: 10 }}>条件に一致する取引がありません</div>
            <button onClick={() => { setSearch(""); setPlatform(""); setMonth(""); }} style={{ background: "none", border: `1px solid rgba(212,175,55,0.2)`, borderRadius: 8, color: C.gold, padding: "7px 16px", fontSize: 12, cursor: "pointer" }}>
              フィルタをリセット
            </button>
          </div>
        ) : (
          filtered.map(sale => {
            const profitRate = sale.sale_price > 0 ? (sale.net_profit / sale.sale_price * 100) : 0;
            const isProfit = sale.net_profit >= 0;
            return (
              <div key={sale.id} className="sale-row" style={{ ...card, padding: "13px 18px", borderColor: isProfit ? "rgba(212,175,55,0.12)" : "rgba(255,80,80,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flexShrink: 0, background: isProfit ? "rgba(212,175,55,0.08)" : "rgba(255,80,80,0.08)", border: `1px solid ${isProfit ? "rgba(212,175,55,0.2)" : "rgba(255,80,80,0.2)"}`, borderRadius: 8, padding: 8 }}>
                    {isProfit ? <TrendingUp size={16} color={C.gold} /> : <TrendingDown size={16} color={C.dn} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: C.t1, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sale.product_name}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
                      {sale.buy_platform} → {sale.selling_platform} · {sale.sale_date}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 20, alignItems: "center", flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: C.t3, marginBottom: 1 }}>売却価格</div>
                      <div style={{ fontFamily: "monospace", color: C.blue, fontSize: 13 }}>¥{sale.sale_price.toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: C.t3, marginBottom: 1 }}>手数料</div>
                      <div style={{ fontFamily: "monospace", color: C.warn, fontSize: 13 }}>¥{Math.round(sale.amazon_fees).toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 90 }}>
                      <div style={{ fontSize: 10, color: C.t3, marginBottom: 1 }}>純利益</div>
                      <div style={{ fontFamily: "monospace", fontWeight: 900, color: isProfit ? C.up : C.dn, fontSize: 16 }}>
                        {isProfit ? "+" : ""}¥{Math.round(sale.net_profit).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: "center", background: isProfit ? "rgba(212,175,55,0.08)" : "rgba(255,80,80,0.08)", border: `1px solid ${isProfit ? "rgba(212,175,55,0.2)" : "rgba(255,80,80,0.2)"}`, borderRadius: 8, padding: "4px 10px", minWidth: 56 }}>
                      <div style={{ fontSize: 10, color: C.t3, marginBottom: 1 }}>利益率</div>
                      <div style={{ fontFamily: "monospace", fontWeight: 700, color: isProfit ? C.goldDm : "#ff9966", fontSize: 13 }}>
                        {profitRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {filtered.length > 0 && sales.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: "#3A3830", textAlign: "right" }}>
          {hasFilter ? `${filtered.length}件表示 / 全${sales.length}件` : `全${sales.length}件`}
        </div>
      )}
    </div>
  );
}
