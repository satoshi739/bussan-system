"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles, Zap, Eye, ShoppingBag, Truck, CheckCircle2, ArrowRight,
  Package, Store, BadgeJapaneseYen, Camera, Bot, Wand2,
  MapPin, ChevronRight, TrendingUp, ExternalLink, Info,
  Printer, RefreshCw, Mail, Star, Award, AlertCircle, Loader2,
  MessageSquare, Calendar, FileSpreadsheet, Calculator, Globe2,
  ThumbsUp, Image as ImageIcon,
} from "lucide-react";

// ─────────────────────────────────────────────────────────
//  Design Tokens — Light Mode: White × iOS Blue
// ─────────────────────────────────────────────────────────
const C = {
  bg0: "#EEF2FA",
  bg1: "#FFFFFF",
  bg2: "#F5F8FF",
  bg3: "#E4ECFA",
  t1: "#080D1C",
  t2: "rgba(8,13,28,0.75)",
  t3: "rgba(8,13,28,0.55)",
  t4: "rgba(8,13,28,0.30)",
  blue: "#006FE6",
  blueLt: "#3B8EEA",
  blueDm: "#004EB0",
  azure: "#40AADF",
  up: "#1E9C3C",
  dn: "#E02E24",
  warn: "#E88500",
  bd: "rgba(0,0,0,0.13)",
  bdSub: "rgba(0,0,0,0.06)",
};

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: C.bg1,
  border: `1px solid ${C.bd}`,
  borderRadius: 24,
  padding: "20px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
  ...extra,
});

// ─────────────────────────────────────────────────────────
//  Mock Product — 1つの商品が全ステージを通る
// ─────────────────────────────────────────────────────────
const PRODUCT = {
  name: "セイコー 5 SNXS79 自動巻きメンズ腕時計（中古・付属品なし）",
  source: "メルカリ",
  sourceUrl: "https://jp.mercari.com/item/m12345678",
  buy: 4200,
  estimatedSell: 12800,
  weight: 0.62,
  size: "60サイズ",
  thumb: "⌚",
  category: "腕時計",
  conditionLabel: "目立った傷や汚れなし",
  aiTitle: {
    eBay: "SEIKO 5 SNXS79 Automatic Men's Watch Silver Dial 7S26 Used From Japan",
    yahoo: "★1円〜★SEIKO セイコー5 SNXS79 自動巻き 7S26 メンズ腕時計 シルバー文字盤 中古",
    amazon: "セイコー 5 SNXS79 自動巻き メンズ腕時計 シルバー 7S26 中古 並行輸入",
  },
};

const SHIPPING_FEES = {
  yamato: { name: "ヤマト運輸", fee: 1180, eta: "翌日〜2日", logo: "🐱" },
  sagawa: { name: "佐川急便", fee: 1100, eta: "翌日〜2日", logo: "🦅" },
  japanpost: { name: "日本郵便", fee: 1050, eta: "1〜3日", logo: "📮" },
};

// Deterministic 8x8 QR-like pattern (true = white module)
const QR_PATTERN = [
  1,1,1,0,1,1,1,0, 1,0,1,1,0,1,0,1, 1,0,0,1,1,0,1,0, 1,1,1,0,0,1,0,1,
  0,1,0,1,1,0,1,1, 1,0,1,0,1,1,0,0, 1,1,0,1,0,1,1,1, 0,1,1,1,0,0,1,0,
].map(Boolean);

const STEPS = [
  { key: "found",    label: "発見",         icon: Sparkles,    color: C.blue },
  { key: "list",     label: "ワンクリック出品", icon: Zap,         color: C.blue },
  { key: "live",     label: "出品中",        icon: Eye,         color: C.azure },
  { key: "sold",     label: "売れた",        icon: ShoppingBag, color: C.up },
  { key: "ship",     label: "送り状発行",     icon: Truck,       color: C.warn },
  { key: "tracking", label: "配送追跡",      icon: MapPin,      color: C.azure },
  { key: "done",     label: "利益確定",      icon: CheckCircle2, color: C.up },
] as const;

type StepKey = typeof STEPS[number]["key"];

