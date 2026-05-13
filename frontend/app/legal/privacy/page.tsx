import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "プライバシーポリシー" };

const SECTIONS = [
  {
    title: "1. 収集する情報",
    body: "当社は以下の情報を収集します。\n・メールアドレス（認証・サポート連絡目的）\n・決済情報（Stripeが管理。当社のサーバーにはカード番号を保存しません）\n・サービス利用ログ（アクセス日時・機能利用状況。機能改善目的）\n・ユーザーが入力した仕入れ・売上データ（サービス提供目的）\n・連携した外部マーケットプレイス（eBay、Amazon、メルカリ等）からAPI経由で取得する情報（出品情報、販売履歴、アカウント識別子、出品権限スコープ等）。これらの情報は当社サーバーに保管され、ユーザーが本サービスを通じて仕入れ・出品判断・利益計算を行う目的でのみ利用します。",
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
    title: "4. 利用する外部サービス・国際データ移転",
    body: "本サービスは以下のサービスと連携しており、データが各国で保管・処理される場合があります。それぞれのプライバシーポリシーが適用されます。\n・Stripe（決済処理 / アイルランド・米国）\n・Resend（メール送信 / 米国）\n・Sentry（エラー監視 / 米国）\n・Vercel（フロントエンドホスティング / 米国）\n・Railway（バックエンドホスティング / 米国）\n・Neon（データベース / 米国）\n・eBay Inc.（マーケットプレイス連携 / 米国）\n・Amazon Services（マーケットプレイス連携 / 米国）\n・株式会社メルカリ（マーケットプレイス連携 / 日本）\n\n本サービスを利用することにより、上記の国外へのデータ移転に同意したものとみなします。",
  },
  {
    title: "5. データの保管・削除",
    body: "（1）保管期間\n・アカウント情報：退会後30日以内に削除\n・取引記録：電子帳簿保存法に基づき7年間保管\n・サポート履歴：3年間保管\n・アクセスログ：90日間保管\n\n（2）外部マーケットプレイス連携アカウントの削除時\neBay等の連携先からアカウント削除通知を受領した場合、30日以内に該当ユーザーのデータを削除します。eBayのMarketplace Account Deletion通知は専用エンドポイントで受信し、自動的に削除処理を行います。",
  },
  {
    title: "6. Cookieの使用",
    body: "本サービスはセッション管理のためCookieを使用します。ブラウザの設定によりCookieを無効にすることができますが、その場合ログイン機能が正常に動作しない場合があります。",
  },
  {
    title: "7. ユーザーの権利",
    body: "ユーザーは自身の個人情報について、以下を請求することができます。\n・利用目的の通知\n・個人情報の開示\n・内容の訂正・追加・削除\n・利用の停止・消去\n・第三者提供の停止\n・同意の撤回\n\n下記お問い合わせ窓口までご連絡ください。本人確認の上、法令に基づき対応いたします。",
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
        <p style={{ fontSize: 13, color: "#8a9bb8", marginBottom: 4 }}>制定日: 2026年5月1日</p>
        <p style={{ fontSize: 13, color: "#8a9bb8", marginBottom: 32 }}>最終改訂日: 2026年5月10日</p>

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
