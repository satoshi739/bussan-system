"use client";

import { useEffect, useState } from "react";
import { getSales, type Sale } from "@/lib/api";
import { TrendingUp, TrendingDown, BarChart2, Download } from "lucide-react";

const card: React.CSSProperties = { background: "rgba(0,14,5,0.9)", border: "1px solid rgba(0,255,80,0.15)", borderRadius: 14, padding: "20px 24px" };

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => { getSales().then(setSales).catch(console.error); }, []);

  const totalProfit = sales.reduce((s, r) => s + r.net_profit, 0);
  const avgProfit = sales.length > 0 ? totalProfit / sales.length : 0;
  const bestSale = sales.length > 0 ? sales.reduce((a, b) => a.net_profit > b.net_profit ? a : b) : null;
  const winRate = sales.length > 0 ? (sales.filter(s => s.net_profit > 0).length / sales.length * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#e8f5eb" }}>売上履歴</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 12, color: "#8ab89a" }}>{sales.length}件の取引</div>
          <a href="http://localhost:8000/api/sales/export/csv" download style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,40,15,0.8)", border: "1px solid rgba(0,255,80,0.25)", borderRadius: 10, color: "#8ab89a", padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "none" }}>
            <Download size={14} /> CSV
          </a>
        </div>
      </div>

      {/* サマリーカード */}
      {sales.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
          <div style={card}>
            <div style={{ fontSize: 11, color: "#8ab89a", marginBottom: 4 }}>純利益合計</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: totalProfit >= 0 ? "#00ff80" : "#ff6666", fontFamily: "monospace" }}>
              ¥{Math.round(totalProfit).toLocaleString()}
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 11, color: "#8ab89a", marginBottom: 4 }}>平均利益/件</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#66ccff", fontFamily: "monospace" }}>
              ¥{Math.round(avgProfit).toLocaleString()}
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 11, color: "#8ab89a", marginBottom: 4 }}>最高利益</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#4ddc80", fontFamily: "monospace" }}>
              ¥{bestSale ? Math.round(bestSale.net_profit).toLocaleString() : 0}
            </div>
            {bestSale && <div style={{ fontSize: 10, color: "#4a8a5a", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bestSale.product_name}</div>}
          </div>
          <div style={card}>
            <div style={{ fontSize: 11, color: "#8ab89a", marginBottom: 4 }}>勝率（利益あり）</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: winRate >= 70 ? "#00ff80" : winRate >= 50 ? "#ffcc44" : "#ff6666", fontFamily: "monospace" }}>
              {winRate.toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      {/* 取引一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sales.length === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: 60 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ background: "rgba(0,255,80,0.06)", border: "1px solid rgba(0,255,80,0.12)", borderRadius: 16, padding: 18 }}>
                <BarChart2 size={32} color="#4a8a5a" />
              </div>
            </div>
            <div style={{ color: "#4a8a5a", fontSize: 14 }}>まだ売上データがありません</div>
            <div style={{ color: "#3a5a4a", fontSize: 12, marginTop: 6 }}>仕入れ管理ページから売却を記録してください</div>
          </div>
        ) : (
          sales.map(sale => {
            const profitRate = sale.sale_price > 0 ? (sale.net_profit / sale.sale_price * 100) : 0;
            const isProfit = sale.net_profit >= 0;
            return (
              <div key={sale.id} style={{ ...card, padding: "14px 18px", borderColor: isProfit ? "rgba(0,255,80,0.12)" : "rgba(255,80,80,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* アイコン */}
                  <div style={{ flexShrink: 0, background: isProfit ? "rgba(0,255,80,0.08)" : "rgba(255,80,80,0.08)", border: `1px solid ${isProfit ? "rgba(0,255,80,0.2)" : "rgba(255,80,80,0.2)"}`, borderRadius: 8, padding: 8 }}>
                    {isProfit ? <TrendingUp size={16} color="#00ff80" /> : <TrendingDown size={16} color="#ff6666" />}
                  </div>

                  {/* 商品情報 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#e8f5eb", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sale.product_name}</div>
                    <div style={{ fontSize: 11, color: "#4a8a5a", marginTop: 2 }}>
                      {sale.buy_platform} → {sale.selling_platform} · {sale.sale_date}
                    </div>
                  </div>

                  {/* 価格情報 */}
                  <div style={{ display: "flex", gap: 20, alignItems: "center", flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#4a8a5a", marginBottom: 1 }}>売却価格</div>
                      <div style={{ fontFamily: "monospace", color: "#66ccff", fontSize: 13 }}>¥{sale.sale_price.toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#4a8a5a", marginBottom: 1 }}>手数料</div>
                      <div style={{ fontFamily: "monospace", color: "#ff9966", fontSize: 13 }}>¥{Math.round(sale.amazon_fees).toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 90 }}>
                      <div style={{ fontSize: 10, color: "#4a8a5a", marginBottom: 1 }}>純利益</div>
                      <div style={{ fontFamily: "monospace", fontWeight: 900, color: isProfit ? "#00ff80" : "#ff6666", fontSize: 16 }}>
                        {isProfit ? "+" : ""}¥{Math.round(sale.net_profit).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: "center", background: isProfit ? "rgba(0,255,80,0.08)" : "rgba(255,80,80,0.08)", border: `1px solid ${isProfit ? "rgba(0,255,80,0.2)" : "rgba(255,80,80,0.2)"}`, borderRadius: 8, padding: "4px 10px", minWidth: 56 }}>
                      <div style={{ fontSize: 10, color: "#4a8a5a", marginBottom: 1 }}>利益率</div>
                      <div style={{ fontFamily: "monospace", fontWeight: 700, color: isProfit ? "#4ddc80" : "#ff9966", fontSize: 13 }}>
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
    </div>
  );
}