// ─────────────────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [step, setStep] = useState<StepKey>("found");
  const [channel, setChannel] = useState<"eBay" | "yahoo" | "amazon">("yahoo");
  const [carrier, setCarrier] = useState<"yamato" | "sagawa" | "japanpost">("yamato");
  const [listing, setListing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef<number | null>(null);

  // Auto-play demo: advance steps every 2.5s
  useEffect(() => {
    if (!autoPlay) {
      if (autoPlayRef.current) window.clearInterval(autoPlayRef.current);
      return;
    }
    autoPlayRef.current = window.setInterval(() => {
      setStep(prev => {
        const idx = STEPS.findIndex(s => s.key === prev);
        if (idx >= STEPS.length - 1) {
          setAutoPlay(false);
          return prev;
        }
        return STEPS[idx + 1].key;
      });
    }, 2500);
    return () => {
      if (autoPlayRef.current) window.clearInterval(autoPlayRef.current);
    };
  }, [autoPlay]);

  const channelFee =
    channel === "eBay" ? Math.round(PRODUCT.estimatedSell * 0.13) :
    channel === "yahoo" ? Math.round(PRODUCT.estimatedSell * 0.10) :
    Math.round(PRODUCT.estimatedSell * 0.15);

  const shippingFee = SHIPPING_FEES[carrier].fee;
  const platformFee = channelFee;
  const finalProfit = PRODUCT.estimatedSell - PRODUCT.buy - platformFee - shippingFee;
  const roi = Math.round((finalProfit / PRODUCT.buy) * 100);

  const stepIndex = STEPS.findIndex(s => s.key === step);

  const handleListClick = () => {
    setListing(true);
    setTimeout(() => {
      setListing(false);
      setStep("live");
    }, 1400);
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      setPrinting(false);
      setStep("tracking");
    }, 1200);
  };

  return (
    <div style={{ background: C.bg0, minHeight: "100vh", padding: "24px 20px 80px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "linear-gradient(135deg, rgba(0,111,230,0.12), rgba(64,170,223,0.12))", color: C.blueDm, border: `1px solid ${C.bd}`, borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, marginBottom: 10 }}>
              <Sparkles size={12} /> BETA / 自動パイプライン
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: C.t1, margin: 0, lineHeight: 1.25 }}>
              スキャン → 出品 → 販売 → 配送 → 利益確定
            </h1>
            <p style={{ color: C.t2, marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
              仕入れた瞬間から着金まで、1つの画面で完結。あなたは <b style={{ color: C.t1 }}>「OK」を押すだけ</b>。
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <button onClick={() => { setStep("found"); setAutoPlay(p => !p); }} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 18px",
              background: autoPlay ? C.dn : "linear-gradient(135deg, #006FE6, #40AADF)",
              color: "#fff", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,111,230,0.30)",
            }}>
              {autoPlay ? <>■ 停止</> : <>▶ デモを自動再生（{STEPS.length}ステップ）</>}
            </button>
            <div style={{ fontSize: 10, color: C.t3 }}>1ステップ 2.5秒で全フローを再生</div>
          </div>
        </div>

        {/* Stepper */}
        <div style={card({ padding: "16px 20px", marginBottom: 20 })}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, overflowX: "auto", paddingBottom: 4 }}>
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <div key={s.key} style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
                  <button
                    onClick={() => setStep(s.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 14px",
                      background: active ? s.color : done ? "rgba(30,156,60,0.10)" : "transparent",
                      color: active ? "#fff" : done ? C.up : C.t3,
                      border: active ? "none" : `1px solid ${done ? "rgba(30,156,60,0.30)" : C.bd}`,
                      borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}>
                    <Icon size={14} />
                    <span>{i + 1}. {s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <ChevronRight size={14} color={done ? C.up : C.t4} style={{ margin: "0 2px" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Product Snapshot (常に上部に固定表示) */}
        <ProductSnapshot
          step={step}
          channel={channel}
          carrier={carrier}
          shippingFee={shippingFee}
          platformFee={platformFee}
          finalProfit={finalProfit}
          roi={roi}
        />

        <div style={{ height: 20 }} />

        {/* Active Step Content */}
        {step === "found" && <StepFound onNext={() => setStep("list")} />}
        {step === "list" && (
          <StepList
            channel={channel}
            setChannel={setChannel}
            carrier={carrier}
            setCarrier={setCarrier}
            shippingFee={shippingFee}
            platformFee={platformFee}
            finalProfit={finalProfit}
            listing={listing}
            onList={handleListClick}
          />
        )}
        {step === "live" && <StepLive channel={channel} onNext={() => setStep("sold")} />}
        {step === "sold" && <StepSold channel={channel} onNext={() => setStep("ship")} />}
        {step === "ship" && (
          <StepShip
            carrier={carrier}
            setCarrier={setCarrier}
            printing={printing}
            onPrint={handlePrint}
          />
        )}
        {step === "tracking" && <StepTracking carrier={carrier} onNext={() => setStep("done")} />}
        {step === "done" && <StepDone finalProfit={finalProfit} roi={roi} channel={channel} />}

        {/* Bottom: 全体パイプライン状態 */}
        <div style={{ height: 32 }} />
        <PipelineSummary />

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Snapshot of the product (always visible)
// ─────────────────────────────────────────────────────────
function ProductSnapshot({ step, channel, carrier, shippingFee, platformFee, finalProfit, roi }: {
  step: StepKey;
  channel: "eBay" | "yahoo" | "amazon";
  carrier: "yamato" | "sagawa" | "japanpost";
  shippingFee: number;
  platformFee: number;
  finalProfit: number;
  roi: number;
}) {
  const channelLabel = channel === "eBay" ? "eBay" : channel === "yahoo" ? "ヤフオク" : "Amazon";
  return (
    <div style={card({ padding: 0, overflow: "hidden" })}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 0 }}>
        {/* Left: product info */}
        <div style={{ padding: "20px 22px", borderRight: `1px solid ${C.bdSub}` }}>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: `linear-gradient(135deg, ${C.bg3}, ${C.bg2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, flexShrink: 0 }}>
              {PRODUCT.thumb}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ padding: "2px 8px", background: "rgba(0,111,230,0.12)", color: C.blue, borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{PRODUCT.category}</span>
                <span style={{ color: C.t3, fontSize: 11 }}>仕入れ元: {PRODUCT.source}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, lineHeight: 1.4 }}>{PRODUCT.name}</div>
              <div style={{ marginTop: 6, fontSize: 11, color: C.t3 }}>
                {PRODUCT.weight}kg / {PRODUCT.size} / {PRODUCT.conditionLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Right: numbers */}
        <div style={{ padding: "20px 22px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <Metric label="仕入れ" value={`¥${PRODUCT.buy.toLocaleString()}`} color={C.t1} />
          <Metric label="販売価" value={`¥${PRODUCT.estimatedSell.toLocaleString()}`} color={C.t1} />
          <Metric label="手数料+送料" value={`¥${(platformFee + shippingFee).toLocaleString()}`} color={C.t3} sub={`${channelLabel}+${carrier === "yamato" ? "ヤマト" : carrier === "sagawa" ? "佐川" : "郵便"}`} />
          <Metric label="想定利益" value={`¥${finalProfit.toLocaleString()}`} color={C.up} sub={`ROI ${roi}%`} bold />
        </div>
      </div>

      {/* Current stage strip */}
      <div style={{ padding: "10px 22px", background: C.bg2, borderTop: `1px solid ${C.bdSub}`, display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.t2 }}>
        <Loader2 size={14} className="spin" color={C.blue} />
        <span>現在のステージ: <b style={{ color: C.t1 }}>{STEPS.find(s => s.key === step)?.label}</b></span>
      </div>
    </div>
  );
}

function Metric({ label, value, color, sub, bold }: { label: string; value: string; color: string; sub?: string; bold?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.t3, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: bold ? 22 : 18, fontWeight: bold ? 800 : 700, color, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Step 1: Found
// ─────────────────────────────────────────────────────────
function StepFound({ onNext }: { onNext: () => void }) {
  return (
    <div style={card()}>
      <SectionHeader icon={Sparkles} title="今朝のスキャンで発見されました" sub="毎朝06:00、AIがメルカリ・ヤフオクから利益商品を自動収集" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 16 }}>
        <StatCard icon={Camera} title="今朝スキャンした商品" value="2,847" sub="件" />
        <StatCard icon={TrendingUp} title="利益¥3,000以上の発見" value="14" sub="件" />
        <StatCard icon={Award} title="この商品のスコア" value="★★★★★" sub="ROI 61% / 信頼度高" />
      </div>

      {/* Mini price history chart */}
      <div style={{ marginTop: 14, padding: 14, background: C.bg1, border: `1px solid ${C.bdSub}`, borderRadius: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>過去30日 eBay 売却価格推移</div>
          <div style={{ fontSize: 11, color: C.t3 }}>サンプル数: <b style={{ color: C.t1 }}>8件</b> · 中央値 <b style={{ color: C.up }}>¥12,800</b></div>
        </div>
        <Sparkline values={[11200, 11800, 12500, 11900, 13200, 12800, 13500, 12800, 12100, 12800, 13800, 12800]} highlight={PRODUCT.estimatedSell} />
      </div>

      <div style={{ marginTop: 18, padding: 16, background: C.bg2, border: `1px dashed ${C.bd}`, borderRadius: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Bot size={16} color={C.blue} />
          <b style={{ color: C.t1, fontSize: 13 }}>AI 判定コメント</b>
        </div>
        <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.7 }}>
          過去30日の eBay 売却履歴 8件・ヤフオク 12件を分析。中央値 ¥12,800、最頻売却日数 4.2日。
          現在の仕入価 ¥4,200 はメルカリ相場の <b style={{ color: C.up }}>下位15%</b>。
          <b style={{ color: C.t1 }}>仕入れ推奨 / 即日出品で4日以内売却見込み</b>。
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <a href={PRODUCT.sourceUrl} target="_blank" rel="noopener" style={btnSecondary()}>
          <ExternalLink size={14} /> メルカリで仕入れる
        </a>
        <button onClick={onNext} style={btnPrimary()}>
          <Zap size={16} /> ワンクリック出品へ <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Step 2: List (one-click)
// ─────────────────────────────────────────────────────────
function StepList({ channel, setChannel, carrier, setCarrier, shippingFee, platformFee, finalProfit, listing, onList }: {
  channel: "eBay" | "yahoo" | "amazon";
  setChannel: (c: "eBay" | "yahoo" | "amazon") => void;
  carrier: "yamato" | "sagawa" | "japanpost";
  setCarrier: (c: "yamato" | "sagawa" | "japanpost") => void;
  shippingFee: number;
  platformFee: number;
  finalProfit: number;
  listing: boolean;
  onList: () => void;
}) {
  const channels = [
    { key: "yahoo" as const,  label: "ヤフオク",  feeRate: "10%", icon: "🏷️", note: "国内最速・即日売却向き" },
    { key: "eBay" as const,   label: "eBay",     feeRate: "13%", icon: "🌐", note: "海外バイヤー・高単価向き" },
    { key: "amazon" as const, label: "Amazon",   feeRate: "15%", icon: "📦", note: "FBA連携で放置販売" },
  ];

  const aiTitle = PRODUCT.aiTitle[channel];

  return (
    <div style={card()}>
      <SectionHeader icon={Zap} title="ワンクリック自動出品" sub="チャンネル選択・タイトル・価格・送料まで全自動。あなたは確認するだけ。" />

      {/* Multi-channel banner */}
      <div style={{ marginTop: 14, padding: 12, background: "linear-gradient(135deg, rgba(0,111,230,0.08), rgba(64,170,223,0.08))", border: `1px dashed ${C.blue}`, borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <Globe2 size={18} color={C.blue} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>マルチチャンネル同時出品（Pro機能）</div>
          <div style={{ fontSize: 11, color: C.t3 }}>eBay・ヤフオク・Amazon に同時出品し、最初に売れた瞬間に他チャンネルから自動取下げ</div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, color: C.t2 }}>
          <input type="checkbox" defaultChecked={false} />
          <span>有効化</span>
        </label>
      </div>

      {/* Channel selector */}
      <div style={{ marginTop: 16 }}>
        <Label>出品先チャンネル</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 8 }}>
          {channels.map(c => {
            const active = channel === c.key;
            return (
              <button key={c.key} onClick={() => setChannel(c.key)} style={{
                padding: "12px 14px",
                background: active ? "rgba(0,111,230,0.10)" : C.bg1,
                border: `1.5px solid ${active ? C.blue : C.bd}`,
                borderRadius: 16, cursor: "pointer",
                textAlign: "left",
                position: "relative",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{c.label}</div>
                    <div style={{ fontSize: 10, color: C.t3 }}>手数料 {c.feeRate}</div>
                  </div>
                  {active && <CheckCircle2 size={16} color={C.blue} style={{ marginLeft: "auto" }} />}
                </div>
                <div style={{ fontSize: 11, color: C.t3, marginTop: 6 }}>{c.note}</div>
                {c.key === "yahoo" && (
                  <span style={{ position: "absolute", top: 8, right: 8, padding: "2px 6px", background: C.up, color: "#fff", borderRadius: 999, fontSize: 9, fontWeight: 700 }}>NEW</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Photo gallery (auto-enhanced) */}
      <div style={{ marginTop: 18 }}>
        <Label>商品写真（AI自動補正済み）</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 8 }}>
          {["⌚", "🔍", "📐", "💎", "+"].map((emoji, i) => (
            <div key={i} style={{
              aspectRatio: "1",
              background: i === 0 ? `linear-gradient(135deg, ${C.bg3}, ${C.bg2})` : C.bg2,
              border: `1.5px solid ${i === 0 ? C.blue : C.bdSub}`,
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: i === 4 ? 24 : 36, color: i === 4 ? C.t3 : C.t1, position: "relative",
              cursor: "pointer",
            }}>
              {emoji}
              {i === 0 && (
                <span style={{ position: "absolute", bottom: 4, left: 4, padding: "1px 6px", background: C.blue, color: "#fff", borderRadius: 999, fontSize: 8, fontWeight: 700 }}>メイン</span>
              )}
              {i === 4 && (
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.t3, fontWeight: 600, flexDirection: "column", gap: 2 }}>
                  <ImageIcon size={20} />
                  追加
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: C.t3, display: "flex", alignItems: "center", gap: 6 }}>
          <Wand2 size={11} /> 背景除去・色補正・透かし追加を自動実行済み
        </div>
      </div>

      {/* AI-generated content */}
      <div style={{ marginTop: 18, padding: 16, background: C.bg2, borderRadius: 16, border: `1px solid ${C.bdSub}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Wand2 size={14} color={C.blue} />
          <b style={{ color: C.t1, fontSize: 12 }}>AI が自動生成した出品情報</b>
          <span style={{ padding: "2px 8px", background: "rgba(30,156,60,0.12)", color: C.up, borderRadius: 999, fontSize: 9, fontWeight: 700 }}>信頼度 94%</span>
          <button style={{ marginLeft: "auto", padding: "4px 10px", background: "transparent", color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <RefreshCw size={11} /> 再生成
          </button>
        </div>
        <Label>タイトル</Label>
        <div style={{ marginTop: 4, padding: "10px 12px", background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 10, fontSize: 13, color: C.t1, fontWeight: 600 }}>
          {aiTitle}
        </div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <Label>販売価格</Label>
            <div style={{ marginTop: 4, padding: "10px 12px", background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 10, fontSize: 15, color: C.t1, fontWeight: 800 }}>
              ¥{PRODUCT.estimatedSell.toLocaleString()}
            </div>
          </div>
          <div>
            <Label>カテゴリ</Label>
            <div style={{ marginTop: 4, padding: "10px 12px", background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 10, fontSize: 13, color: C.t1, fontWeight: 600 }}>
              腕時計 &gt; メンズ &gt; 自動巻き
            </div>
          </div>
        </div>
      </div>

      {/* Shipping API auto-calc */}
      <div style={{ marginTop: 18 }}>
        <Label>配送業者（料金は自動取得）</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 8 }}>
          {(Object.keys(SHIPPING_FEES) as Array<keyof typeof SHIPPING_FEES>).map(key => {
            const s = SHIPPING_FEES[key];
            const active = carrier === key;
            const cheapest = s.fee === Math.min(...Object.values(SHIPPING_FEES).map(x => x.fee));
            return (
              <button key={key} onClick={() => setCarrier(key)} style={{
                padding: "12px 14px",
                background: active ? "rgba(0,111,230,0.10)" : C.bg1,
                border: `1.5px solid ${active ? C.blue : C.bd}`,
                borderRadius: 16, cursor: "pointer", textAlign: "left", position: "relative",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{s.logo}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: C.t3 }}>{s.eta}</div>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: C.t1 }}>¥{s.fee.toLocaleString()}</div>
                <div style={{ fontSize: 9, color: C.t3 }}>{PRODUCT.weight}kg / {PRODUCT.size}</div>
                {cheapest && (
                  <span style={{ position: "absolute", top: 8, right: 8, padding: "2px 6px", background: C.up, color: "#fff", borderRadius: 999, fontSize: 9, fontWeight: 700 }}>最安</span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: C.t3, display: "flex", alignItems: "center", gap: 6 }}>
          <Info size={11} /> ヤマト B2 Web・佐川 e飛伝・郵便 ゆうパックプリントR の公式APIから自動取得
        </div>
      </div>

      {/* Profit breakdown */}
      <div style={{ marginTop: 18, padding: 16, background: "linear-gradient(135deg, rgba(30,156,60,0.06), rgba(0,111,230,0.04))", border: `1px solid ${C.bdSub}`, borderRadius: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.t3, marginBottom: 10 }}>📊 自動計算された最終利益</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 6, fontSize: 13, color: C.t2 }}>
          <span>販売価格</span>                          <span style={{ fontWeight: 700, color: C.t1 }}>+¥{PRODUCT.estimatedSell.toLocaleString()}</span>
          <span>仕入れ価格</span>                        <span style={{ fontWeight: 700, color: C.dn }}>−¥{PRODUCT.buy.toLocaleString()}</span>
          <span>プラットフォーム手数料 ({channel})</span>   <span style={{ fontWeight: 700, color: C.dn }}>−¥{platformFee.toLocaleString()}</span>
          <span>配送料 ({SHIPPING_FEES[carrier].name})</span> <span style={{ fontWeight: 700, color: C.dn }}>−¥{shippingFee.toLocaleString()}</span>
          <div style={{ gridColumn: "1 / -1", height: 1, background: C.bd, margin: "6px 0" }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>想定利益</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: C.up }}>¥{finalProfit.toLocaleString()}</span>
        </div>
      </div>

      {/* List button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, color: C.t3, display: "flex", alignItems: "center", gap: 6 }}>
          <Info size={12} /> 出品を押すと {channel === "eBay" ? "eBay" : channel === "yahoo" ? "ヤフオク" : "Amazon"} APIに即時送信されます
        </div>
        <button onClick={onList} disabled={listing} style={{
          ...btnPrimary(),
          padding: "14px 28px",
          fontSize: 15,
          opacity: listing ? 0.7 : 1,
          cursor: listing ? "wait" : "pointer",
          minWidth: 260,
          justifyContent: "center",
        }}>
          {listing ? (
            <><Loader2 size={18} className="spin" /> {channel === "eBay" ? "eBay" : channel === "yahoo" ? "ヤフオク" : "Amazon"} に送信中...</>
          ) : (
            <><Zap size={18} /> {channel === "eBay" ? "eBay" : channel === "yahoo" ? "ヤフオク" : "Amazon"} にワンクリック出品</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Step 3: Live
// ─────────────────────────────────────────────────────────
function StepLive({ channel, onNext }: { channel: "eBay" | "yahoo" | "amazon"; onNext: () => void }) {
  const channelLabel = channel === "eBay" ? "eBay" : channel === "yahoo" ? "ヤフオク" : "Amazon";
  const url = channel === "yahoo" ? "https://page.auctions.yahoo.co.jp/jp/auction/abc1234567" :
              channel === "eBay" ? "https://www.ebay.com/itm/123456789012" :
                                    "https://www.amazon.co.jp/dp/B0XYZ123";

  return (
    <div style={card()}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "rgba(30,156,60,0.08)", border: `1px solid rgba(30,156,60,0.30)`, borderRadius: 14, marginBottom: 16 }}>
        <CheckCircle2 size={22} color={C.up} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>{channelLabel} に出品しました</div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>3秒前 / 出品ID: #482937051</div>
        </div>
        <a href={url} target="_blank" rel="noopener" style={{ ...btnSecondary(), padding: "8px 14px" }}>
          <ExternalLink size={13} /> 出品ページを見る
        </a>
      </div>

      <SectionHeader icon={Eye} title="出品中・リアルタイム監視" sub="閲覧数・ウォッチ・質問通知をAIが24時間モニタリング" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 14 }}>
        <LiveStat label="閲覧数" value="142" sub="↑ 直近24h" color={C.blue} />
        <LiveStat label="ウォッチ" value="9" sub="高関心" color={C.warn} />
        <LiveStat label="質問" value="2" sub="AI返信済" color={C.azure} />
        <LiveStat label="予測売却日" value="3.4日" sub="9割確度" color={C.up} />
      </div>

      {/* Live view chart */}
      <div style={{ marginTop: 14, padding: 14, background: C.bg2, border: `1px solid ${C.bdSub}`, borderRadius: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>閲覧数の推移（24時間）</div>
          <div style={{ fontSize: 11, color: C.t3 }}>ピーク: <b style={{ color: C.t1 }}>21:00</b> · 平均 <b style={{ color: C.t1 }}>6/h</b></div>
        </div>
        <Sparkline values={[0, 2, 4, 3, 8, 12, 18, 22, 15, 8, 5, 12, 6, 4, 18, 9, 14, 21, 28, 17, 11, 9, 13, 18]} />
      </div>

      <div style={{ marginTop: 18, padding: 14, background: C.bg2, borderRadius: 12, fontSize: 12, color: C.t2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Bot size={14} color={C.blue} />
          <b style={{ color: C.t1 }}>AIアラート</b>
        </div>
        <div>📈 ウォッチ数が出品から3時間で9件 → 過去類似商品の85%が翌日売却。値下げ不要。</div>
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onNext} style={btnPrimary()}>
          <ShoppingBag size={16} /> 売れた！次のステージへ <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function LiveStat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ padding: 14, background: C.bg2, border: `1px solid ${C.bdSub}`, borderRadius: 14 }}>
      <div style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Step 4: Sold
// ─────────────────────────────────────────────────────────
function StepSold({ channel, onNext }: { channel: "eBay" | "yahoo" | "amazon"; onNext: () => void }) {
  const channelLabel = channel === "eBay" ? "eBay" : channel === "yahoo" ? "ヤフオク" : "Amazon";
  return (
    <div style={card()}>
      <div style={{ padding: 18, background: "linear-gradient(135deg, rgba(30,156,60,0.12), rgba(64,170,223,0.08))", border: `1px solid rgba(30,156,60,0.30)`, borderRadius: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 44, height: 44, background: C.up, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShoppingBag size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.t3, fontWeight: 700 }}>🎉 売れました</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.t1 }}>¥{PRODUCT.estimatedSell.toLocaleString()} で {channelLabel} 取引成立</div>
          </div>
        </div>
      </div>

      <SectionHeader icon={Mail} title="取引情報（自動取得）" sub="購入者情報・配送先・支払い状況を自動同期" />

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <InfoBlock title="購入者">
          <Row label="ユーザー名" value="t***o_2024" />
          <Row label="評価" value="★ 4.9 (128件)" />
          <Row label="支払い" value="✅ 完了 (¥12,800)" color={C.up} />
        </InfoBlock>
        <InfoBlock title="配送先">
          <Row label="氏名" value="高橋 ◯◯ 様" />
          <Row label="郵便番号" value="〒150-0001" />
          <Row label="住所" value="東京都渋谷区神宮前◯-◯-◯" />
        </InfoBlock>
      </div>

      {/* Buyer message thread */}
      <div style={{ marginTop: 18 }}>
        <SectionHeader icon={MessageSquare} title="購入者とのメッセージ" sub="AIが下書きを生成。あなたは承認するだけ。" />
        <div style={{ marginTop: 12, padding: 14, background: C.bg2, border: `1px solid ${C.bdSub}`, borderRadius: 14 }}>
          <ChatBubble who="buyer" name="t***o_2024" time="14:32" text="購入しました。明日から出張のため、早めに発送いただけると助かります 🙇" />
          <ChatBubble who="ai-draft" name="AI下書き" time="14:32" text="ご購入ありがとうございます！明日午前中にヤマト集荷予約済みです。発送が完了しましたら追跡番号をお送りしますのでご安心ください。素敵な出張になりますように。" />
          <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
            <button style={btnSecondary()}><RefreshCw size={12} /> 別の文面</button>
            <button style={btnPrimary()}><ThumbsUp size={14} /> このまま送信</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 14, background: "rgba(232,133,0,0.08)", border: `1px solid rgba(232,133,0,0.30)`, borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <AlertCircle size={18} color={C.warn} />
        <div style={{ fontSize: 12, color: C.t2 }}>
          発送期限: <b style={{ color: C.t1 }}>2026-05-13 23:59</b>（あと 2日）— ボタン1つで送り状を発行できます。
        </div>
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onNext} style={btnPrimary()}>
          <Printer size={16} /> 送り状を発行する <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function ChatBubble({ who, name, time, text }: { who: "buyer" | "ai-draft" | "you"; name: string; time: string; text: string }) {
  const isYou = who === "you" || who === "ai-draft";
  const bg = who === "buyer" ? C.bg1 : who === "ai-draft" ? "rgba(0,111,230,0.10)" : C.blue;
  const color = who === "you" ? "#fff" : C.t1;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isYou ? "flex-end" : "flex-start", marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: C.t3, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
        {who === "ai-draft" && <Bot size={10} color={C.blue} />}
        <b>{name}</b> · {time}
      </div>
      <div style={{ maxWidth: "78%", padding: "10px 14px", background: bg, color, borderRadius: 14, border: who === "buyer" ? `1px solid ${C.bd}` : "none", fontSize: 13, lineHeight: 1.6 }}>
        {text}
      </div>
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 14, background: C.bg2, border: `1px solid ${C.bdSub}`, borderRadius: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: C.t3 }}>{label}</span>
      <span style={{ color: color || C.t1, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Step 5: Ship (label generation)
// ─────────────────────────────────────────────────────────
function StepShip({ carrier, setCarrier, printing, onPrint }: {
  carrier: "yamato" | "sagawa" | "japanpost";
  setCarrier: (c: "yamato" | "sagawa" | "japanpost") => void;
  printing: boolean;
  onPrint: () => void;
}) {
  const s = SHIPPING_FEES[carrier];
  return (
    <div style={card()}>
      <SectionHeader icon={Truck} title="送り状を自動生成" sub="購入者情報を取り込み済み。印刷ボタン1つで貼るだけのラベルが出力されます。" />

      {/* Carrier picker */}
      <div style={{ marginTop: 14 }}>
        <Label>配送業者</Label>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {(Object.keys(SHIPPING_FEES) as Array<keyof typeof SHIPPING_FEES>).map(key => {
            const s = SHIPPING_FEES[key];
            const active = carrier === key;
            return (
              <button key={key} onClick={() => setCarrier(key)} style={{
                padding: "10px 16px",
                background: active ? "rgba(0,111,230,0.10)" : C.bg1,
                border: `1.5px solid ${active ? C.blue : C.bd}`,
                borderRadius: 999, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 13, fontWeight: 700, color: active ? C.blue : C.t2,
              }}>
                <span style={{ fontSize: 18 }}>{s.logo}</span> {s.name}
                <span style={{ fontSize: 11, fontWeight: 600, color: C.t3 }}>¥{s.fee}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Label preview */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 16 }}>
        <div style={{ padding: 22, background: "#fff", border: `2px solid ${C.t1}`, borderRadius: 8, fontFamily: "ui-monospace, Menlo, monospace", color: C.t1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `2px solid ${C.t1}`, paddingBottom: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{s.logo} {s.name}</div>
              <div style={{ fontSize: 11, color: C.t3 }}>送り状番号: 4321-8472-6193</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: C.t3 }}>サイズ</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{PRODUCT.size}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: C.t3, fontWeight: 700 }}>お届け先</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>〒150-0001</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>東京都渋谷区神宮前◯-◯-◯</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>高橋 ◯◯ 様</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.t3, fontWeight: 700 }}>ご依頼主</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>〒XXX-XXXX</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>あなたの登録住所</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>物販チェッカー 出品者</div>
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${C.t1}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: C.t3 }}>品名</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>腕時計（中古）</div>
              <div style={{ fontSize: 10, color: C.t3, marginTop: 6 }}>重量 {PRODUCT.weight}kg / 代引なし</div>
            </div>
            <div style={{ width: 80, height: 80, background: "#000", display: "grid", gridTemplateColumns: "repeat(8,1fr)", gridTemplateRows: "repeat(8,1fr)", gap: 1, padding: 2 }}>
              {/* deterministic QR-ish pattern */}
              {QR_PATTERN.map((on, i) => (
                <div key={i} style={{ background: on ? "#fff" : "#000" }} />
              ))}
            </div>
          </div>
        </div>

        {/* Action panel */}
        <div style={{ padding: 16, background: C.bg2, border: `1px solid ${C.bdSub}`, borderRadius: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t3, marginBottom: 12 }}>発送オプション</div>
          <ShipOption icon={Truck} title="集荷を予約" desc="ヤマトドライバーが自宅まで集荷" />
          <ShipOption icon={Store} title="コンビニ持ち込み" desc="セブンイレブン・ファミマで投函" />
          <ShipOption icon={Package} title="営業所持ち込み" desc="100円割引" />

          <button onClick={onPrint} disabled={printing} style={{
            ...btnPrimary(),
            width: "100%",
            marginTop: 14,
            justifyContent: "center",
            opacity: printing ? 0.7 : 1,
            cursor: printing ? "wait" : "pointer",
          }}>
            {printing ? <><Loader2 size={16} className="spin" /> 印刷中...</> : <><Printer size={16} /> 送り状を印刷 → 集荷予約</>}
          </button>
          <div style={{ marginTop: 8, fontSize: 11, color: C.t3, textAlign: "center" }}>印刷と同時にトラッキングを開始</div>
        </div>
      </div>
    </div>
  );
}

