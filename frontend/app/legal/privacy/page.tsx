import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "プライバシーポリシー" };

const SECTIONS = [
  {
    title: "1. 収集する情報",
    body: "当社は以下の情報を収集します。\n・メールアドレス（認証・サポート連絡目的）\n・決済情報（Stripeが管理。当社のサーバーにはカード番号を保存しません）\n・サービス利用ログ（アクセス日時・機能利用状況。機能改善目的）\n・ユーザーが入力した仕入れ・売上データ（サービス提供目的）",
  },
  {
    title: "2. 利用目的",
    body: "収集した情報は以下の目的のみに使用します。\n・本サービスの提供・維持・改善\n・ユーザーへのサポート連絡\n・利用規約違反の調査および不正利用防止\n・サービスに関する重要なお知らせの送信",
  },
  {
    title: "3. 第三者提供",
    body: "当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。\n・ユーザーの同意がある場合\n・法令に基づく場合\n・人命・財産の保護のために必要な場合",
  },
  {
    title: "4. 利用する外部サービス",
    body: "本サービスは以下の外部サービスを利用しており、それぞれのプライバシーポリシーが適用されます。\n・Stripe（決済処理）\n・Resend（メール送信）\n・Sentry（エラー監視）\n・Vercel（フロントエンドホスティング）\n・Railway（バックエンドホスティング）\n・Neon（データベース）",
  },
  {
    title: "5. データの保管・削除",
    body: "収集したデータは、サービス提供に必要な期間、安全な環境で保管します。退会時にはアカウントに関連するデータを削除します（法令上の保管義務がある情報を除く）。",
  },
  {
    title: "6. Cookieの使用",
    body: "本サービスはセッション管理のためCookieを使用します。ブラウザの設定によりCookieを無効にすることができますが、その場合ログイン機能が正常に動作しない場合があります。",
  },
  {
    title: "7. 個人情報の開示・訂正・削除",
    body: "ユーザーは自身の個人情報について、開示・訂正・削除を請求できます。下記お問い合わせ先までご連絡ください。",
  },
  {
    title: "8. プライバシーポリシーの変更",
    body: "当社は必要に応じて本ポリシーを変更することがあります。重要な変更の際はサービス内またはメールにてお知らせします。",
  },
  {
    title: "9. お問い合わせ",
    body: "個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。\n\n株式会社ユニバースプラネットジャパン\nメール: support@upjapan.co.jp",
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#07101f", color: "#f5f1e8", padding: "48px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <Link href="/pricing" style={{ fontSize: 13, color: "#c9a96b", textDecoration: "none" }}>← プランページへ戻る</Link>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: "#f5f1e8" }}>プライバシーポリシー</h1>
        <p style={{ fontSize: 13, color: "#8a9bb8", marginBottom: 32 }}>最終更新日: 2026年5月</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#c9a96b", marginBottom: 8 }}>{s.title}</h2>
              <p style={{ fontSize: 14, color: "#c0b8a8", lineHeight: 1.8, whiteSpace: "pre-line", margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(201,169,107,0.12)", display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Link href="/legal/tokusho" style={{ fontSize: 13, color: "#8a9bb8", textDecoration: "none" }}>特定商取引法に基づく表記</Link>
          <Link href="/legal/terms" style={{ fontSize: 13, color: "#8a9bb8", textDecoration: "none" }}>利用規約</Link>
          <Link href="/pricing" style={{ fontSize: 13, color: "#8a9bb8", textDecoration: "none" }}>プランページ</Link>
        </div>
      </div>
    </div>
  );
}
