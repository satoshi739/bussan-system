"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, MessageCircle, ExternalLink } from "lucide-react";

const C = {
  bg0: "var(--bg)",
  bg1: "var(--surface)",
  bg2: "var(--surface-2)",
  t1:  "var(--text)",
  t2:  "var(--text-2)",
  t3:  "var(--text-3)",
  t4:  "var(--text-4)",
  gold:   "var(--blue)",
  goldDm: "var(--blue-dm)",
  bd:     "var(--border)",
  bdSt:   "var(--border-strong)",
};

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "22px 24px",
};

const FAQS = [
  {
    q: "無料プランで使える機能はどこまでですか？",
    a: "利益スキャナー・バーコードスキャン・利益計算機・相場検索が使えます。仕入れ登録は30件まで。レポート・分析・AIエージェント機能はStandard以上のプランが必要です。",
  },
  {
    q: "7日間無料トライアルはどうやって始めますか？",
    a: "料金ページからStandardまたはProプランを選択して決済ページに進むと、7日間のトライアルが自動的に開始されます。トライアル期間中は料金は発生しません。",
  },
  {
    q: "利益スキャナーの精度はどのくらいですか？",
    a: "eBay・メルカリ・Yahoo!オークションのリアルタイム価格をもとに計算しています。落札済み価格（実売価格）も参照しているため、出品中の相場より精度が高いです。ただし市場は常に変動するため、最終判断は自己責任でお願いします。",
  },
  {
    q: "Amazonの仕入れ価格を取得するにはどうすればよいですか？",
    a: "設定ページでKeepa APIキーを入力するとAmazonの価格履歴・現在価格を自動取得できます。KeepaのAPIキーはkeepa.comで取得できます（有料）。",
  },
  {
    q: "支払い方法は何がありますか？",
    a: "クレジットカード（Visa / Mastercard / JCB / American Express）に対応しています。決済はStripeを使用しており、カード情報は当サービスに保存されません。",
  },
  {
    q: "解約はいつでもできますか？",
    a: "はい。設定 > プラン管理からいつでも解約できます。解約後は当月末まで引き続き利用できます。日割り返金は行っておりません。",
  },
  {
    q: "バックエンドサーバーに接続できないと表示されます",
    a: "サーバーの一時的な再起動が原因の場合があります。30秒ほど待ってからページを再読み込みしてください。それでも改善しない場合はお問い合わせください。",
  },
  {
    q: "データのバックアップはできますか？",
    a: "仕入れ管理ページの「CSVエクスポート」からデータをダウンロードできます。定期的なバックアップをおすすめします。",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: `1px solid ${open ? C.bdSt : C.bd}`,
      borderRadius: 10,
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          background: open ? `${C.gold}08` : "transparent",
          border: "none",
          padding: "16px 20px",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.2s",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: open ? C.t1 : C.t2, lineHeight: 1.5, flex: 1 }}>
          {q}
        </span>
        {open
          ? <ChevronUp size={15} color={C.gold} style={{ flexShrink: 0 }} />
          : <ChevronDown size={15} color={C.t4} style={{ flexShrink: 0 }} />
        }
      </button>
      {open && (
        <div style={{ padding: "0 20px 18px", fontSize: 13, color: C.t3, lineHeight: 1.9, borderTop: `1px solid ${C.bd}`, paddingTop: 14 }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  const [name, setName]       = useState("");
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    const subject = encodeURIComponent("【物販チェッカー】お問い合わせ" + (name ? ` — ${name}` : ""));
    const body    = encodeURIComponent(`お名前: ${name || "（未入力）"}\n\n${message}`);
    window.open(`mailto:satoshi6667s@gmail.com?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div style={{ color: C.t1, maxWidth: 760, margin: "0 auto" }}>
      <style>{`
        @media (max-width: 768px) {
          .support-contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: C.t1, margin: 0, letterSpacing: "-0.02em" }}>
        ヘルプ・サポート
      </h1>
      <p style={{ fontSize: 13, color: C.t3, marginBottom: 32, marginTop: 3 }}>
        よくある質問とお問い合わせ窓口です。
      </p>

      {/* FAQ */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          よくある質問
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* Contact */}
      <section>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          お問い合わせ
        </div>
        <div className="support-contact-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* フォーム */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <Mail size={14} color={C.gold} />
              <span style={{ fontSize: 14, fontWeight: 700, color: C.t2 }}>メールで問い合わせる</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: C.t3, display: "block", marginBottom: 5 }}>お名前（任意）</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="山田 太郎"
                  style={{
                    width: "100%",
                    background: C.bg0,
                    border: `1px solid ${C.bd}`,
                    borderRadius: 8,
                    color: C.t1,
                    padding: "9px 12px",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.t3, display: "block", marginBottom: 5 }}>お問い合わせ内容</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="ご質問・ご要望・不具合の詳細をご記入ください"
                  rows={5}
                  style={{
                    width: "100%",
                    background: C.bg0,
                    border: `1px solid ${C.bd}`,
                    borderRadius: 8,
                    color: C.t1,
                    padding: "9px 12px",
                    fontSize: 13,
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  background: message.trim()
                    ? `linear-gradient(135deg, #1E1608, #2A1E08)`
                    : C.bg2,
                  border: `1px solid ${message.trim() ? `${C.gold}70` : C.bd}`,
                  borderRadius: 9,
                  color: message.trim() ? C.gold : C.t4,
                  padding: "11px 20px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: message.trim() ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                }}
              >
                <Mail size={13} /> メールを送る
              </button>
              <div style={{ fontSize: 11, color: C.t4, textAlign: "center" }}>
                メールアプリが開きます。送信ボタンを押してください。
              </div>
            </div>
          </div>

          {/* 補足情報 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ ...card, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <MessageCircle size={13} color={C.gold} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.t2 }}>返信について</span>
              </div>
              <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.8 }}>
                通常 <span style={{ color: C.t2, fontWeight: 600 }}>1〜2営業日以内</span>にご返信します。
                土日・祝日は翌営業日以降のご対応となります。
              </div>
            </div>

            <div style={{ ...card, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, marginBottom: 10 }}>
                お問い合わせ時に伝えると早い情報
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  "ご利用中のプラン（フリー/Standard/Pro）",
                  "発生した操作の手順",
                  "エラーメッセージがあればコピー",
                  "ブラウザとOSの種類",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: C.t3 }}>
                    <span style={{ color: C.gold, flexShrink: 0, marginTop: 1 }}>·</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...card, padding: "16px 20px", background: `${C.gold}06`, borderColor: `${C.gold}30` }}>
              <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.8 }}>
                直接メールでの連絡も歓迎です
              </div>
              <a
                href="mailto:satoshi6667s@gmail.com"
                style={{ display: "flex", alignItems: "center", gap: 5, color: C.gold, fontSize: 13, fontWeight: 700, textDecoration: "none", marginTop: 6 }}
              >
                satoshi6667s@gmail.com <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