function ShipOption({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 10, marginBottom: 8, cursor: "pointer" }}>
      <input type="radio" name="ship-option" defaultChecked={title === "集荷を予約"} />
      <Icon size={16} color={C.blue} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{title}</div>
        <div style={{ fontSize: 10, color: C.t3 }}>{desc}</div>
      </div>
    </label>
  );
}

// ─────────────────────────────────────────────────────────
//  Step 6: Tracking
// ─────────────────────────────────────────────────────────
function StepTracking({ carrier, onNext }: { carrier: "yamato" | "sagawa" | "japanpost"; onNext: () => void }) {
  const s = SHIPPING_FEES[carrier];
  const events = [
    { time: "05/13 18:00", label: "集荷完了", at: "東京 / 出品者宅", done: true },
    { time: "05/13 22:30", label: "営業所通過（発送）", at: "ヤマト 渋谷支店", done: true },
    { time: "05/14 04:10", label: "配送中央センター到着", at: "東京 / 羽田ベース", done: true },
    { time: "05/14 09:45", label: "配達中", at: "ヤマト 渋谷配達センター", done: true },
    { time: "05/14 14:20", label: "配達完了", at: "受領印あり", done: true },
  ];

  return (
    <div style={card()}>
      <SectionHeader icon={MapPin} title="配送追跡" sub={`${s.name} のAPIから配送ステータスをリアルタイム取得`} />

      <div style={{ marginTop: 16, padding: 16, background: "rgba(30,156,60,0.08)", border: `1px solid rgba(30,156,60,0.30)`, borderRadius: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <CheckCircle2 size={24} color={C.up} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>配達完了</div>
          <div style={{ fontSize: 11, color: C.t3 }}>2026-05-14 14:20 / 受領者: 高橋 ◯◯ 様</div>
        </div>
        <span style={{ padding: "4px 10px", background: C.up, color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>DELIVERED</span>
      </div>

      <div style={{ marginTop: 18, position: "relative", paddingLeft: 22 }}>
        <div style={{ position: "absolute", left: 8, top: 6, bottom: 6, width: 2, background: C.up, opacity: 0.3 }} />
        {events.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i === events.length - 1 ? 0 : 16, position: "relative" }}>
            <div style={{ position: "absolute", left: -22, top: 4, width: 18, height: 18, borderRadius: 999, background: e.done ? C.up : C.bg2, border: `2px solid ${e.done ? C.up : C.bd}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {e.done && <CheckCircle2 size={10} color="#fff" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{e.label}</div>
                <div style={{ fontSize: 11, color: C.t3 }}>{e.time}</div>
              </div>
              <div style={{ fontSize: 11, color: C.t3 }}>{e.at}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Delivery photo + review preview */}
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "200px 1fr", gap: 14 }}>
        <div style={{ aspectRatio: "1", background: `linear-gradient(135deg, ${C.bg3}, ${C.bg2})`, border: `1px solid ${C.bdSub}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: C.t3 }}>
          <Camera size={32} />
          <div style={{ fontSize: 10, marginTop: 6, fontWeight: 700 }}>配達完了写真</div>
          <div style={{ fontSize: 9 }}>玄関先 / 14:20</div>
        </div>
        <div style={{ padding: 14, background: C.bg2, border: `1px solid ${C.bdSub}`, borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <ThumbsUp size={14} color={C.up} />
            <b style={{ color: C.t1, fontSize: 12 }}>24時間後に送信予定の評価依頼メッセージ</b>
          </div>
          <div style={{ padding: 12, background: C.bg1, borderRadius: 10, fontSize: 12, color: C.t2, lineHeight: 1.7, border: `1px solid ${C.bdSub}` }}>
            高橋様、無事にお手元に届きましたでしょうか？<br />
            今回はご購入いただきありがとうございました。<br />
            もしご満足いただけましたら、お手すきの際に評価をいただけますと幸いです 🙏
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: C.t3 }}>過去評価獲得率: <b style={{ color: C.up }}>87%</b> · 送信タイミング: 配達完了 +24h</div>
        </div>
      </div>

      <div style={{ marginTop: 12, padding: 12, background: C.bg2, borderRadius: 12, fontSize: 12, color: C.t2, display: "flex", alignItems: "center", gap: 8 }}>
        <Bot size={14} color={C.blue} />
        購入者へ「配達完了」自動メッセージを送信しました。
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onNext} style={btnPrimary()}>
          <BadgeJapaneseYen size={16} /> 利益を確定する <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Step 7: Done
// ─────────────────────────────────────────────────────────
function StepDone({ finalProfit, roi, channel }: { finalProfit: number; roi: number; channel: "eBay" | "yahoo" | "amazon" }) {
  const chLabel = channelLabel(channel);
  return (
    <div style={card({ padding: 0, overflow: "hidden" })}>
      <div style={{ padding: 28, background: `linear-gradient(135deg, ${C.up}, ${C.azure})`, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, opacity: 0.9 }}>
          <CheckCircle2 size={16} /> 完了 / 帳簿に自動記録されました
        </div>
        <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>このディール、最終利益</div>
        <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, marginTop: 4 }}>¥{finalProfit.toLocaleString()}</div>
        <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>ROI <b style={{ fontSize: 18 }}>{roi}%</b> / 仕入れから完了まで <b style={{ fontSize: 18 }}>7日</b></div>
      </div>

      <div style={{ padding: 22 }}>
        <SectionHeader icon={Star} title="自動記録された取引内訳" sub="売上履歴 / 利益計算 / 帳簿（freee連携）に同期済み" />

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <InfoBlock title="入金">
            <Row label="入金額" value={`¥${PRODUCT.estimatedSell.toLocaleString()}`} />
            <Row label="入金日" value="2026-05-21（予定）" />
            <Row label={`${chLabel}手数料`} value={`−¥${Math.round(PRODUCT.estimatedSell * (channel === "yahoo" ? 0.10 : channel === "eBay" ? 0.13 : 0.15)).toLocaleString()}`} color={C.dn} />
          </InfoBlock>
          <InfoBlock title="自動アクション">
            <Row label="売上履歴" value="✅ 記録済" color={C.up} />
            <Row label="在庫" value="✅ 1点減算" color={C.up} />
            <Row label="freee同期" value="✅ 仕訳済" color={C.up} />
          </InfoBlock>
        </div>

        {/* freee journal preview */}
        <div style={{ marginTop: 18, padding: 16, background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <FileSpreadsheet size={16} color={C.blue} />
            <b style={{ color: C.t1, fontSize: 13 }}>freee に自動記録された仕訳</b>
            <span style={{ marginLeft: "auto", fontSize: 10, color: C.up, fontWeight: 700 }}>✓ 同期済み</span>
          </div>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bg2 }}>
                <th style={th()}>日付</th>
                <th style={th()}>借方</th>
                <th style={th()}>貸方</th>
                <th style={{ ...th(), textAlign: "right" }}>金額</th>
                <th style={th()}>摘要</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={td()}>05/06</td><td style={td()}>商品</td><td style={td()}>現金</td><td style={tdR()}>¥4,200</td><td style={td()}>メルカリ仕入</td></tr>
              <tr><td style={td()}>05/13</td><td style={td()}>運賃</td><td style={td()}>現金</td><td style={tdR()}>¥{SHIPPING_FEES.yamato.fee.toLocaleString()}</td><td style={td()}>ヤマト送料</td></tr>
              <tr><td style={td()}>05/14</td><td style={td()}>売掛金</td><td style={td()}>売上</td><td style={tdR()}>¥{PRODUCT.estimatedSell.toLocaleString()}</td><td style={td()}>{chLabel}売却</td></tr>
              <tr><td style={td()}>05/14</td><td style={td()}>支払手数料</td><td style={td()}>売掛金</td><td style={tdR()}>¥{Math.round(PRODUCT.estimatedSell * (channel === "yahoo" ? 0.10 : channel === "eBay" ? 0.13 : 0.15)).toLocaleString()}</td><td style={td()}>{chLabel}手数料</td></tr>
            </tbody>
          </table>
        </div>

        {/* Tax estimate */}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: 14, background: "rgba(0,111,230,0.06)", border: `1px solid ${C.bdSub}`, borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, display: "flex", alignItems: "center", gap: 6 }}>
              <Calculator size={12} /> 確定申告 概算
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: C.t2, lineHeight: 1.8 }}>
              年間想定利益 ¥{(finalProfit * 60).toLocaleString()}<br />
              所得税概算 <b style={{ color: C.t1 }}>¥{Math.round(finalProfit * 60 * 0.10).toLocaleString()}</b> (税率10%想定)
            </div>
          </div>
          <div style={{ padding: 14, background: "rgba(30,156,60,0.06)", border: `1px solid ${C.bdSub}`, borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={12} /> 入金カレンダー
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: C.t2, lineHeight: 1.8 }}>
              次回入金 <b style={{ color: C.t1 }}>05/21（火）</b><br />
              今月の確定入金 <b style={{ color: C.up }}>¥{(PRODUCT.estimatedSell + 38400 + 21800).toLocaleString()}</b>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, padding: 16, background: C.bg2, borderRadius: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t3, marginBottom: 8 }}>🎯 AIが次に推奨する商品</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { name: "セイコー 5 SNK793", buy: 5200, sell: 14800, roi: 56 },
              { name: "シチズン Q&Q 中古", buy: 1800, sell: 6900, roi: 89 },
              { name: "カシオ MTP-1374", buy: 2400, sell: 7200, roi: 73 },
            ].map((p, i) => (
              <div key={i} style={{ padding: 10, background: C.bg1, border: `1px solid ${C.bdSub}`, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t1, lineHeight: 1.4 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: C.t3, marginTop: 4 }}>¥{p.buy.toLocaleString()} → ¥{p.sell.toLocaleString()}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.up, marginTop: 2 }}>ROI {p.roi}%</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <Link href="/sales" style={btnSecondary()}>
            <TrendingUp size={14} /> 売上履歴へ
          </Link>
          <Link href="/discover" style={btnPrimary()}>
            <Sparkles size={16} /> 次の利益商品をスキャン <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Pipeline summary at the bottom
