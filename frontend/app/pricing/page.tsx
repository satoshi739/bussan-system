"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, Zap, Building2, Gift, ChevronDown, ChevronUp, Star } from "lucide-react";
import { PLANS } from "@/lib/stripe";
import { toast } from "@/components/Toast";
import { usePlan } from "@/lib/usePlan";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

const P = {
  bg0:    "#07101f",
  bg1:    "#0a1530",
  bg2:    "#111e44",
  gold:   "#c9a96b",
  goldLt: "#e6c87a",
  goldDm: "#8a6d35",
  azure:  "#4a7fc1",
  t1:     "#f5f1e8",
  t2:     "#e5d9bc",
  t3:     "#8a9ab8",
  t4:     "#4d6080",
  up:     "#4ade80",
  bd:     "rgba(201,169,107,0.15)",
  bdSt:   "rgba(201,169,107,0.45)",
  lite:   "#7eb0e8",
};

// ── 機能比較表データ（5列: 機能 / Free / Lite / Standard / Pro）──
const COMPARISON = [
  { label: "月間スキャン数",          free: "10回",      lite: "100回",     standard: "500回",    pro: "無制限"   },
  { label: "赤字判定（買い／注意／見送り）", free: false,    lite: true,        standard: true,       pro: true       },
  { label: "AIアドバイス",           free: "一部",       lite: "基本",       standard: "全項目",   pro: "全項目"   },
  { label: "利益計算（送料・手数料込）",  free: true,        lite: true,         standard: true,       pro: true       },
  { label: "対応プラットフォーム",     free: "基本",       lite: "メルカリ/Amazon", standard: "メルカリ/Amazon/eBay", pro: "全プラットフォーム" },
  { label: "履歴保存",               free: "3件",         lite: "50件",       standard: "無制限",   pro: "無制限"   },
  { label: "相場検索",               free: false,         lite: true,         standard: true,       pro: true       },
  { label: "ウォッチリスト",          free: false,         lite: false,        standard: true,       pro: true       },
  { label: "在庫・出品・売上管理",    free: false,         lite: false,        standard: true,       pro: true       },
  { label: "CSVエクスポート",        free: false,         lite: false,        standard: true,       pro: true       },
  { label: "高度な分析レポート",      free: false,         lite: false,        standard: false,      pro: true       },
  { label: "優先サポート",            free: false,         lite: false,        standard: false,      pro: true       },
];

const FAQS = [
  {
    q: "7日間無料トライアルはどのように機能しますか？",
    a: "Standard・Proプランはご登録後7日間、全機能を無料でお使いいただけます。トライアル期間中に解約すれば費用は一切かかりません。8日目以降に自動で課金が始まります。",
  },
  {
    q: "Liteプランとはどう違うのですか？",
    a: "Liteは月100スキャン・基本AIアドバイスのエントリープランです。StandardはAIアドバイスが全項目に広がり、ウォッチリスト・CSV出力など本格的な機能が使えます。月500スキャン以上使いたい方や、より精度の高い仕入れ判断をしたい方はStandardが最適です。",
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
    a: "はい。スキャン実行時にeBay・メルカリ・Shopee等から最新の価格情報を取得します。バックエンドはクラウドで稼働しており、初回アクセス時は数秒の起動時間が発生することがあります。",
  },
  {
    q: "フリープランとの違いは何ですか？",
    a: "フリープランは月10スキャン・基本利益計算のみです。赤字判定AIや相場検索はLite以上が必要です。まず無料で使い勝手を確認してからアップグレードする方法もおすすめです。",
  },
  {
    q: "クレジットカードなしで試せますか？",
    a: "フリープランはカード不要でご利用いただけます。Lite・Standard・Proはカード登録が必要ですが、Standard・Proはトライアル期間内に解約すれば費用は一切かかりません。",
  },
  {
    q: "スマホでも使えますか？",
    a: "はい、モバイルブラウザに完全対応しています。アプリのインストールは不要で、スマホのブラウザからそのままご利用いただけます。バーコードスキャン機能もスマホカメラで直接使えます。",
  },
  {
    q: "対応している仕入れプラットフォームは何ですか？",
    a: "eBay・メルカリ・Amazon・Shopee等に対応しています。プランにより対応範囲が異なります（上記の比較表をご参照ください）。スキャン機能は国内モードとグローバルモードを切り替えて使用できます。",
  },
  {
    q: "サポートはどのように受けられますか？",
    a: "ログイン後のサポートページよりお問い合わせいただけます。Standard・Proプランのユーザーは優先対応をご利用いただけます。よくある質問はヘルプページにも随時追加しています。",
  },
];

