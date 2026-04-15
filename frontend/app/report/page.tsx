"use client";

import RequirePlan from "@/components/RequirePlan";
import { useEffect, useState } from "react";
import { getAnalyticsByPlatform, getAnalyticsByBuyPlatform, getBestProducts } from "@/lib/api";

const card: React.CSSProperties = { background: "rgba(0,14,5,0.9)", border: "1px solid rgba(0,255,80,0.15)", borderRadius: 14, padding: "20px 24px" };

type BestProduct = { product_name: string; buy_platform: string; selling_platform: string; purchase_price: number; sale_price: number; net_profit: number; sale_date: string; profit_rate: number };

function ReportPageContent() {
  const [byPlatform, setByPlatform] = useState<{ selling_platform: string; count: number; total_profit: number; avg_profit: number; avg_rate: number }[]>([]);
  const [byBuy, setByBuy] = useState<{ platform: string; count: number; total_profit: number; avg_profit: number }[]>([]);
  const [bestProducts, setBestProducts] = useState<BestProduct[]>([]);

  useEffect(() => {
    getAnalyticsByPlatform().then(setByPlatform).catch(console.error);
    getAnalyticsByBuyPlatform().then(setByBuy).catch(console.error);
    getBestProducts(10).then(setBestProducts).catch(console.error);
  }, []);

  const maxProfit = Math.max(...byPlatform.map(r => r.total_profit), 1);
  const maxBuy = Math.max(...byBuy.map(r => r.total_profit), 1);
  const noData = byPlatform.length === 0 && byBuy.length === 0 && bestProducts.length === 0;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#e8f5eb", marginBottom: 6 }}>レポート</h1>
      <div style={{ fontSize: 12, color: "#4a8a5a", marginBottom: 24 }}>どこで売って・どこから仕入れると一番儲かるか分析します</div>

      {noData ? (
        <div style={{ ...card, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ color: "#4a8a5a" }}>売上データが溜まると<br />ここに分析が表示されます</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* ベスト商品ランキング */}
          {bestProducts.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#b8dcc4", marginBottom: 4 }}>🏆 ベスト商品ランキング（利益額順）</div>
              <div style={{ fontSize: 12, color: "#4a8a5a", marginBottom: 16 }}>また仕入れるべき商品がわかります</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {bestProducts.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: i === 0 ? "rgba(0,255,80,0.06)" : "transparent", borderRadius: 10, border: i === 0 ? "1px solid rgba(0,255,80,0.2)" : "1px solid transparent" }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: i === 0 ? "#00ff80" : i === 1 ? "#aaa" : i === 2 ? "#cc8844" : "#4a8a5a", width: 24, textAlign: "center", flexShrink: 0 }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#e8f5eb", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.product_name}</div>
                      <div style={{ fontSize: 11, color: "#4a8a5a" }}>{p.buy_platform} → {p.selling_platform} · {p.sale_date}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "monospace", fontWeight: 800, color: "#00ff80", fontSize: 15 }}>+¥{Math.round(p.net_profit).toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: "#4ddc80" }}>利益率 {p.profit_rate?.toFixed(1) ?? "-"}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* 販売先別 */}
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#b8dcc4", marginBottom: 16 }}>📤 販売プラットフォーム別利益</div>
              {byPlatform.length === 0 ? (
                <div style={{ color: "#4a8a5a", textAlign: "center", padding: 40 }}>データなし</div>
              ) : byPlatform.map(row => (
                <div key={row.selling_platform} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#e8f5eb", fontWeight: 600 }}>{row.selling_platform}</span>
                    <span style={{ fontSize: 13, color: "#00ff80", fontFamily: "monospace", fontWeight: 700 }}>¥{Math.round(row.total_profit).toLocaleString()}</span>
                  </div>
                  <div style={{ background: "rgba(0,255,80,0.06)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(row.total_profit / maxProfit) * 100}%`, background: "linear-gradient(90deg,#004d1f,#00ff80)", borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 11, color: "#4a8a5a" }}>
                    <span>{row.count}件</span>
                    <span>平均利益 ¥{Math.round(row.avg_profit).toLocaleString()}</span>
                    <span>平均利益率 {row.avg_rate?.toFixed(1) ?? "-"}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 仕入れ元別 */}
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#b8dcc4", marginBottom: 16 }}>📥 仕入れ元別利益</div>
              {byBuy.length === 0 ? (
                <div style={{ color: "#4a8a5a", textAlign: "center", padding: 40 }}>データなし</div>
              ) : byBuy.map(row => (
                <div key={row.platform} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#e8f5eb", fontWeight: 600 }}>{row.platform}</span>
                    <span style={{ fontSize: 13, color: "#66ccff", fontFamily: "monospace", fontWeight: 700 }}>¥{Math.round(row.total_profit).toLocaleString()}</span>
                  </div>
                  <div style={{ background: "rgba(100,200,255,0.06)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(row.total_profit / maxBuy) * 100}%`, background: "linear-gradient(90deg,#003050,#66ccff)", borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 11, color: "#4a8a5a" }}>
                    <span>{row.count}件</span>
                    <span>平均利益 ¥{Math.round(row.avg_profit).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  return (
    <RequirePlan requiredPlan="PRO" featureName="レポート・分析">
      <ReportPageContent />
    </RequirePlan>
  );
}
