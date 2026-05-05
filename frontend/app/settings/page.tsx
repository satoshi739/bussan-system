"use client";

import { useEffect, useState } from "react";
import { getSettings, saveSettings, testLineNotify, notifyStale, notifyDaily, getSourceSyncSettings, saveSourceSyncSettings, runSourceSyncNow } from "@/lib/api";
import { toast } from "@/components/Toast";
import { errMsg } from "@/lib/errors";
import { Bell, Send, AlertTriangle, Key, Globe, RefreshCw, Sparkles, Truck, ChevronDown, ChevronUp } from "lucide-react";

const card: React.CSSProperties = { background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, padding: "20px 24px" };
const inp: React.CSSProperties = { background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#F5F0E8", padding: "9px 12px", fontSize: 14, width: "100%", outline: "none", fontFamily: "monospace", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, color: "#8A8278", fontWeight: 600, display: "block", marginBottom: 6 };

export default function SettingsPage() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lineToken, setLineToken] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);

  // API連携設定（価格検索）
  const [anthropicKey, setAnthropicKey] = useState("");
  const [keepaApiKey, setKeepaApiKey] = useState("");
  const [ebayAppId, setEbayAppId] = useState("");
  const [amazonRefreshToken, setAmazonRefreshToken] = useState("");
  const [amazonLwaClientId, setAmazonLwaClientId] = useState("");
  const [amazonLwaClientSecret, setAmazonLwaClientSecret] = useState("");
  const [usdJpy, setUsdJpy] = useState("150");
  const [apiSaving, setApiSaving] = useState(false);
  const [apiSaved, setApiSaved] = useState(false);

  // 在庫連携・自動取り下げ API
  const [yahooAppId, setYahooAppId] = useState("");
  const [yahooSecret, setYahooSecret] = useState("");
  const [yahooAccessToken, setYahooAccessToken] = useState("");
  const [mercariToken, setMercariToken] = useState("");
  const [rakumaToken, setRakumaToken] = useState("");
  const [paypayToken, setPaypayToken] = useState("");
  const [syncSaving, setSyncSaving] = useState(false);
  const [syncSaved, setSyncSaved] = useState(false);
  const [sourceSyncEnabled, setSourceSyncEnabled] = useState(false);
  const [sourceSyncIntervalMin, setSourceSyncIntervalMin] = useState("15");
  const [sourceSyncThresholdPct, setSourceSyncThresholdPct] = useState("8");
  const [sourceSyncDeltaJpy, setSourceSyncDeltaJpy] = useState("300");
  const [sourceSyncActiveOnly, setSourceSyncActiveOnly] = useState(true);
  const [sourceSyncSaving, setSourceSyncSaving] = useState(false);
  const [sourceSyncRunning, setSourceSyncRunning] = useState(false);

  useEffect(() => {
    getSettings().then(s => {
      const t = s["line_token"] ?? "";
      setLineToken(t);
      setSavedToken(t);
      setAnthropicKey(s["anthropic_api_key"] ?? "");
      setKeepaApiKey(s["keepa_api_key"] ?? "");
      setEbayAppId(s["ebay_app_id"] ?? "");
      setAmazonRefreshToken(s["amazon_refresh_token"] ?? "");
      setAmazonLwaClientId(s["amazon_lwa_client_id"] ?? "");
      setAmazonLwaClientSecret(s["amazon_lwa_client_secret"] ?? "");
      setUsdJpy(s["usd_jpy"] ?? "150");
      setYahooAppId(s["yahoo_app_id"] ?? "");
      setYahooSecret(s["yahoo_secret"] ?? "");
      setYahooAccessToken(s["yahoo_access_token"] ?? "");
      setMercariToken(s["mercari_token"] ?? "");
      setRakumaToken(s["rakuma_token"] ?? "");
      setPaypayToken(s["paypay_token"] ?? "");
    }).catch(e => toast(errMsg(e), "error"));

    getSourceSyncSettings()
      .then((s) => {
        setSourceSyncEnabled(s.enabled);
        setSourceSyncIntervalMin(String(s.interval_min));
        setSourceSyncThresholdPct(String(s.price_rise_threshold_pct));
        setSourceSyncDeltaJpy(String(s.min_alert_delta_jpy));
        setSourceSyncActiveOnly(s.active_only);
      })
      .catch(() => {});
  }, []);

  const handleTest = async () => {
    if (!lineToken) { toast("トークンを入力してください", "error"); return; }
    setTesting(true);
    try {
      const r = await testLineNotify(lineToken);
      if (r.ok) {
        setSavedToken(lineToken);
        toast("LINEに接続しました！テストメッセージを送信しました");
      } else {
        const detail = r.error ?? "トークンを確認してください";
        toast(`送信に失敗しました\n→ ${detail}`, "error");
      }
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setTesting(false); }
  };

  const handleNotifyStale = async () => {
    setSending(true);
    try {
      const r = await notifyStale();
      if (!r.ok) {
        toast(r.error ? `LINE送信失敗\n→ ${r.error}` : "LINE送信に失敗しました", "error");
      } else if (r.msg === "売れ残りなし") {
        toast("売れ残り商品はありません", "info");
      } else {
        toast(`売れ残り${r.count}件をLINEに送信しました`);
      }
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setSending(false); }
  };

  const handleNotifyDaily = async () => {
    setSending(true);
    try {
      const r = await notifyDaily();
      if (!r.ok) {
        toast(r.error ? `LINE送信失敗\n→ ${r.error}` : "LINE送信に失敗しました", "error");
      } else {
        toast("日次レポートをLINEに送信しました");
      }
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setSending(false); }
  };

  const saveSyncSettings = async () => {
    setSyncSaving(true);
    try {
      await saveSettings({
        yahoo_app_id: yahooAppId.trim(),
        yahoo_secret: yahooSecret.trim(),
        yahoo_access_token: yahooAccessToken.trim(),
        mercari_token: mercariToken.trim(),
        rakuma_token: rakumaToken.trim(),
        paypay_token: paypayToken.trim(),
      });
      setSyncSaved(true);
      toast("在庫連携 API を保存しました");
      setTimeout(() => setSyncSaved(false), 3000);
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setSyncSaving(false); }
  };

  const saveSourceSync = async () => {
    setSourceSyncSaving(true);
    try {
      await saveSourceSyncSettings({
        enabled: sourceSyncEnabled,
        interval_min: Number(sourceSyncIntervalMin || 15),
        price_rise_threshold_pct: Number(sourceSyncThresholdPct || 8),
        min_alert_delta_jpy: Number(sourceSyncDeltaJpy || 300),
        active_only: sourceSyncActiveOnly,
      });
      toast("在庫・価格連動ルールを保存しました");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setSourceSyncSaving(false);
    }
  };

  const runSourceSync = async () => {
    setSourceSyncRunning(true);
    try {
      const r = await runSourceSyncNow();
      toast(`チェック完了（${r.checked}件 / 売り切れ${r.sold_out_detected}件 / 価格上昇${r.price_rise_detected}件）`);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setSourceSyncRunning(false);
    }
  };

  const saveApiSettings = async () => {
    setApiSaving(true);
    try {
      await saveSettings({
        anthropic_api_key: anthropicKey.trim(),
        keepa_api_key: keepaApiKey.trim(),
        ebay_app_id: ebayAppId.trim(),
        amazon_refresh_token: amazonRefreshToken.trim(),
        amazon_lwa_client_id: amazonLwaClientId.trim(),
        amazon_lwa_client_secret: amazonLwaClientSecret.trim(),
        usd_jpy: usdJpy,
      });
      setApiSaved(true);
      toast("API設定を保存しました");
      setTimeout(() => setApiSaved(false), 3000);
    } catch (e) { toast(errMsg(e), "error"); }
    finally { setApiSaving(false); }
  };

  return (
    <div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .settings-step:hover { border-color: rgba(212,175,55,0.38) !important; }
        .settings-step { transition: border-color 0.15s; }
        @media (max-width: 768px) {
          .settings-sync-grid { grid-template-columns: 1fr !important; }
          .settings-sync-grid2 { grid-template-columns: 1fr !important; }
          .settings-btn-group { flex-direction: column !important; }
          .settings-btn-group button { width: 100% !important; min-height: 44px; }
        }
      `}</style>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", margin: 0 }}>設定</h1>
      <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 16, marginTop: 3 }}>通知・連携の設定</div>

      {/* ── まずはサンプルで試せます ── */}
      <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", marginBottom: 6 }}>設定しなくてもサンプルで試せます</div>
        <div style={{ fontSize: 12, color: "#8A8278", lineHeight: 1.6 }}>設定は任意です。まずは下の手順でツールを試してみてください。</div>
      </div>

      {/* ── まずやること ── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#F5F0E8", marginBottom: 14 }}>まずやること</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {([
            ["①", "商品を検索する",   "利益スキャナーで気になる商品名を入力する", "/scanner"],
            ["②", "利益を確認する",   "仕入れ価格・想定利益・おすすめ度を確認する", "/scanner"],
            ["③", "良ければ保存する", "「仕入れ＆出品」ボタンで仕入れ管理に登録する", "/purchases"],
          ] as [string, string, string, string][]).map(([step, title, desc, href]) => (
            <a key={step} href={href} className="settings-step" style={{ textDecoration: "none", display: "flex", gap: 14, alignItems: "flex-start", background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#D4AF37", lineHeight: 1, flexShrink: 0, minWidth: 26 }}>{step}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#F5F0E8", marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 11, color: "#8A8278" }}>{desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600 }}>

        {/* LINE通知設定（常に表示） */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Bell size={16} color="#D4AF37" />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#C8C0B0" }}>LINE通知</span>
            {savedToken && <span style={{ fontSize: 11, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "2px 8px", color: "#D4AF37" }}>接続済み</span>}
          </div>
          <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 16 }}>
            LINE Notifyのトークンを設定すると、売れ残り警告や日次レポートをLINEで受け取れます。
          </div>

          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 12 }}>
            <div style={{ color: "#7deeaa", fontWeight: 700, marginBottom: 8 }}>トークンの取得方法</div>
            <div style={{ color: "#8A8278", lineHeight: 1.8 }}>
              1. <span style={{ color: "#66ccff" }}>notify-bot.line.me</span> にアクセス<br />
              2. LINEでログイン<br />
              3.「トークン生成」→ トークン名を入力<br />
              4. 通知先を「1:1でLINE Notifyから通知」を選択<br />
              5. 生成されたトークンをコピーして貼り付け
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>LINE Notify トークン</label>
            <input type="password" style={inp} value={lineToken} onChange={e => setLineToken(e.target.value)} placeholder="トークンを貼り付け..." />
          </div>
          <button onClick={handleTest} disabled={testing || !lineToken} style={{ width: "100%", background: "linear-gradient(135deg,#1e1608,#2a1e08)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, color: "#D4AF37", padding: "11px", fontWeight: 700, cursor: "pointer", fontSize: 14, opacity: testing || !lineToken ? 0.5 : 1 }}>
            {testing ? "送信中..." : "接続テスト（テストメッセージ送信）"}
          </button>
        </div>

        {/* 手動通知（LINE接続済みの場合のみ表示） */}
        {savedToken && (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Send size={16} color="#66ccff" />
              <span style={{ fontSize: 15, fontWeight: 700, color: "#C8C0B0" }}>手動通知</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={handleNotifyStale} disabled={sending} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(28,10,0,0.8)", border: "1px solid rgba(255,150,0,0.3)", borderRadius: 10, color: "#ffaa44", padding: "14px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                <AlertTriangle size={18} />
                <div style={{ textAlign: "left" }}>
                  <div>売れ残り警告を今すぐ送信</div>
                  <div style={{ fontSize: 11, fontWeight: 400, color: "#aa7733", marginTop: 2 }}>14日以上売れていない商品をLINEに通知</div>
                </div>
              </button>
              <button onClick={handleNotifyDaily} disabled={sending} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,20,40,0.8)", border: "1px solid rgba(100,200,255,0.2)", borderRadius: 10, color: "#66ccff", padding: "14px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                <Send size={18} />
                <div style={{ textAlign: "left" }}>
                  <div>日次レポートを今すぐ送信</div>
                  <div style={{ fontSize: 11, fontWeight: 400, color: "#4488aa", marginTop: 2 }}>今日の売上・今月累計・売れ残り数をLINEに通知</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── 詳細設定（折りたたみ） ── */}
        <div>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.18)", borderRadius: 10, color: "#8A8278", padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: showAdvanced ? 14 : 0 }}
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            詳細設定（プラットフォームAPI連携）
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 400 }}>任意 — 設定しなくても使えます</span>
          </button>
          {showAdvanced && <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── 在庫連携・自動取り下げ ── */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Truck size={16} color="#44ccaa" />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#C8C0B0" }}>在庫連携・自動取り下げ</span>
            {syncSaved && (
              <span style={{ fontSize: 11, background: "rgba(68,204,170,0.1)", border: "1px solid rgba(68,204,170,0.3)", borderRadius: 20, padding: "2px 8px", color: "#44ccaa" }}>保存済み</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 16 }}>
            APIを設定すると、一方のプラットフォームで売れた際に他プラットフォームの出品を自動取り下げできます。
          </div>

          {/* ヤフオク */}
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>🔨</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>ヤフオク API</span>
              {yahooAppId && yahooSecret && yahooAccessToken ? (
                <span style={{ fontSize: 11, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "2px 8px", color: "#D4AF37" }}>設定済み</span>
              ) : (
                <span style={{ fontSize: 11, background: "rgba(255,100,0,0.1)", border: "1px solid rgba(255,100,0,0.3)", borderRadius: 20, padding: "2px 8px", color: "#ff8844" }}>未設定</span>
              )}
              <span style={{ fontSize: 11, background: "rgba(68,204,170,0.1)", border: "1px solid rgba(68,204,170,0.3)", borderRadius: 20, padding: "2px 8px", color: "#44ccaa", marginLeft: "auto" }}>公式API対応</span>
            </div>
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 12 }}>
              <div style={{ color: "#7deeaa", fontWeight: 700, marginBottom: 6 }}>認証情報の取得方法</div>
              <div style={{ color: "#8A8278", lineHeight: 1.8 }}>
                1. <span style={{ color: "#66ccff" }}>developer.yahoo.co.jp</span> にアクセス<br />
                2. Yahoo! JAPAN ID でログイン →「アプリケーション管理」<br />
                3.「新しいアプリケーションを作成」→ アプリ種別「サーバーサイド」<br />
                4. Client ID / Client Secret を取得<br />
                5. OAuth 2.0 で Access Token を生成して以下に入力
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={lbl}>Client ID（App ID）</label>
                <input style={inp} type="password" value={yahooAppId} onChange={e => setYahooAppId(e.target.value)} placeholder="dj00aiZpPXh..." />
              </div>
              <div>
                <label style={lbl}>Client Secret</label>
                <input style={inp} type="password" value={yahooSecret} onChange={e => setYahooSecret(e.target.value)} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
              </div>
              <div>
                <label style={lbl}>Access Token</label>
                <input style={inp} type="password" value={yahooAccessToken} onChange={e => setYahooAccessToken(e.target.value)} placeholder="Bearer xxxxxxxx..." />
              </div>
            </div>
          </div>

          {/* Amazon SP-API（自動取り下げ用注釈） */}
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 12, border: "1px solid rgba(212,175,55,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>📦</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0" }}>Amazon SP-API</span>
              {amazonRefreshToken ? (
                <span style={{ fontSize: 11, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "2px 8px", color: "#D4AF37" }}>設定済み</span>
              ) : (
                <span style={{ fontSize: 11, background: "rgba(255,100,0,0.1)", border: "1px solid rgba(255,100,0,0.3)", borderRadius: 20, padding: "2px 8px", color: "#ff8844" }}>未設定</span>
              )}
              <span style={{ fontSize: 11, background: "rgba(68,204,170,0.1)", border: "1px solid rgba(68,204,170,0.3)", borderRadius: 20, padding: "2px 8px", color: "#44ccaa", marginLeft: "auto" }}>公式API対応</span>
            </div>
            <div style={{ fontSize: 12, color: "#8A8278", marginTop: 6 }}>
              下の「API連携設定」で設定済みの SP-API がそのまま自動取り下げにも使われます。
            </div>
          </div>

          {/* メルカリ */}
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>🛍️</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>メルカリ</span>
              {mercariToken ? (
                <span style={{ fontSize: 11, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "2px 8px", color: "#D4AF37" }}>設定済み</span>
              ) : (
                <span style={{ fontSize: 11, background: "rgba(100,100,100,0.15)", border: "1px solid rgba(100,100,100,0.3)", borderRadius: 20, padding: "2px 8px", color: "#8A8278" }}>未設定</span>
              )}
              <span style={{ fontSize: 11, background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.3)", borderRadius: 20, padding: "2px 8px", color: "#ffaa44", marginLeft: "auto" }}>公式API準備中</span>
            </div>
            <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 10, lineHeight: 1.7 }}>
              メルカリは現在、出品者向け公式APIの一般提供を準備中です。<br />
              API提供開始次第すぐに連携できるよう、将来用のトークン欄を用意しています。
            </div>
            <div>
              <label style={lbl}>APIトークン（取得後に入力）</label>
              <input style={{ ...inp, opacity: 0.6 }} type="password" value={mercariToken} onChange={e => setMercariToken(e.target.value)} placeholder="公式APIが公開されたら入力..." />
            </div>
          </div>

          {/* ラクマ */}
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>🎀</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>ラクマ</span>
              {rakumaToken ? (
                <span style={{ fontSize: 11, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "2px 8px", color: "#D4AF37" }}>設定済み</span>
              ) : (
                <span style={{ fontSize: 11, background: "rgba(100,100,100,0.15)", border: "1px solid rgba(100,100,100,0.3)", borderRadius: 20, padding: "2px 8px", color: "#8A8278" }}>未設定</span>
              )}
              <span style={{ fontSize: 11, background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.3)", borderRadius: 20, padding: "2px 8px", color: "#ffaa44", marginLeft: "auto" }}>公式API準備中</span>
            </div>
            <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 10 }}>ラクマ（楽天）の出品者向け公式APIが公開され次第、自動連携に対応します。</div>
            <div>
              <label style={lbl}>APIトークン（取得後に入力）</label>
              <input style={{ ...inp, opacity: 0.6 }} type="password" value={rakumaToken} onChange={e => setRakumaToken(e.target.value)} placeholder="公式APIが公開されたら入力..." />
            </div>
          </div>

          {/* PayPayフリマ */}
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>💴</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>PayPayフリマ</span>
              {paypayToken ? (
                <span style={{ fontSize: 11, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "2px 8px", color: "#D4AF37" }}>設定済み</span>
              ) : (
                <span style={{ fontSize: 11, background: "rgba(100,100,100,0.15)", border: "1px solid rgba(100,100,100,0.3)", borderRadius: 20, padding: "2px 8px", color: "#8A8278" }}>未設定</span>
              )}
              <span style={{ fontSize: 11, background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.3)", borderRadius: 20, padding: "2px 8px", color: "#ffaa44", marginLeft: "auto" }}>公式API準備中</span>
            </div>
            <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 10 }}>PayPayフリマの出品者向け公式APIが公開され次第、自動連携に対応します。</div>
            <div>
              <label style={lbl}>APIトークン（取得後に入力）</label>
              <input style={{ ...inp, opacity: 0.6 }} type="password" value={paypayToken} onChange={e => setPaypayToken(e.target.value)} placeholder="公式APIが公開されたら入力..." />
            </div>
          </div>

          <button
            onClick={saveSyncSettings}
            disabled={syncSaving}
            style={{ width: "100%", background: syncSaving ? "rgba(68,204,170,0.05)" : "linear-gradient(135deg,#003d30,#005040)", border: "1px solid rgba(68,204,170,0.4)", borderRadius: 8, color: "#44ccaa", padding: "11px", fontWeight: 700, cursor: syncSaving ? "not-allowed" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {syncSaving ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> 保存中...</> : <><Truck size={14} /> 在庫連携APIを保存</>}
          </button>

          <div style={{ marginTop: 14, borderTop: "1px solid rgba(212,175,55,0.12)", paddingTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: "#C8C0B0", fontWeight: 700 }}>自動在庫・価格連動ルール</div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#8A8278" }}>
                <input type="checkbox" checked={sourceSyncEnabled} onChange={e => setSourceSyncEnabled(e.target.checked)} />
                有効化
              </label>
            </div>

            <div className="settings-sync-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={lbl}>監視間隔（分）</label>
                <input style={inp} type="number" min="3" max="120" value={sourceSyncIntervalMin} onChange={e => setSourceSyncIntervalMin(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>価格上昇しきい値（%）</label>
                <input style={inp} type="number" min="1" max="50" value={sourceSyncThresholdPct} onChange={e => setSourceSyncThresholdPct(e.target.value)} />
              </div>
            </div>
            <div className="settings-sync-grid2" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end", marginBottom: 12 }}>
              <div>
                <label style={lbl}>最低上昇額（円）</label>
                <input style={inp} type="number" min="50" value={sourceSyncDeltaJpy} onChange={e => setSourceSyncDeltaJpy(e.target.value)} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#8A8278" }}>
                <input type="checkbox" checked={sourceSyncActiveOnly} onChange={e => setSourceSyncActiveOnly(e.target.checked)} />
                出品中のみ監視
              </label>
            </div>

            <div className="settings-btn-group" style={{ display: "flex", gap: 8 }}>
              <button
                onClick={saveSourceSync}
                disabled={sourceSyncSaving}
                style={{ flex: 1, background: "linear-gradient(135deg,#17222a,#1f3240)", border: "1px solid rgba(100,170,255,0.4)", borderRadius: 8, color: "#66aaff", padding: "10px", fontWeight: 700, cursor: sourceSyncSaving ? "not-allowed" : "pointer", fontSize: 13 }}
              >
                {sourceSyncSaving ? "保存中..." : "連動ルールを保存"}
              </button>
              <button
                onClick={runSourceSync}
                disabled={sourceSyncRunning}
                style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 8, color: "#D4AF37", padding: "10px 12px", fontWeight: 700, cursor: sourceSyncRunning ? "not-allowed" : "pointer", fontSize: 13 }}
              >
                {sourceSyncRunning ? "実行中..." : "今すぐ確認"}
              </button>
            </div>
          </div>
        </div>

        {/* ── API連携設定 ── */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Key size={16} color="#66aaff" />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#C8C0B0" }}>API連携設定</span>
            {apiSaved && (
              <span style={{ fontSize: 11, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "2px 8px", color: "#D4AF37" }}>保存済み</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 16 }}>
            各プラットフォームのAPIキーを設定すると、リアルタイム価格検索が使えます。
          </div>

          {/* Anthropic (Claude AI) */}
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Sparkles size={15} color="#aa88ff" />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>Claude AI（商品分析）</span>
              {anthropicKey ? (
                <span style={{ fontSize: 11, background: "rgba(170,136,255,0.15)", border: "1px solid rgba(170,136,255,0.4)", borderRadius: 20, padding: "2px 8px", color: "#aa88ff" }}>設定済み</span>
              ) : (
                <span style={{ fontSize: 11, background: "rgba(255,100,0,0.1)", border: "1px solid rgba(255,100,0,0.3)", borderRadius: 20, padding: "2px 8px", color: "#ff8844" }}>未設定</span>
              )}
            </div>
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 12 }}>
              <div style={{ color: "#c0a8ff", fontWeight: 700, marginBottom: 6 }}>APIキーの取得方法（無料枠あり）</div>
              <div style={{ color: "#8A8278", lineHeight: 1.8 }}>
                1. <span style={{ color: "#66ccff" }}>console.anthropic.com</span> にアクセス<br />
                2. アカウント登録（無料）<br />
                3.「API Keys」→「Create Key」<br />
                4. 生成されたキー（sk-ant-...）をコピーして貼り付け
              </div>
            </div>
            <label style={lbl}>Anthropic API Key</label>
            <input style={inp} type="password" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} placeholder="sk-ant-api03-..." />
            <div style={{ fontSize: 11, color: "#8A8278", marginTop: 6 }}>
              設定すると利益スキャナーで「AI分析」ボタンが使えるようになります
            </div>
          </div>

          {/* Keepa */}
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>Keepa API（Amazon価格精度向上）</span>
              {keepaApiKey ? (
                <span style={{ fontSize: 11, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "2px 8px", color: "#D4AF37" }}>設定済み</span>
              ) : (
                <span style={{ fontSize: 11, background: "rgba(255,100,0,0.1)", border: "1px solid rgba(255,100,0,0.3)", borderRadius: 20, padding: "2px 8px", color: "#ff8844" }}>未設定</span>
              )}
            </div>
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 12 }}>
              <div style={{ color: "#7deeaa", fontWeight: 700, marginBottom: 6 }}>APIキーの取得方法（月$19〜）</div>
              <div style={{ color: "#8A8278", lineHeight: 1.8 }}>
                1. <span style={{ color: "#66ccff" }}>keepa.com</span> にアクセス・アカウント登録<br />
                2.「API Access」プランを購入（月$19〜）<br />
                3. ダッシュボード →「API Key」をコピー<br />
                4. 設定するとAmazon価格がCAPTCHAなく安定取得できます
              </div>
            </div>
            <label style={lbl}>Keepa API Key</label>
            <input style={inp} type="password" value={keepaApiKey} onChange={e => setKeepaApiKey(e.target.value)} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
            <div style={{ fontSize: 11, color: "#8A8278", marginTop: 6 }}>
              未設定時はAmazonスクレイピング（不安定）にフォールバックします
            </div>
          </div>

          {/* eBay */}
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>🌏</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>eBay Finding API</span>
              {ebayAppId ? (
                <span style={{ fontSize: 11, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "2px 8px", color: "#D4AF37" }}>設定済み</span>
              ) : (
                <span style={{ fontSize: 11, background: "rgba(255,100,0,0.1)", border: "1px solid rgba(255,100,0,0.3)", borderRadius: 20, padding: "2px 8px", color: "#ff8844" }}>未設定</span>
              )}
            </div>
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 12 }}>
              <div style={{ color: "#7deeaa", fontWeight: 700, marginBottom: 6 }}>App IDの取得方法（無料）</div>
              <div style={{ color: "#8A8278", lineHeight: 1.8 }}>
                1. <span style={{ color: "#66ccff" }}>developer.ebay.com</span> にアクセス<br />
                2. 無料アカウント登録<br />
                3.「Create Application」→ アプリ名を入力<br />
                4.「Sandbox」または「Production」の App ID をコピー<br />
                5. 下のフォームに貼り付けて保存
              </div>
            </div>
            <label style={lbl}>App ID（Client ID）</label>
            <input
              style={inp}
              type="password"
              value={ebayAppId}
              onChange={e => setEbayAppId(e.target.value)}
              placeholder="例: YourName-AppName-PRD-xxxxxxx-xxxxxxxx"
            />
          </div>

          {/* Amazon SP-API */}
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>📦</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>Amazon SP-API（価格検索）</span>
              {amazonRefreshToken ? (
                <span style={{ fontSize: 11, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "2px 8px", color: "#D4AF37" }}>設定済み</span>
              ) : (
                <span style={{ fontSize: 11, background: "rgba(255,100,0,0.1)", border: "1px solid rgba(255,100,0,0.3)", borderRadius: 20, padding: "2px 8px", color: "#ff8844" }}>未設定</span>
              )}
            </div>
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 12 }}>
              <div style={{ color: "#7deeaa", fontWeight: 700, marginBottom: 6 }}>SP-API認証情報の取得方法</div>
              <div style={{ color: "#8A8278", lineHeight: 1.8 }}>
                1. <span style={{ color: "#66ccff" }}>sellercentral.amazon.co.jp</span> にログイン<br />
                2.「アプリと連携」→「デベロッパートークン」→「SP-APIに登録」<br />
                3. LWA Client ID / Client Secret を取得<br />
                4. Refresh Token（リフレッシュトークン）を生成<br />
                5. 以下3つのフィールドに入力して保存
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={lbl}>LWA Client ID</label>
                <input style={inp} type="password" value={amazonLwaClientId} onChange={e => setAmazonLwaClientId(e.target.value)} placeholder="amzn1.application-oa2-client.xxxxxxxx" />
              </div>
              <div>
                <label style={lbl}>LWA Client Secret</label>
                <input style={inp} type="password" value={amazonLwaClientSecret} onChange={e => setAmazonLwaClientSecret(e.target.value)} placeholder="amzn1.oa2-cs.v1.xxxxxxxx" />
              </div>
              <div>
                <label style={lbl}>Refresh Token</label>
                <input style={inp} type="password" value={amazonRefreshToken} onChange={e => setAmazonRefreshToken(e.target.value)} placeholder="Atzr|xxxxxxxx" />
              </div>
            </div>
          </div>

          {/* 為替レート */}
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Globe size={15} color="#66ccff" />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>為替レート（手動設定）</span>
              <span style={{ fontSize: 11, color: "#8A8278" }}>※ 自動取得が失敗した場合のフォールバック</span>
            </div>
            <label style={lbl}>USD/JPY レート（1ドル = 何円）</label>
            <input
              style={{ ...inp, maxWidth: 200 }}
              type="number"
              value={usdJpy}
              onChange={e => setUsdJpy(e.target.value)}
              placeholder="150"
              min="100"
              max="200"
            />
            <div style={{ fontSize: 11, color: "#8A8278", marginTop: 6 }}>
              為替レートはfrankfurter.app（無料）から自動取得されます。取得失敗時にこの値が使われます。
            </div>
          </div>

          <button
            onClick={saveApiSettings}
            disabled={apiSaving}
            style={{ width: "100%", background: apiSaving ? "rgba(212,175,55,0.05)" : "linear-gradient(135deg,#003d5f,#00508a)", border: "1px solid rgba(100,170,255,0.4)", borderRadius: 8, color: "#66aaff", padding: "11px", fontWeight: 700, cursor: apiSaving ? "not-allowed" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {apiSaving ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> 保存中...</> : <><Key size={14} /> API設定を保存</>}
          </button>
        </div>

          </div>}
        </div>

      </div>

    </div>
  );
}
