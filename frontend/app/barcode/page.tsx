"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Product = { name: string; price: number; url: string };
type LookupResult = { found: boolean; code: string; name?: string; price?: number; products: Product[] };

const card: React.CSSProperties = { background: "rgba(20,20,22,0.9)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, padding: "20px 24px" };

export default function BarcodePage() {
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<{ clear: () => Promise<void>; render: (success: (text: string) => void, error: (err: string) => void) => void } | null>(null);

  const stopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => () => stopScan(), []);

  const startScan = async () => {
    setScanning(true);
    setCode(null);
    setResult(null);
    setError(null);

    const { Html5QrcodeScanner } = await import("html5-qrcode");

    // 少し待ってDOMが確実にあることを保証
    await new Promise(r => setTimeout(r, 100));

    try {
      scannerRef.current = new Html5QrcodeScanner(
        "barcode-reader",
        { fps: 10, qrbox: { width: 280, height: 140 }, rememberLastUsedCamera: true },
        false
      );
      scannerRef.current.render(
        async (decodedText: string) => {
          stopScan();
          setCode(decodedText);
          setLoading(true);
          try {
            const r = await fetch(`/api/proxy/api/barcode/lookup?code=${encodeURIComponent(decodedText)}`);
            const data = await r.json();
            setResult(data);
          } catch {
            setError("商品情報の取得に失敗しました");
          } finally {
            setLoading(false);
          }
        },
        () => {}
      );
    } catch {
      setError("カメラを起動できませんでした。ブラウザのカメラ許可を確認してください。");
      setScanning(false);
    }
  };

  const reset = () => {
    setCode(null);
    setResult(null);
    setError(null);
  };

  return (
    <div style={{ color: "#F5F0E8" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5F0E8", marginBottom: 6 }}>バーコードスキャン</h1>
      <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 20 }}>商品のバーコードをカメラで読み取って即座に利益計算</div>

      {/* 使い方 */}
      {!scanning && !code && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#D4AF37", marginBottom: 12 }}>使い方</div>
            {[
              ["📷", "「カメラを起動する」をタップ"],
              ["🔍", "商品のバーコード（JAN/EAN）にカメラを向ける"],
              ["📊", "商品名・価格が表示されたら「利益計算へ」"],
            ].map(([emoji, text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, fontSize: 13, color: "#C8C0B0" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>
                {text}
              </div>
            ))}
          </div>

          <button
            onClick={startScan}
            style={{ background: "linear-gradient(135deg,#1E1608,#2A1E08)", border: "1px solid rgba(212,175,55,0.6)", borderRadius: 12, color: "#D4AF37", padding: "18px 24px", fontSize: 16, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}
          >
            <span style={{ fontSize: 24 }}>📷</span>
            カメラを起動する
          </button>

          <div style={{ ...card, fontSize: 12, color: "#8A8278" }}>
            <span style={{ color: "#D4AF37", fontWeight: 700 }}>対応バーコード:</span> JANコード (EAN-13/8)、UPC、QRコード
          </div>
        </div>
      )}

      {/* スキャン中 */}
      {scanning && (
        <div style={{ maxWidth: 480 }}>
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "#8A8278", marginBottom: 12, textAlign: "center" }}>
              バーコードをフレーム内に合わせてください
            </div>
            <div id="barcode-reader" style={{ borderRadius: 8, overflow: "hidden" }} />
          </div>
          <button
            onClick={stopScan}
            style={{ width: "100%", background: "rgba(255,100,100,0.08)", border: "1px solid rgba(255,100,100,0.3)", borderRadius: 10, color: "#ff8888", padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            キャンセル
          </button>
        </div>
      )}

      {/* 読み取り中 */}
      {loading && (
        <div style={{ ...card, maxWidth: 480, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ color: "#D4AF37", fontWeight: 700 }}>商品情報を検索中...</div>
          <div style={{ fontSize: 12, color: "#8A8278", marginTop: 8 }}>バーコード: {code}</div>
        </div>
      )}

      {/* エラー */}
      {error && !loading && (
        <div style={{ maxWidth: 480 }}>
          <div style={{ ...card, borderColor: "rgba(255,100,100,0.3)", marginBottom: 12 }}>
            <div style={{ color: "#ff8888", fontWeight: 700, marginBottom: 8 }}>⚠️ {error}</div>
            {code && <div style={{ fontSize: 12, color: "#8A8278" }}>読み取ったコード: {code}</div>}
          </div>
          <button onClick={reset} style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10, color: "#D4AF37", padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            もう一度スキャン
          </button>
        </div>
      )}

      {/* 結果 */}
      {result && !loading && (
        <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={card}>
            <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 4 }}>読み取りコード</div>
            <div style={{ fontSize: 14, fontFamily: "monospace", color: "#D4AF37", marginBottom: 16 }}>{result.code}</div>

            {result.found ? (
              <>
                <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 4 }}>商品名</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#F5F0E8", marginBottom: 12, lineHeight: 1.5 }}>{result.name}</div>
                {result.price && result.price > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: "#8A8278", marginBottom: 4 }}>参考価格（Amazon）</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#66ccff", fontFamily: "monospace", marginBottom: 16 }}>¥{result.price.toLocaleString()}</div>
                  </>
                )}
                <Link
                  href={`/calculator${result.price ? `?selling_price=${result.price}` : ""}`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg,#1E1608,#2A1E08)", border: "1px solid rgba(212,175,55,0.6)", borderRadius: 10, color: "#D4AF37", padding: "14px 20px", fontSize: 14, fontWeight: 800, textDecoration: "none" }}
                >
                  📊 利益計算へ →
                </Link>
              </>
            ) : (
              <div style={{ color: "#ff9966", fontSize: 13, marginBottom: 12 }}>
                商品情報が見つかりませんでした。手動で商品名を検索してください。
              </div>
            )}
          </div>

          {result.found && result.products.length > 1 && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#C8C0B0", marginBottom: 10 }}>関連商品</div>
              {result.products.slice(1).map((p, i) => (
                <a key={i} href={p.url} target="_blank" rel="noreferrer" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(212,175,55,0.08)", textDecoration: "none" }}>
                  <span style={{ fontSize: 12, color: "#C8C0B0", flex: 1, paddingRight: 8 }}>{p.name.slice(0, 40)}</span>
                  <span style={{ fontSize: 12, color: "#66ccff", fontFamily: "monospace", flexShrink: 0 }}>¥{p.price.toLocaleString()}</span>
                </a>
              ))}
            </div>
          )}

          <button onClick={reset} style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 10, color: "#8A8278", padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            別の商品をスキャン
          </button>
        </div>
      )}
    </div>
  );
}