// ─────────────────────────────────────────────────────────
function PipelineSummary() {
  const today = [
    { stage: "発見", count: 14, color: C.blue },
    { stage: "出品中", count: 23, color: C.azure },
    { stage: "売却", count: 4, color: C.up },
    { stage: "配送中", count: 6, color: C.warn },
    { stage: "完了", count: 3, color: C.up },
  ];
  return (
    <div style={card()}>
      <SectionHeader icon={Zap} title="あなたのパイプライン（今日）" sub="自動パイプライン全体の稼働状況" />
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {today.map(t => (
          <div key={t.stage} style={{ padding: 14, background: C.bg2, border: `1px solid ${C.bdSub}`, borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.t3, fontWeight: 700 }}>{t.stage}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: t.color, marginTop: 4 }}>{t.count}</div>
            <div style={{ fontSize: 10, color: C.t3 }}>件</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, background: "linear-gradient(135deg, rgba(0,111,230,0.06), rgba(30,156,60,0.06))", borderRadius: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: C.t3, fontWeight: 700 }}>今月の自動売上</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.t1 }}>¥482,400</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: C.t3, fontWeight: 700 }}>削減できた作業時間</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.up }}>32.5 時間</div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Small UI primitives
// ─────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(0,111,230,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} color={C.blue} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.t1 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function Sparkline({ values, highlight }: { values: number[]; highlight?: number }) {
  const w = 600, h = 80, pad = 4;
  const min = Math.min(...values), max = Math.max(...values);
  const range = Math.max(1, max - min);
  const xs = (i: number) => pad + (i * (w - pad * 2)) / (values.length - 1);
  const ys = (v: number) => h - pad - ((v - min) * (h - pad * 2)) / range;
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(v)}`).join(" ");
  const area = `${path} L ${xs(values.length - 1)} ${h - pad} L ${pad} ${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 80 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#006FE6" stopOpacity={0.30} />
          <stop offset="100%" stopColor="#006FE6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={path} fill="none" stroke="#006FE6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={xs(i)} cy={ys(v)} r={2} fill="#006FE6" />
      ))}
      {highlight && (
        <line x1={pad} x2={w - pad} y1={ys(highlight)} y2={ys(highlight)} stroke="#1E9C3C" strokeDasharray="4 4" strokeWidth={1.5} />
      )}
    </svg>
  );
}

