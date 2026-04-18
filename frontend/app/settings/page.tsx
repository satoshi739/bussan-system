"use client";

import { useEffect, useState } from "react";
import { getSettings, testLineNotify, notifyStale, notifyDaily } from "@/lib/api";
import { toast } from "@/components/Toast";
import { Bell, Send, AlertTriangle, Key, Globe, RefreshCw, Sparkles } from "lucide-react";

const BASE = "http://localhost:8000";
const card: React.CSSProperties = { background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, padding: "20px 24px" };
const inp: React.CSSProperties = { background: "rgba(10,10,11,0.95)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#F5F0E8", padding: "9px 12px", fontSize: 14, width: "100%", outline: "none", fontFamily: "monospace", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, color: "#8A8278", fontWeight: 600, display: "block", marginBottom: 6 };

export default function SettingsPage() {
  const [lineToken, setLineToken] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);

  // API連携設定
  const [anthropicKey, setAnthropicKey] = useState("");
  const [ebayAppId, setEbayAppId] = useState("");
  const [amazonRefreshToken, setAmazonRefreshToken] = useState("");
  const [amazonLwaClientId, setAmazonLwaClientId] = useState("");
  const [amazonLwaClientSecret, setAmazonLwaClientSecret] = useState("");
  const [usdJpy, setUsdJpy] = useState("150");
  const [apiSaving, setApiSaving] = useState(false);
  const [apiSaved, setApiSaved] = useState(false);

  useEffect(() => {
    getSettings().then(s => {
      const t = s["line_token"] ?? "";
      setLineToken(t);
      setSavedToken(t);
      setAnthropicKey(s["anthropic_api_key"] ?? "");
      setEbayAppId(s["ebay_app_id"] ?? "");
      setAmazonRefreshToken(s["amazon_refresh_token"] ?? "");
      setAmazonLwaClientId(s["amazon_lwa_client_id"] ?? "");
      setAmazonLwaClientSecret(s["amazon_lwa_client_secret"] ?? "");
      setUsdJpy(s["usd_jpy"] ?? "150");
    }).catch(console.error);
  }, []);

  const handleTest = async () => {
    if (!lineToken) { toast("トークンを入力してください", "error"); return; }
    setTesting(true);
    try {
      const r = await testLineNotify(lineToken);
      if (r.ok) {
        setSavedToken(lineToken);
        toast("LINEに接続しました！テストメッセージを送信しました ✅");
      } else {
        toast("送信に失敗しました。トークンを確認してください", "error");
      }
    } catch { toast("エラーが発生しました", "error"); }
    finally { setTesting(false); }
  };

  const handleNotifyStale = async () => {
    setSending(true);
    try {
      const r = await notifyStale();
      if (r.msg === "売れ残りなし") toast("売れ残り商品はありません", "info");
      else toast(`売れ残り${r.count}件をLINEに送信しました`);
    } catch { toast("LINEトークンが設定されていません。先に接続してください", "error"); }
    finally { setSending(false); }
  };

  const handleNotifyDaily = async () => {
    setSending(true);
    try {
      await notifyDaily();
      toast("日次レポートをLINEに送信しました");
    } catch { toast("LINEトークンが設定されていません。先に接続してください", "error"); }
    finally { setSending(false); }
  };

  const saveApiSettings = async () => {
    setApiSaving(true);
    try {
      await fetch(`${BASE}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anthropic_api_key: anthropicKey.trim(),
          ebay_app_id: ebayAppId.trim(),
          amazon_refresh_token: amazonRefreshToken.trim(),
          amazon_lwa_client_id: amazonLwaClientId.trim(),
          amazon_lwa_client_secret: amazonLwaClientSecret.trim(),
          usd_jpy: usdJpy,
        }),
      });
      setApiSaved(true);
      toast("API設定を保存しました ✅");
      setTimeout(() => setApiSaved(false), 3000);
    } catch { toast("保存に失敗しました", "error"); }
    finally { setApiSaving(false); }
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", marginBottom: 6 }}>設定</h1>
      <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 24 }}>通知・API連携の設定</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600 }}>

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

        {/* LINE通知設定 */}
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

        {/* 手動通知 */}
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
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
