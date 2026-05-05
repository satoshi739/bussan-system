import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "利用規約" };

const ARTICLES = [
  {
    title: "第1条（適用）",
    body: "本規約は、株式会社ユニバースプラネットジャパン（以下「当社」）が提供する「物販チェッカー」（以下「本サービス」）の利用に関する条件を、本サービスを利用するすべてのユーザー（以下「ユーザー」）との間で定めるものです。",
  },
  {
    title: "第2条（利用登録）",
    body: "登録申請者が本規約に同意の上、当社の定める方法により申請を行い、当社が承認した時点で利用契約が成立します。未成年者が本サービスを利用される場合は、保護者の同意を得てください。",
  },
  {
    title: "第3条（料金・支払い）",
    body: "有料プランの月額料金は各プランページに表示の通りです。料金はStripeを通じてクレジットカードにより毎月自動引き落とされます。料金は税込表示です。",
  },
  {
    title: "第4条（無料トライアル）",
    body: "Standard・Proプランは7日間の無料トライアル期間を提供します。トライアル期間中に解約された場合、料金は発生しません。トライアル終了後は自動的に有料プランへ移行します。",
  },
  {
    title: "第5条（解約）",
    body: "ユーザーはマイページからいつでも解約できます。解約の効力は翌課金期間の開始日をもって生じます。解約後も当該課金期間終了日までは引き続き本サービスをご利用いただけます。",
  },
  {
    title: "第6条（返金）",
    body: "サービスの性質上、既払い料金の返金は原則承っておりません。ただし、当社の責に帰すべき重大な障害によりサービスが利用できなかった場合は、この限りではありません。",
  },
  {
    title: "第7条（禁止事項）",
    body: "ユーザーは以下の行為を行ってはなりません。\n・本サービスの情報・データを無断で転載・販売する行為\n・本サービスへの不正アクセスやサーバーへの過度な負荷をかける行為\n・法令または公序良俗に違反する行為\n・当社または第三者の権利を侵害する行為\n・その他、当社が不適切と判断する行為",
  },
  {
    title: "第8条（サービスの変更・停止）",
    body: "当社は事前通知の上、本サービスの内容を変更または提供を一時停止・終了できるものとします。これによりユーザーに損害が生じた場合でも、当社は責任を負いません。",
  },
  {
    title: "第9条（免責事項）",
    body: "本サービスで提供する情報（利益計算・スキャン結果等）は参考情報です。当社は提供情報の正確性・完全性を保証せず、ユーザーの仕入れ・投資判断の結果について責任を負いません。",
  },
  {
    title: "第10条（個人情報）",
    body: "当社が取得する個人情報は、別途定めるプライバシーポリシーに従い適切に管理します。",
  },
  {
    title: "第11条（規約の変更）",
    body: "当社は必要に応じて本規約を変更できます。変更後の規約はサービス上に掲示した時点で効力を生じます。変更後も本サービスを継続利用された場合、変更後の規約に同意したものとみなします。",
  },
  {
    title: "第12条（準拠法・管轄）",
    body: "本規約は日本法に準拠します。本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。",
  },
];

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#07101f", color: "#f5f1e8", padding: "48px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <Link href="/pricing" style={{ fontSize: 13, color: "#c9a96b", textDecoration: "none" }}>← プランページへ戻る</Link>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: "#f5f1e8" }}>利用規約</h1>
        <p style={{ fontSize: 13, color: "#8a9bb8", marginBottom: 32 }}>最終更新日: 2026年5月</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {ARTICLES.map((a) => (
            <div key={a.title}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#c9a96b", marginBottom: 8 }}>{a.title}</h2>
              <p style={{ fontSize: 14, color: "#c0b8a8", lineHeight: 1.8, whiteSpace: "pre-line", margin: 0 }}>{a.body}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(201,169,107,0.12)", display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Link href="/legal/tokusho" style={{ fontSize: 13, color: "#8a9bb8", textDecoration: "none" }}>特定商取引法に基づく表記</Link>
          <Link href="/legal/privacy" style={{ fontSize: 13, color: "#8a9bb8", textDecoration: "none" }}>プライバシーポリシー</Link>
          <Link href="/pricing" style={{ fontSize: 13, color: "#8a9bb8", textDecoration: "none" }}>プランページ</Link>
        </div>
      </div>
    </div>
  );
}
