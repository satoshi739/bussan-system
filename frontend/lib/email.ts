/**
 * オンボメール送信ユーティリティ（Resend API 直接利用）
 *
 * 利用例（auth.ts の events.createUser 等から呼ぶ想定）:
 *   import { sendOnboardingWelcome } from "@/lib/email";
 *   await sendOnboardingWelcome({ to: user.email, userName: user.name });
 *
 * テンプレートの台本は memory/launch-content.md 参照。
 *
 * 注意:
 * - AUTH_RESEND_KEY と EMAIL_FROM の env 変数を流用（auth.ts と共通）
 * - 失敗時は warn ログを出して throw する。呼び出し側で try/catch して
 *   メール失敗で登録失敗にならないようにすること
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const APP_URL = "https://app.upjapan.co.jp";

type SendOpts = {
  to: string;
  subject: string;
  html: string;
};

async function sendEmail(opts: SendOpts): Promise<{ id?: string } | null> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  const from = process.env.EMAIL_FROM ?? "noreply@bussan-checker.com";

  if (!apiKey) {
    console.warn("[email] AUTH_RESEND_KEY 未設定のため送信スキップ:", opts.subject);
    return null;
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }
  return res.json() as Promise<{ id?: string }>;
}

/* ─────────── テンプレート用ヘルパー ─────────── */

const wrap = (bodyHtml: string) => `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F4F2EC;font-family:-apple-system,'Hiragino Sans','Yu Gothic',sans-serif;color:#2A2825;line-height:1.7;">
  <div style="max-width:600px;margin:0 auto;background:#FBF9F5;padding:32px 28px;">
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #E8E3DA;margin:28px 0 16px;">
    <div style="font-size:11px;color:#6B6760;line-height:1.6;">
      物販チェッカー / 株式会社ユニバースプラネットジャパン<br>
      <a href="${APP_URL}" style="color:#3D6FA8;">${APP_URL}</a>
    </div>
  </div>
</body>
</html>`;

const cta = (href: string, label: string) => `
  <a href="${href}" style="display:inline-block;background:#3D6FA8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:6px 0;">
    ${label}
  </a>`;

/* ─────────── メール 1: 登録直後 Welcome ─────────── */

export async function sendOnboardingWelcome(opts: { to: string; userName?: string | null }) {
  const name = opts.userName ?? "お客様";
  const subject = "【物販チェッカー】登録ありがとうございます。最初の3分でやることリスト";
  const html = wrap(`
    <p>${name}さん</p>
    <p>物販チェッカーへの登録ありがとうございます。<br>創業者のSatoshiです。</p>
    <p>無料14日間で、仕入れ判断のスピードと精度を体感してみてください。</p>

    <h3 style="font-size:14px;color:#2A2825;border-left:3px solid #3D6FA8;padding-left:10px;margin-top:24px;">最初の3分でやること</h3>
    <p><strong>【1分目】</strong> ダッシュボードを開いて画面を見る<br>
       → サンプルデータが表示され、何ができるか把握できます<br>
       ${cta(`${APP_URL}/`, "ダッシュボードを開く")}</p>
    <p><strong>【2分目】</strong> 利益計算を1件試す<br>
       → 仕入れ価格と販売価格を入れるだけで、純利益が即出ます<br>
       ${cta(`${APP_URL}/calculator`, "計算を試す")}</p>
    <p><strong>【3分目】</strong> スキャナーで自分の仕入れ候補を入力<br>
       → 「買い / 注意 / 見送り」の判定が出ます<br>
       ${cta(`${APP_URL}/scanner`, "スキャナーを使う")}</p>

    <h3 style="font-size:14px;color:#2A2825;border-left:3px solid #3D6FA8;padding-left:10px;margin-top:24px;">14日間で体験してほしいこと</h3>
    <ul style="padding-left:20px;">
      <li>1日10件の仕入れ判断を、3秒×10回で終わらせる</li>
      <li>赤字判定が出た商品を「やめる」習慣を1週間続ける</li>
      <li>週末に売上レポートで「赤字を防げた件数」を確認</li>
    </ul>

    <p style="margin-top:24px;">困ったら、このメールに直接返信してください。<br>創業者の私（Satoshi）が直接お答えします。</p>
  `);
  return sendEmail({ to: opts.to, subject, html });
}

/* ─────────── メール 2: 24時間後 ─────────── */

