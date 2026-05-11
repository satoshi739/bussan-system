"use client";

import { useEffect, useState } from "react";
import { Mic, X, Sparkles } from "lucide-react";

const SAMPLE_QUERIES = [
  "今月の利益は？",
  "在庫の合計金額は？",
  "次に仕入れるべきは？",
  "ヤフオクで一番売れてる商品は？",
];

const SAMPLE_RESPONSES: Record<string, string> = {
  "今月の利益は？":          "今月の純利益は ¥98,400 です。先月比 +18.4% です。",
  "在庫の合計金額は？":      "現在の在庫評価額は ¥52,000、8点あります。",
  "次に仕入れるべきは？":    "ROI 61% のセイコー腕時計シリーズが14件見つかっています。",
  "ヤフオクで一番売れてる商品は？": "腕時計カテゴリが最も売れています。月7件、平均利益 ¥6,114 です。",
};

export default function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");

  // Cycle sample queries while listening
  useEffect(() => {
    if (!listening) return;
    let i = 0;
    const startTimer = setTimeout(() => setQuery(SAMPLE_QUERIES[0]), 0);
    const interval = setInterval(() => {
      i = (i + 1) % SAMPLE_QUERIES.length;
      setQuery(SAMPLE_QUERIES[i]);
    }, 900);
    const stopTimer = setTimeout(() => {
      setListening(false);
      const finalQ = SAMPLE_QUERIES[i];
      setQuery(finalQ);
      setResponse(SAMPLE_RESPONSES[finalQ] ?? "うまく聞き取れませんでした。もう一度お試しください。");
    }, 2400);
    return () => { clearTimeout(startTimer); clearInterval(interval); clearTimeout(stopTimer); };
  }, [listening]);

  const startListen = () => {
    setResponse("");
    setListening(true);
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => { setOpen(true); setQuery(""); setResponse(""); }}
        aria-label="音声アシスタント"
        style={{
          position: "fixed", bottom: 88, right: 24, zIndex: 50,
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #006FE6, #40AADF)",
          border: "none", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,111,230,0.40), 0 1px 2px rgba(0,0,0,0.10)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <Mic size={22} />
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9998,
            background: "rgba(8,13,28,0.55)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
            animation: "va-fade-in 0.2s ease-out",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 480,
            background: "rgba(255,255,255,0.98)",
            borderRadius: 28,
            padding: "32px 28px 24px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.30)",
            animation: "va-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            position: "relative",
          }}>
            <button onClick={() => setOpen(false)} style={{
              position: "absolute", top: 16, right: 16,
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><X size={16} color="rgba(8,13,28,0.55)" /></button>

            <div style={{ textAlign: "center" }}>
              {/* Microphone visual */}
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 18, position: "relative", width: 96, height: 96 }}>
                {listening && (
                  <>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid #006FE6", animation: "va-pulse 1.4s ease-out infinite" }} />
                    <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "2px solid #40AADF", animation: "va-pulse 1.4s ease-out infinite 0.3s" }} />
                  </>
                )}
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: listening
                    ? "linear-gradient(135deg, #006FE6, #40AADF)"
                    : "linear-gradient(135deg, #1a2956, #4A77A8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 10px 30px rgba(0,111,230,0.35)",
                }}>
                  <Mic size={32} color="#fff" />
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, color: "#006FE6", letterSpacing: "0.12em", marginBottom: 8 }}>
                {listening ? "LISTENING..." : response ? "RESPONSE" : "VOICE ASSISTANT"}
              </div>

              {listening ? (
                <div style={{ fontSize: 20, fontWeight: 700, color: "#080D1C", minHeight: 60, letterSpacing: "-0.01em" }}>
                  「{query}」
                </div>
              ) : response ? (
                <>
                  <div style={{ fontSize: 14, color: "rgba(8,13,28,0.55)", marginBottom: 8 }}>「{query}」</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#080D1C", lineHeight: 1.5, letterSpacing: "-0.01em" }}>{response}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#080D1C", marginBottom: 8, letterSpacing: "-0.01em" }}>何でも聞いてください</div>
                  <div style={{ fontSize: 13, color: "rgba(8,13,28,0.55)", lineHeight: 1.6 }}>
                    利益・在庫・売上のことなら音声で即回答。<br/>下のボタンを押して話しかけてください。
                  </div>
                </>
              )}

              {/* Sample queries (when idle) */}
              {!listening && !response && (
                <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {SAMPLE_QUERIES.slice(0, 3).map(q => (
                    <span key={q} style={{
                      padding: "6px 12px", background: "rgba(0,0,0,0.04)",
                      borderRadius: 999, fontSize: 11, color: "rgba(8,13,28,0.75)", fontWeight: 500,
                    }}>{q}</span>
                  ))}
                </div>
              )}

              {/* Action button */}
              <button
                onClick={startListen}
                disabled={listening}
                style={{
                  marginTop: 24,
                  padding: "14px 32px",
                  background: listening ? "rgba(0,0,0,0.06)" : "#080D1C",
                  color: listening ? "rgba(8,13,28,0.55)" : "#fff",
                  border: "none", borderRadius: 999, fontSize: 14, fontWeight: 700,
                  cursor: listening ? "default" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 8,
                  letterSpacing: "-0.01em",
                }}
              >
                {listening ? "聞いています..." : response ? "もう一度聞く" : "話しかける"}
              </button>
            </div>

            <div style={{ marginTop: 20, padding: "10px 14px", background: "rgba(201,169,107,0.08)", borderRadius: 12, fontSize: 10, color: "rgba(8,13,28,0.55)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Sparkles size={11} color="#C9A96B" />
              Beta機能 / 音声認識精度は今後改善されます
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes va-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes va-slide-in { from { opacity: 0; transform: translateY(20px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes va-pulse {
          0% { transform: scale(1); opacity: 0.6 }
          100% { transform: scale(1.4); opacity: 0 }
        }
      `}</style>
    </>
  );
}
