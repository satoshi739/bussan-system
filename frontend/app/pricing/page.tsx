"use client";

import { useState } from "react";
import { Check, X, Zap, Building2, Gift, ChevronDown, ChevronUp } from "lucide-react";
import { PLANS } from "@/lib/stripe";

const card: React.CSSProperties = {
  background: "rgba(20,20,22,0.9)",
  border: "1px solid rgba(212,175,55,0.15)",
  borderRadius: 18,
  padding: "32px 28px",
  flex: 1,
};

const proCard: React.CSSProperties = {
  ...card,
  border: "1px solid rgba(212,175,55,0.5)",
  background: "rgba(0,30,10,0.95)",
  position: "relative",
};

// ── 機能比較表データ ──────────────────────────────────────
const COMPARISON = [
  { label: "仕入れ管理",           free: "30件まで",    pro: "無制限",   biz: "無制限"  },
  { label: "利益計算（4種）",       free: true,         pro: true,       biz: true      },
  { label: "利益スキャナー",        free: false,        pro: true,       biz: true      },
  { label: "国内外 相場検索",       free: false,        pro: true,       biz: true      },
  { label: "ウォッチリスト",        free: false,        pro: true,       biz: true      },
  { label: "在庫・出品・売上管理",  free: false,        pro: true,       biz: true      },
  { label: "AI アシスタント",       free: false,        pro: true,       biz: true      },
  { label: "高度な分析レポート",    free: false,        pro: false,      biz: true      },
  { label: "CSV エクスポート",      free: false,        pro: false,      biz: true      },
  { label: "優先サポート",          free: false,        pro: false,      biz: true      },
];

// ── FAQ データ ───────────────────────────────────────────
const FAQS = [
  {
    q: "7日間無料トライアルはどのように機能しますか？",
    a: "Standard・Proプランはご登録後7日間、全機能を無料でお使いいただけます。トライアル期間中に解約すれば費用は一切かかりません。8日目以降に自動で課金が始まります。",
  },
  {
    q: "クレジットカードなしで試せますか？",
    a: "現在は無料トライアルの開始にカード登録が必要です。ただしトライアル期間内に解約すれば請求は発生しません。",
  },
  {
    q: "途中でプランを変更できますか？",
    a: "はい、いつでもアップグレード・ダウングレード可能です。変更は翌請求日から適用されます。",
  },
  {
    q: "解約はどうすればできますか？",
    a: "マイページの「請求管理」から即時解約できます。解約後も当月末まで引き続きご利用いただけます。",
  },
  {
    q: "スキャン・検索はリアルタイムで動きますか？",
    a: "はい。スキャン実行時に eBay・メルカリ・Shopee 等から最新の価格情報を取得します。バックエンドはクラウドで稼働しており、初回アクセス時は数秒の起動時間が発生することがあります。",
  },
  {
    q: "フリープランとの違いは何ですか？",
    a: "フリープランは利益計算と仕入れ管理（30件）のみ使えます。利益スキャナーや相場検索などコア機能はStandard以上が必要です。まずフリーで使い勝手を確認してからアップグレードする方法もおすすめです。",
  },
];

