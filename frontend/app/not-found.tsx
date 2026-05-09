import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#07101f",
      padding: 24,
      gap: 16,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 48, fontWeight: 900, color: "rgba(201,169,107,0.25)", fontFamily: "monospace" }}>404</div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f5f1e8", margin: 0 }}>
        ページが見つかりません
      </h2>
      <p style={{ fontSize: 13, color: "#8a9ab8", margin: 0, maxWidth: 360, lineHeight: 1.7 }}>
        URLが間違っているか、ページが削除された可能性があります。
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          background: "linear-gradient(135deg,#0a1530,#111e44)",
          border: "1px solid rgba(201,169,107,0.45)",
          borderRadius: 10,
          color: "#c9a96b",
          padding: "11px 28px",
          fontSize: 14,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        ホームに戻る
      </Link>
    </div>
  );
}