export async function sendOnboardingDay1(opts: { to: string; userName?: string | null }) {
  const name = opts.userName ?? "お客様";
  const subject = "【物販チェッカー】昨日のスキャン、何件できましたか？";
  const html = wrap(`
    <p>${name}さん</p>
    <p>登録から24時間経ちました。<br>物販チェッカーは触ってみていただけましたか？</p>

    <h3 style="font-size:14px;color:#2A2825;border-left:3px solid #3D6FA8;padding-left:10px;margin-top:24px;">まだ触っていなければ</h3>
    <p>3分でできる入門デモがあります。<br>
       ${cta(`${APP_URL}/calculator`, "今すぐ計算を試す")}</p>

    <h3 style="font-size:14px;color:#2A2825;border-left:3px solid #3D6FA8;padding-left:10px;margin-top:24px;">触った方へ：今日試してほしい3機能</h3>
    <p><strong>① 一括スキャナー</strong> キーワードから候補を一気に出す<br>
       <a href="${APP_URL}/scanner" style="color:#3D6FA8;">/scanner</a> で「Nintendo Switch」など入れる</p>
    <p><strong>② 発地・着地別の正確送料</strong> 利益計算が現実値に近づく<br>
       <a href="${APP_URL}/calculator" style="color:#3D6FA8;">/calculator</a> → 「📍発地・着地から正確料金を計算」</p>
    <p><strong>③ 売上レポート</strong> 赤字を防げた件数を可視化<br>
       <a href="${APP_URL}/sales" style="color:#3D6FA8;">/sales</a></p>

    <p style="margin-top:24px;">返信で何でも聞いてください。</p>
  `);
  return sendEmail({ to: opts.to, subject, html });
}

/* ─────────── メール 3: 6日後 / トライアル終了8日前 ─────────── */

export async function sendOnboardingDay6(opts: { to: string; userName?: string | null }) {
  const name = opts.userName ?? "お客様";
  const subject = "【あと8日】14日間の無料トライアル、効果は出ていますか？";
  const html = wrap(`
    <p>${name}さん</p>
    <p>無料トライアル開始から6日が経ちました。残り8日です。</p>

    <h3 style="font-size:14px;color:#2A2825;border-left:3px solid #3D6FA8;padding-left:10px;margin-top:24px;">ここまでで体感したことを、3問だけ</h3>
    <ol style="padding-left:20px;">
      <li>「赤字判定が出た仕入れ」をスキップした件数</li>
      <li>「買い判定が出た仕入れ」で実際に黒字になった件数</li>
      <li>利益計算にかかる時間が、何分→何秒に変わりましたか？</li>
    </ol>

    <h3 style="font-size:14px;color:#2A2825;border-left:3px solid #3D6FA8;padding-left:10px;margin-top:24px;">Standardプラン継続のメリット</h3>
    <ul style="padding-left:20px;">
      <li>スキャン無制限（無料は月10件）</li>
      <li>履歴無制限（無料は3件）</li>
      <li>全機能アクセス・週末レポート自動配信</li>
    </ul>

    <div style="background:#F0EEE8;border:2px solid #3D6FA8;border-radius:10px;padding:16px 20px;margin:20px 0;">
      <div style="font-size:12px;color:#3D6FA8;font-weight:700;letter-spacing:1px;">🎉 ロンチ記念｜先着50名 限定</div>
      <div style="font-size:18px;font-weight:900;margin:6px 0;">初月50%OFF（¥9,800 → ¥4,900）</div>
      <div style="font-size:12px;color:#6B6760;">＋ 創業者サポート1時間付き｜期限：5月31日 23:59</div>
      <div style="margin-top:12px;">${cta(`${APP_URL}/pricing`, "特典つきで継続する →")}</div>
    </div>

    <h3 style="font-size:14px;color:#2A2825;border-left:3px solid #3D6FA8;padding-left:10px;margin-top:24px;">「もう少し試したい」方へ</h3>
    <p>このメールに「延長希望」と返信してください。<br>追加7日間の無料延長コードをお渡しします（先着10名・5/31まで）。</p>

    <h3 style="font-size:14px;color:#2A2825;border-left:3px solid #3D6FA8;padding-left:10px;margin-top:24px;">「合わなかった」方へ</h3>
    <p>何が合わなかったか、返信で1行だけ教えてください。<br>お返事いただいた方には、Amazonギフト¥500をお送りします。</p>
  `);
  return sendEmail({ to: opts.to, subject, html });
}