function CellVal({ val }: { val: boolean | string }) {
  if (val === true)  return <span style={{ color: "#22c55e", fontSize: 18, fontWeight: 700 }}>✓</span>;
  if (val === false) return <span style={{ color: "#3a5a4a", fontSize: 16 }}>—</span>;
  return <span style={{ color: "#c9a96b", fontSize: 11, fontWeight: 700, fontFamily: "monospace", lineHeight: 1.3 }}>{val}</span>;
}

function CurrentPlanBadge() {
  return (
    <div style={{ display: "inline-block", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 800, color: "#22c55e", marginTop: 6 }}>
      ✓ 現在のプラン
    </div>
  );
}

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { status } = useSession();
  const router = useRouter();
  const { plan: currentPlan, loading: planLoading } = usePlan();
  const isMobile = useIsMobile();
  const autoCheckoutFired = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || autoCheckoutFired.current) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout") as "LITE" | "STANDARD" | "PRO" | null;
    if (checkout) {
      autoCheckoutFired.current = true;
      handleSubscribe(checkout);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleSubscribe = async (planKey: "LITE" | "STANDARD" | "PRO") => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/pricing?checkout=${planKey}`)}`);
      return;
    }
    setLoading(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast((data as { error?: string }).error ?? "決済ページを開けませんでした。再度お試しください。", "error");
        setLoading(null);
        return;
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
      else setLoading(null);
    } catch {
      toast("決済ページへの接続に失敗しました。再度お試しください。", "error");
      setLoading(null);
    }
  };

  // カード共通スタイル
  const baseCard: React.CSSProperties = {
    background: P.bg1,
    border: `1px solid ${P.bd}`,
    borderRadius: 18,
    padding: isMobile ? "22px 16px" : "28px 22px",
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  };

  // Standard 本命カード（目立たせる）
  const featuredCard: React.CSSProperties = {
    ...baseCard,
    border: `2px solid ${P.bdSt}`,
    background: P.bg2,
    position: "relative",
    boxShadow: "0 0 32px rgba(201,169,107,0.12)",
    transform: isMobile ? undefined : "translateY(-8px)",
  };

  return (
    <div style={{ minHeight: "100vh", background: P.bg0, padding: isMobile ? "32px 14px" : "56px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 44 }}>
          <div style={{ fontSize: 12, color: P.gold, fontFamily: "monospace", fontWeight: 700, marginBottom: 10, letterSpacing: 2 }}>
            PRICING
          </div>
          <h1 style={{ fontSize: isMobile ? 24 : 34, fontWeight: 900, color: P.t1, marginBottom: 12, lineHeight: 1.3 }}>
            赤字仕入れを防ぐ、4つのプラン
          </h1>
          <p style={{ fontSize: isMobile ? 13 : 14, color: P.t3, maxWidth: 480, margin: "0 auto 16px" }}>
            「高い」ではなく「赤字1回分の損失より安い」。<br />
            仕入れ判断の精度を上げることで、ツール代以上の損失を防ぎます。
          </p>
          {/* バリュープロポジション */}
          <div style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {[
              { icon: "🛡️", text: "赤字仕入れを防ぐ" },
              { icon: "⚡", text: "3秒で買い/注意/見送り判定" },
              { icon: "🤖", text: "AIが利益を計算" },
              { icon: "🎁", text: "7日間無料トライアル" },
            ].map(({ icon, text }) => (
              <span key={text} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(201,169,107,0.08)", border: "1px solid rgba(201,169,107,0.18)", borderRadius: 20, padding: "5px 12px", fontSize: 12, color: P.t2, fontWeight: 600 }}>
                {icon} {text}
              </span>
            ))}
          </div>
        </div>

        {/* ── 社会的証明バー ── */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 8 : 10, marginBottom: isMobile ? 28 : 44 }}>
          {[
            { num: "¥4,980〜",  label: "月額スタート",      sub: "1日あたり約¥160〜" },
            { num: "7日間",     label: "無料トライアル",     sub: "Standard・Pro対象" },
            { num: "即時",      label: "解約可能",           sub: "縛り・違約金なし" },
            { num: "¥0",        label: "フリープラン",       sub: "カード不要で試せる" },
          ].map(({ num, label, sub }) => (
            <div key={label} style={{ background: "rgba(10,21,48,0.7)", border: "1px solid rgba(201,169,107,0.10)", borderRadius: 12, padding: isMobile ? "12px 10px" : "16px 18px", textAlign: "center" }}>
              <div style={{ fontSize: isMobile ? 17 : 22, fontWeight: 900, color: P.gold, fontFamily: "monospace" }}>{num}</div>
              <div style={{ fontSize: isMobile ? 10 : 12, fontWeight: 700, color: P.t1, margin: "3px 0 2px" }}>{label}</div>
              <div style={{ fontSize: 10, color: P.t3 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── 4つのプランカード ── */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 14 : 14,
          alignItems: isMobile ? "stretch" : "flex-end",
          marginBottom: isMobile ? 28 : 60,
        }}>

          {/* Free */}
          <div style={baseCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ background: "rgba(201,169,107,0.07)", border: "1px solid rgba(201,169,107,0.12)", borderRadius: 8, padding: 7 }}>
                <Gift size={16} color={P.t3} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: P.t1 }}>フリー</span>
            </div>
            {!planLoading && status === "authenticated" && currentPlan === "FREE" && <CurrentPlanBadge />}
            <div style={{ margin: "14px 0 6px" }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: P.t1, fontFamily: "monospace" }}>¥0</span>
              <span style={{ fontSize: 13, color: P.t3, marginLeft: 5 }}>/月</span>
            </div>
            <p style={{ fontSize: 12, color: P.t3, marginBottom: 18, lineHeight: 1.6 }}>
              まず試したい方向け。カード不要。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "auto", paddingBottom: 24 }}>
              {PLANS.FREE.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 13, color: P.t2, lineHeight: 1.5 }}>
                  <Check size={13} color={P.t3} style={{ flexShrink: 0, marginTop: 2 }} />
                  {f}
                </div>
              ))}
            </div>
            <a
              href="/login"
              style={{ display: "block", textAlign: "center", background: "transparent", border: `1px solid rgba(201,169,107,0.22)`, borderRadius: 10, color: P.t3, padding: "11px", fontSize: 13, fontWeight: 700, textDecoration: "none", marginTop: 16 }}
            >
              無料で始める（カード不要）
            </a>
          </div>

          {/* Lite */}
          <div style={baseCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ background: "rgba(126,176,232,0.08)", border: "1px solid rgba(126,176,232,0.20)", borderRadius: 8, padding: 7 }}>
                <Star size={16} color={P.lite} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: P.t1 }}>Lite</span>
            </div>
            {!planLoading && status === "authenticated" && currentPlan === "LITE" && <CurrentPlanBadge />}
            <div style={{ margin: "14px 0 6px" }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: P.lite, fontFamily: "monospace" }}>¥4,980</span>
              <span style={{ fontSize: 13, color: P.t3, marginLeft: 5 }}>/月</span>
            </div>
            <p style={{ fontSize: 12, color: P.t3, marginBottom: 18, lineHeight: 1.6 }}>
              物販を始めたばかりの方向けのエントリープラン。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "auto", paddingBottom: 24 }}>
              {PLANS.LITE.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 13, color: P.t2, lineHeight: 1.5 }}>
                  <Check size={13} color={P.lite} style={{ flexShrink: 0, marginTop: 2 }} />
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => handleSubscribe("LITE")}
              disabled={loading === "LITE"}
              style={{ width: "100%", background: "transparent", border: `1px solid rgba(126,176,232,0.35)`, borderRadius: 10, color: P.lite, padding: "11px", fontSize: 13, fontWeight: 700, cursor: loading === "LITE" ? "not-allowed" : "pointer", marginTop: 16, opacity: loading === "LITE" ? 0.6 : 1 }}
            >
              {loading === "LITE" ? "処理中..." : "初心者プランで始める"}
            </button>
          </div>

          {/* Standard（本命・目立つ） */}
          <div style={featuredCard}>
            {/* おすすめバッジ */}
            <div style={{ position: "absolute", top: isMobile ? undefined : -14, left: isMobile ? undefined : "50%", transform: isMobile ? undefined : "translateX(-50%)", ...(isMobile ? { marginBottom: 12 } : {}), display: isMobile ? "inline-block" : undefined, background: `linear-gradient(135deg,${P.bg1},${P.bg2})`, border: `1px solid ${P.bdSt}`, borderRadius: 20, padding: "4px 16px", fontSize: 11, fontWeight: 800, color: P.gold, whiteSpace: "nowrap" }}>
              一番人気
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, marginTop: isMobile ? 0 : 10 }}>
              <div style={{ background: "rgba(201,169,107,0.10)", border: `1px solid rgba(201,169,107,0.30)`, borderRadius: 8, padding: 7 }}>
                <Zap size={16} color={P.gold} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: P.t1 }}>Standard</span>
            </div>
            {!planLoading && status === "authenticated" && currentPlan === "STANDARD" && <CurrentPlanBadge />}
            <div style={{ margin: "14px 0 6px" }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: P.gold, fontFamily: "monospace" }}>¥9,800</span>
              <span style={{ fontSize: 13, color: P.t3, marginLeft: 5 }}>/月</span>
            </div>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: "#22c55e", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>
                🎁 7日間無料トライアル
              </span>
            </div>
            {/* 価値訴求 */}
            <div style={{ background: "rgba(201,169,107,0.06)", border: "1px solid rgba(201,169,107,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: P.t2, lineHeight: 1.6 }}>
              赤字仕入れ1回（想定損失¥10,000〜）を防ぐだけで、月額代を回収できます。※モデルケース
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "auto", paddingBottom: 24 }}>
              {PLANS.STANDARD.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 13, color: P.t2, lineHeight: 1.5 }}>
                  <Check size={13} color={P.gold} style={{ flexShrink: 0, marginTop: 2 }} />
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => handleSubscribe("STANDARD")}
              disabled={loading === "STANDARD"}
              style={{ width: "100%", background: loading === "STANDARD" ? "rgba(0,20,10,0.5)" : `linear-gradient(135deg,${P.bg1},${P.bg2})`, border: `2px solid ${P.bdSt}`, borderRadius: 10, color: P.gold, padding: "13px", fontSize: 14, fontWeight: 900, cursor: loading === "STANDARD" ? "not-allowed" : "pointer", marginTop: 16, letterSpacing: "0.02em" }}
            >
              {loading === "STANDARD" ? "処理中..." : "一番人気で始める →"}
            </button>
          </div>

          {/* Pro */}
          <div style={baseCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ background: "rgba(74,127,193,0.10)", border: "1px solid rgba(74,127,193,0.25)", borderRadius: 8, padding: 7 }}>
                <Building2 size={16} color="#7eb0e8" />
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: P.t1 }}>Pro</span>
            </div>
            {!planLoading && status === "authenticated" && currentPlan === "PRO" && <CurrentPlanBadge />}
            <div style={{ margin: "14px 0 6px" }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: "#7eb0e8", fontFamily: "monospace" }}>¥19,800</span>
              <span style={{ fontSize: 13, color: P.t3, marginLeft: 5 }}>/月</span>
            </div>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: "#22c55e", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>
                🎁 7日間無料トライアル
              </span>
            </div>
            <p style={{ fontSize: 12, color: P.t3, marginBottom: 16, lineHeight: 1.6 }}>
              本格運用したい方・チームでの利用に。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "auto", paddingBottom: 24 }}>
              {PLANS.PRO.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 13, color: P.t2, lineHeight: 1.5 }}>
                  <Check size={13} color="#7eb0e8" style={{ flexShrink: 0, marginTop: 2 }} />
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => handleSubscribe("PRO")}
              disabled={loading === "PRO"}
              style={{ width: "100%", background: "transparent", border: "1px solid rgba(74,127,193,0.40)", borderRadius: 10, color: "#7eb0e8", padding: "11px", fontSize: 13, fontWeight: 700, cursor: loading === "PRO" ? "not-allowed" : "pointer", marginTop: 16, opacity: loading === "PRO" ? 0.6 : 1 }}
            >
              {loading === "PRO" ? "処理中..." : "Proで本格運用する"}
            </button>
          </div>
        </div>

        {/* ── 競合比較（価格ではなく価値で訴求）── */}
        <div style={{ marginBottom: isMobile ? 28 : 48, background: "rgba(10,21,48,0.8)", border: "1px solid rgba(201,169,107,0.12)", borderRadius: 14, padding: isMobile ? "20px 16px" : "28px 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: P.gold, fontFamily: "monospace", fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>WHY UPJ</div>
            <h2 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 900, color: P.t1, margin: 0 }}>「安さ」ではなく「赤字を防ぐ設計」</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 20 }}>
            {[
              { label: "一般的なリサーチツール", items: ["価格推移・グラフ分析が中心", "どう判断するかは自分次第", "操作が複雑で時間がかかる"], color: "#c46060", icon: "✕" },
              { label: "UPJ Profit Scanner", items: ["赤字仕入れ防止が中心設計", "買い／注意／見送りで即決できる", "物販初心者でも3秒で判断"], color: "#22c55e", icon: "✓" },
            ].map(({ label, items, color, icon }) => (
              <div key={label} style={{ border: `1px solid ${color}30`, borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 12 }}>{icon} {label}</div>
                {items.map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: P.t2, marginBottom: 8 }}>
                    <span style={{ color, fontSize: 14 }}>{icon}</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── 声のセクション ── */}
        <div style={{ marginBottom: isMobile ? 28 : 48 }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: P.gold, fontFamily: "monospace", fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>USERS</div>
            <h2 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 900, color: P.t1, margin: 0 }}>使った人の声</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 12 : 14 }}>
            {[
              { name: "T.K さん（会社員・副業）", plan: "Standard", stars: 5, body: "eBayで何を仕入れたらいいか全然わからなかったけど、スキャナーで候補が一覧で出てくるのが助かる。利益率の計算を手動でやってた頃が嘘みたいです。" },
              { name: "M.S さん（専業物販）", plan: "Pro", stars: 5, body: "複数プラットフォームの相場を一括で見られるのがいい。メルカリとAmazonで価格差がある商品を拾いやすくなった。毎朝これを開くのが日課になっています。" },
              { name: "R.N さん（大学生）", plan: "Standard", stars: 5, body: "無料トライアルで試したら即課金しました。仕入れ判断が3秒で出るのが衝撃的。思ったより手軽に始められてよかったです。" },
            ].map(({ name, plan, stars, body }) => (
              <div key={name} style={{ background: "rgba(10,21,48,0.9)", border: "1px solid rgba(201,169,107,0.13)", borderRadius: 12, padding: "20px 18px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
                  {Array.from({ length: stars }).map((_, i) => (
                    <span key={i} style={{ color: "#f59e0b", fontSize: 15, lineHeight: 1 }}>★</span>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: P.t2, lineHeight: 1.8, marginBottom: 14, flex: 1 }}>「{body}」</div>
                <div style={{ borderTop: "1px solid rgba(201,169,107,0.07)", paddingTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: P.t1 }}>{name}</div>
                  <div style={{ fontSize: 11, color: P.t3, marginTop: 2 }}>{plan}プラン利用中</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#5A5248", textAlign: "right" }}>
            ※ 上記は利用者の個人的な感想です。利用状況・商品・市場環境により結果は異なります。
          </div>
        </div>

        {/* ── 機能比較表（5列）── */}
        <div style={{ marginBottom: isMobile ? 28 : 48 }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: P.gold, fontFamily: "monospace", fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>COMPARISON</div>
            <h2 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 900, color: P.t1, margin: 0 }}>プラン機能比較</h2>
          </div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}>
            <div style={{ background: "rgba(10,21,48,0.9)", border: "1px solid rgba(201,169,107,0.13)", borderRadius: 12, overflow: "hidden", minWidth: isMobile ? 560 : undefined }}>
              {/* ヘッダー行 */}
              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.9fr 0.9fr 1.1fr 0.9fr", background: "rgba(0,0,0,0.28)", borderBottom: "1px solid rgba(201,169,107,0.10)" }}>
                <div style={{ padding: isMobile ? "11px 12px" : "13px 18px", fontSize: 11, color: P.t3, fontWeight: 700 }}>機能</div>
                {[
                  { name: "Free",     color: P.t3,     highlight: false },
                  { name: "Lite",     color: P.lite,   highlight: false },
                  { name: "Standard", color: P.gold,   highlight: true  },
                  { name: "Pro",      color: "#7eb0e8", highlight: false },
                ].map(({ name, color, highlight }) => (
                  <div key={name} style={{ padding: isMobile ? "11px 6px" : "13px 12px", textAlign: "center", fontSize: isMobile ? 11 : 12, color, fontWeight: 800, background: highlight ? "rgba(201,169,107,0.08)" : undefined }}>
                    {highlight ? <span>{name}</span> : name}
                  </div>
                ))}
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={row.label}
                  style={{ display: "grid", gridTemplateColumns: "1.8fr 0.9fr 0.9fr 1.1fr 0.9fr", borderBottom: i < COMPARISON.length - 1 ? "1px solid rgba(201,169,107,0.05)" : "none" }}
                >
                  <div style={{ padding: isMobile ? "10px 12px" : "12px 18px", fontSize: isMobile ? 11 : 12, color: "#d0d8e8" }}>{row.label}</div>
                  <div style={{ padding: isMobile ? "10px 6px" : "12px 12px", textAlign: "center" }}><CellVal val={row.free} /></div>
                  <div style={{ padding: isMobile ? "10px 6px" : "12px 12px", textAlign: "center" }}><CellVal val={row.lite} /></div>
                  <div style={{ padding: isMobile ? "10px 6px" : "12px 12px", textAlign: "center", background: "rgba(201,169,107,0.06)", borderLeft: "1px solid rgba(201,169,107,0.10)", borderRight: "1px solid rgba(201,169,107,0.10)" }}><CellVal val={row.standard} /></div>
                  <div style={{ padding: isMobile ? "10px 6px" : "12px 12px", textAlign: "center" }}><CellVal val={row.pro} /></div>
                </div>
              ))}
            </div>
          </div>
          {isMobile && (
            <div style={{ textAlign: "center", marginTop: 6, fontSize: 11, color: P.t4 }}>← 左右にスクロールできます</div>
          )}
        </div>

        {/* ── 信頼表示 ── */}
        <div style={{ marginBottom: isMobile ? 28 : 48, background: "rgba(10,21,48,0.7)", border: "1px solid rgba(201,169,107,0.09)", borderRadius: 12, padding: isMobile ? "16px 14px" : "20px 26px" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: isMobile ? 12 : 10 }}>
            {[
              ["🏢", "運営", "株式会社ユニバースプラネットジャパン"],
              ["🔒", "決済", "Stripe（PCI DSS準拠の安全な決済）"],
              ["🛡️", "カード情報", "当社サーバーでは保持しません"],
              ["✅", "解約", "マイページからいつでも即時解約OK"],
            ].map(([icon, label, desc]) => (
              <div key={label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: P.t3, fontWeight: 700, marginBottom: 1 }}>{label}</div>
                  <div style={{ fontSize: 12, color: "#c0b8a8" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{ marginBottom: isMobile ? 28 : 48 }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: P.gold, fontFamily: "monospace", fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FAQ</div>
            <h2 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 900, color: P.t1, margin: 0 }}>よくある質問</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FAQS.map((faq, i) => (
              <div
                key={i}
                style={{ background: "rgba(10,21,48,0.9)", border: `1px solid ${openFaq === i ? "rgba(201,169,107,0.32)" : "rgba(201,169,107,0.10)"}`, borderRadius: 10, overflow: "hidden", transition: "border-color 0.15s" }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 12 }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: P.t1, lineHeight: 1.5 }}>{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp size={15} color={P.gold} style={{ flexShrink: 0 }} />
                    : <ChevronDown size={15} color={P.t3} style={{ flexShrink: 0 }} />
                  }
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 18px 14px", fontSize: 13, color: P.t3, lineHeight: 1.8 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 最終CTA ── */}
        <div style={{ textAlign: "center", padding: isMobile ? "28px 14px" : "40px 24px", background: "rgba(10,21,48,0.7)", border: "1px solid rgba(201,169,107,0.18)", borderRadius: 16 }}>
          <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 900, color: P.t1, marginBottom: 8, lineHeight: 1.4 }}>
            まずは7日間、無料で試してみませんか？
          </div>
          <div style={{ fontSize: 13, color: P.t3, marginBottom: 20 }}>
            クレジットカード登録後すぐ開始。期間中に解約すれば費用0円。
          </div>
          <button
            onClick={() => handleSubscribe("STANDARD")}
            disabled={loading !== null}
            style={{ width: isMobile ? "100%" : undefined, background: `linear-gradient(135deg,${P.bg1},${P.bg2})`, border: `2px solid ${P.bdSt}`, borderRadius: 12, color: P.gold, padding: isMobile ? "14px 18px" : "15px 40px", fontSize: isMobile ? 14 : 15, fontWeight: 900, cursor: "pointer", letterSpacing: "0.02em" }}
          >
            {loading === "STANDARD" ? "処理中..." : isMobile ? "Standardを7日間無料で試す →" : "一番人気のStandardプランを7日間無料で試す →"}
          </button>
          <div style={{ marginTop: 12 }}>
            <a href="/login" style={{ fontSize: 12, color: P.t3, textDecoration: "none" }}>
              まずはフリープランで試す（カード不要）
            </a>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 12 : 24, flexWrap: "wrap", marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(201,169,107,0.08)" }}>
            {[
              { icon: "🎁", text: "7日間無料" },
              { icon: "⚡", text: "いつでも即解約" },
              { icon: "🔒", text: "カード情報は保持しない" },
              { icon: "🏢", text: "法人運営・Stripe決済" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: P.t4 }}>
                <span style={{ fontSize: 13 }}>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── フッター ── */}
        <div style={{ marginTop: 48, paddingTop: 20, borderTop: "1px solid rgba(201,169,107,0.10)", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: P.t4, marginBottom: 10 }}>© 2026 株式会社ユニバースプラネットジャパン</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
            {[
              ["/legal/tokusho", "特定商取引法に基づく表記"],
              ["/legal/terms", "利用規約"],
              ["/legal/privacy", "プライバシーポリシー"],
            ].map(([href, label]) => (
              <a key={href} href={href} style={{ fontSize: 12, color: P.t3, textDecoration: "none" }}>
                {label}
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
