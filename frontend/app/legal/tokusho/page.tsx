import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "特定商取引法に基づく表記" };

const ROWS = [
  ["販売業者", "株式会社ユニバースプラネットジャパン"],
  ["運営統括責任者", "Satoshi"],
  ["所在地", "請求があり次第、遅滞なく開示いたします"],
  ["電話番号", "請求があり次第、遅滞なく開示いたします"],
  ["メールアドレス", "support@upjapan.co.jp"],
  ["サービスURL", "https://app.upjapan.co.jp"],
  ["販売価格", "各プランページに表示の税込価格"],
  ["支払方法", "クレジットカード（Stripe）"],
  ["支払時期", "お申し込み時に初回課金。以降毎月同日に自動更新"],
  ["サービス提供時期", "決済完了後、即時ご利用可能"],
  ["解約・返金", "マイページよりいつでも解約可能。解約後は翌請求期間以降の課金を停止。サービスの性質上、既払い料金の返金は原則承っておりません。ただし当社に起因する重大な障害が発生した場合はこの限りではございません。"],
  ["無料トライアル", "Standard・Proプランは7日間無料。トライアル期間中に解約された場合、料金は発生しません。"],
  ["動作環境", "最新版のChrome・Safari・Edge（PCブラウザ推奨）"],
];

export default function TokushoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#07101f", color: "#f5f1e8", padding: "48px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <Link href="/pricing" style={{ fontSize: 13, color: "#c9a96b", textDecoration: "none" }}>← プランページへ戻る</Link>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: "#f5f1e8" }}>特定商取引法に基づく表記</h1>
        <p style={{ fontSize: 13, color: "#8a9bb8", marginBottom: 32 }}>物販チェッカー（株式会社ユニバースプラネットジャパン）</p>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {ROWS.map(([label, value]) => (
              <tr key={label} style={{ borderBottom: "1px solid rgba(201,169,107,0.12)" }}>
                <td style={{ padding: "14px 12px 14px 0", width: "30%", color: "#c9a96b", fontWeight: 700, verticalAlign: "top", whiteSpace: "nowrap" }}>
                  {label}
                </td>
                <td style={{ padding: "14px 0", color: "#c0b8a8", lineHeight: 1.7 }}>
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(201,169,107,0.12)", display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Link href="/legal/terms" style={{ fontSize: 13, color: "#8a9bb8", textDecoration: "none" }}>利用規約</Link>
          <Link href="/legal/privacy" style={{ fontSize: 13, color: "#8a9bb8", textDecoration: "none" }}>プライバシーポリシー</Link>
          <Link href="/pricing" style={{ fontSize: 13, color: "#8a9bb8", textDecoration: "none" }}>プランページ</Link>
        </div>
      </div>
    </div>
  );
}