function StatCard({ icon: Icon, title, value, sub }: { icon: React.ElementType; title: string; value: string; sub: string }) {
  return (
    <div style={{ padding: 14, background: C.bg2, border: `1px solid ${C.bdSub}`, borderRadius: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.t3 }}>
        <Icon size={12} />
        <span style={{ fontSize: 11, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: C.t1, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.t3 }}>{sub}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, letterSpacing: 0.3, textTransform: "uppercase" }}>{children}</div>;
}

function th(): React.CSSProperties {
  return { padding: "6px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.t3, borderBottom: `1px solid ${C.bd}` };
}
function td(): React.CSSProperties {
  return { padding: "6px 8px", borderBottom: `1px solid ${C.bdSub}`, color: C.t2 };
}
function tdR(): React.CSSProperties {
  return { ...td(), textAlign: "right", fontWeight: 700, color: C.t1, fontVariantNumeric: "tabular-nums" };
}
function channelLabel(c: "eBay" | "yahoo" | "amazon") {
  return c === "eBay" ? "eBay" : c === "yahoo" ? "ヤフオク" : "Amazon";
}

function btnPrimary(): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "10px 18px",
    background: C.blue, color: "#fff",
    border: "none", borderRadius: 999, fontSize: 13, fontWeight: 700,
    cursor: "pointer", textDecoration: "none",
    boxShadow: "0 4px 12px rgba(0,111,230,0.30)",
  };
}

function btnSecondary(): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 14px",
    background: C.bg1, color: C.t1,
    border: `1px solid ${C.bd}`, borderRadius: 999, fontSize: 12, fontWeight: 700,
    cursor: "pointer", textDecoration: "none",
  };
}