function CellVal({ val }: { val: boolean | string }) {
  if (val === true)  return <span style={{ color: "#22c55e", fontSize: 18, fontWeight: 700 }}>✓</span>;
  if (val === false) return <span style={{ color: "#3a5a4a", fontSize: 16 }}>—</span>;
  return <span style={{ color: "#D4AF37", fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>{val}</span>;
}

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubscribe = (paymentLink: string | null, planKey: string) => {
    if (!paymentLink) return;
    setLoading(planKey);
    window.location.href = paymentLink;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0b", padding: "60px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 13, color: "#D4AF37", fontFamily: "monospace", fontWeight: 700, marginBottom: 12, letterSpacing: 2 }}>
            PRICING
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: "#F5F0E8", marginBottom: 14 }}>
            シンプルな料金プラン
          </h1>
          <p style={{ fontSize: 15, color: "#8A8278", maxWidth: 480, margin: "0 auto 20px" }}>
            物販ビジネスの規模に合わせて選べる3つのプラン。<br />
            いつでもアップグレード・ダウングレード可能。
          </p>
          <div style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
            {[
              { icon: "🔍", text: "利益商品を自動スキャン" },
              { icon: "📊", text: "国内外の相場を瞬時に比較" },
              { icon: "🤖", text: "AI仕入れ判断" },
              { icon: "🎁", text: "7日間無料トライアル" },
            ].map(({ icon, text }) => (
              <span key={text} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 20, padding: "6px 14px", fontSize: 12, color: "#D4CCBC", fontWeight: 600 }}>
                {icon} {text}
              </span>
            ))}
          </div>
        </div>

        {/* ── 社会的証明バー ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 48 }}>
          {[
            { num: "¥9,800〜", label: "月額", sub: "1日あたり約¥326" },
            { num: "7日間",     label: "無料トライアル",  sub: "カード登録後すぐ開始"  },
            { num: "即時",      label: "解約可能",      sub: "縛り・違約金なし"   },
          ].map(({ num, label, sub }) => (
            <div key={label} style={{ background: "rgba(20,20,22,0.7)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 12, padding: "18px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#D4AF37", fontFamily: "monospace" }}>{num}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F5F0E8", margin: "4px 0 2px" }}>{label}</div>
              <div style={{ fontSize: 11, color: "#8A8278" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Plans ── */}
        <div style={{ display: "flex", gap: 20, alignItems: "stretch", marginBottom: 48 }}>
          {/* Free */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 10, padding: 8 }}>
                <Gift size={18} color="#8A8278" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#F5F0E8" }}>{PLANS.FREE.name}</span>
            </div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#F5F0E8", fontFamily: "monospace" }}>¥0</span>
              <span style={{ fontSize: 14, color: "#8A8278", marginLeft: 6 }}>/月</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {PLANS.FREE.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#a8d8b8" }}>
                  <Check size={14} color="#8A8278" />
                  {f}
                </div>
              ))}
            </div>
            <a
              href="/login"
              style={{ display: "block", textAlign: "center", background: "transparent", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 10, color: "#8A8278", padding: "12px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}
            >
              無料で始める
            </a>
          </div>

          {/* Standard (PLANS.PRO) */}
          <div style={proCard}>
            <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.5)", borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 800, color: "#D4AF37", whiteSpace: "nowrap" }}>
              おすすめ
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10, padding: 8 }}>
                <Zap size={18} color="#D4AF37" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#F5F0E8" }}>{PLANS.PRO.name}</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#D4AF37", fontFamily: "monospace" }}>¥{PLANS.PRO.price.toLocaleString()}</span>
              <span style={{ fontSize: 14, color: "#8A8278", marginLeft: 6 }}>/月</span>
            </div>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: "#22c55e", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>
                🎁 7日間無料トライアル
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {PLANS.PRO.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#a8d8b8" }}>
                  <Check size={14} color="#D4AF37" />
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => handleSubscribe(PLANS.PRO.priceId, "PRO")}
              disabled={loading === "PRO"}
              style={{ width: "100%", background: loading === "PRO" ? "rgba(0,50,20,0.5)" : "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.5)", borderRadius: 10, color: "#D4AF37", padding: "13px", fontSize: 14, fontWeight: 800, cursor: loading === "PRO" ? "not-allowed" : "pointer" }}
            >
              {loading === "PRO" ? "処理中..." : "Standardプランを始める"}
            </button>
          </div>

          {/* Pro (PLANS.BUSINESS) */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ background: "rgba(100,180,255,0.07)", border: "1px solid rgba(100,180,255,0.2)", borderRadius: 10, padding: 8 }}>
                <Building2 size={18} color="#66aaff" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#F5F0E8" }}>{PLANS.BUSINESS.name}</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#66aaff", fontFamily: "monospace" }}>¥{PLANS.BUSINESS.price.toLocaleString()}</span>
              <span style={{ fontSize: 14, color: "#8A8278", marginLeft: 6 }}>/月</span>
            </div>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: "#22c55e", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>
                🎁 7日間無料トライアル
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {PLANS.BUSINESS.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#a8d8b8" }}>
                  <Check size={14} color="#66aaff" />
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => handleSubscribe(PLANS.BUSINESS.priceId, "BUSINESS")}
              disabled={loading === "BUSINESS"}
              style={{ width: "100%", background: "transparent", border: "1px solid rgba(100,180,255,0.35)", borderRadius: 10, color: "#66aaff", padding: "13px", fontSize: 14, fontWeight: 700, cursor: loading === "BUSINESS" ? "not-allowed" : "pointer" }}
            >
              {loading === "BUSINESS" ? "処理中..." : "Proプランを始める"}
            </button>
          </div>
        </div>

        {/* ── 機能比較表 ── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: "#D4AF37", fontFamily: "monospace", fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>COMPARISON</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", margin: 0 }}>プラン機能比較</h2>
          </div>
          <div style={{ background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, overflow: "hidden" }}>
            {/* ヘッダー行 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(212,175,55,0.12)" }}>
              <div style={{ padding: "14px 20px", fontSize: 12, color: "#8A8278", fontWeight: 700 }}>機能</div>
              {[
                { name: "フリー",    color: "#8A8278" },
                { name: "Standard", color: "#D4AF37" },
                { name: "Pro",      color: "#66aaff" },
              ].map(({ name, color }) => (
                <div key={name} style={{ padding: "14px 20px", textAlign: "center", fontSize: 13, color, fontWeight: 800 }}>{name}</div>
              ))}
            </div>
            {/* データ行 */}
            {COMPARISON.map((row, i) => (
              <div
                key={row.label}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: i < COMPARISON.length - 1 ? "1px solid rgba(212,175,55,0.06)" : "none" }}
              >
                <div style={{ padding: "13px 20px", fontSize: 13, color: "#C8C0B0" }}>{row.label}</div>
                <div style={{ padding: "13px 20px", textAlign: "center" }}><CellVal val={row.free} /></div>
                <div style={{ padding: "13px 20px", textAlign: "center", background: "rgba(212,175,55,0.03)" }}><CellVal val={row.pro} /></div>
                <div style={{ padding: "13px 20px", textAlign: "center" }}><CellVal val={row.biz} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 信頼表示 ── */}
        <div style={{ marginBottom: 48, background: "rgba(20,20,22,0.7)", border: "1px solid rgba(212,175,55,0.1)", borderRadius: 14, padding: "20px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {[
              ["🏢", "運営", "ユニバーサルプラネットジャパン株式会社"],
              ["🔒", "決済", "Stripe（PCI DSS準拠の安全な決済）"],
              ["🛡️", "カード情報", "当社サーバーでは保持しません"],
              ["✅", "解約", "マイページからいつでも即時解約OK"],
            ].map(([icon, label, desc]) => (
              <div key={label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: "#8A8278", fontWeight: 700, marginBottom: 1 }}>{label}</div>
                  <div style={{ fontSize: 12, color: "#c0b8a8" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: "#D4AF37", fontFamily: "monospace", fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FAQ</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", margin: 0 }}>よくある質問</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FAQS.map((faq, i) => (
              <div
                key={i}
                style={{ background: "rgba(20,20,22,0.9)", border: `1px solid ${openFaq === i ? "rgba(212,175,55,0.35)" : "rgba(212,175,55,0.12)"}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.15s" }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 12 }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8", lineHeight: 1.5 }}>{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp size={16} color="#D4AF37" style={{ flexShrink: 0 }} />
                    : <ChevronDown size={16} color="#8A8278" style={{ flexShrink: 0 }} />
                  }
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 20px 16px", fontSize: 13, color: "#A09488", lineHeight: 1.8 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 最終CTA ── */}
        <div style={{ textAlign: "center", padding: "40px 24px", background: "rgba(0,30,10,0.6)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", marginBottom: 8 }}>
            まずは7日間、無料で試してみませんか？
          </div>
          <div style={{ fontSize: 14, color: "#8A8278", marginBottom: 24 }}>
            クレジットカード登録後すぐ開始。期間中に解約すれば費用0円。
          </div>
          <button
            onClick={() => handleSubscribe(PLANS.PRO.priceId, "CTA")}
            disabled={loading === "CTA"}
            style={{ background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "2px solid rgba(212,175,55,0.6)", borderRadius: 12, color: "#D4AF37", padding: "16px 40px", fontSize: 16, fontWeight: 900, cursor: "pointer", letterSpacing: "0.02em" }}
          >
            {loading === "CTA" ? "処理中..." : "Standardプランを7日間無料で試す →"}
          </button>
        </div>

      </div>
    </div>
  );
}
