/**
 * APIエラーを日本語のアクション可能なメッセージに変換するユーティリティ
 */

interface ErrorRule {
  match: string | RegExp;
  message: string;
  action?: string;
}

const RULES: ErrorRule[] = [
  // ── 認証・権限 ──────────────────────────────────────
  { match: /401|unauthorized|認証/i,
    message: "ログインが必要です",
    action: "ページを再読み込みしてログインし直してください" },
  { match: /403|forbidden|権限/i,
    message: "この操作の権限がありません",
    action: "プランをアップグレードするか、管理者にお問い合わせください" },

  // ── リソースなし ─────────────────────────────────────
  { match: /404|not found|見つかりません/i,
    message: "データが見つかりません",
    action: "削除済みか、URLが間違っている可能性があります" },

  // ── レート制限 ───────────────────────────────────────
  { match: /429|rate.?limit|上限/i,
    message: "利用制限に達しました",
    action: "しばらく待ってから再試行するか、プランを確認してください" },

  // ── サーバーエラー ───────────────────────────────────
  { match: /500|internal server/i,
    message: "サーバーエラーが発生しました",
    action: "しばらく待ってから再試行してください" },
  { match: /502|503|504|bad gateway|service unavailable/i,
    message: "ただいまサービスの接続に問題が発生しています",
    action: "しばらく待ってから再試行してください" },

  // ── ネットワーク ─────────────────────────────────────
  { match: /aborted|abort|timeout|timed.?out|タイムアウト/i,
    message: "接続がタイムアウトしました",
    action: "ネットワーク環境を確認し、再試行してください" },
  { match: /failed to fetch|network|ネットワーク|接続/i,
    message: "ただいまサービスの接続に問題が発生しています",
    action: "しばらく待ってから再試行してください" },

  // ── APIキー ──────────────────────────────────────────
  { match: /anthropic|claude|APIキー|api.?key/i,
    message: "Anthropic APIキーが未設定です",
    action: "設定ページでAPIキーを登録してください" },
  { match: /ebay|eBay/i,
    message: "eBay APIの呼び出しに失敗しました",
    action: "設定ページでeBay App IDを確認してください" },

  // ── LINE ─────────────────────────────────────────────
  { match: /line.?token|line.*invalid|トークンが無効/i,
    message: "LINEトークンが無効です",
    action: "LINE Notifyで新しいトークンを発行し、設定ページで更新してください" },

  // ── バリデーション ───────────────────────────────────
  { match: /validation|unprocessable|422/i,
    message: "入力値に誤りがあります",
    action: "必須項目と数値の形式を確認してください" },
  { match: /価格|price.*invalid|金額/i,
    message: "価格の形式が正しくありません",
    action: "半角数字で入力してください" },
];

/**
 * Error または文字列からユーザー向け日本語メッセージを返す。
 * action（対処法）がある場合は改行して付記する。
 */
export function toJapaneseError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "不明なエラー");

  for (const rule of RULES) {
    const matched =
      typeof rule.match === "string"
        ? raw.toLowerCase().includes(rule.match.toLowerCase())
        : rule.match.test(raw);

    if (matched) {
      return rule.action
        ? `${rule.message}\n→ ${rule.action}`
        : rule.message;
    }
  }

  // ルールにマッチしない場合は元のメッセージを短縮して返す
  const trimmed = raw.slice(0, 120);
  return trimmed.length < raw.length ? `${trimmed}…` : trimmed;
}

/**
 * toast("error") 用のショートカット。
 * エラーオブジェクトを渡すだけで日本語メッセージに変換して返す。
 */
export function errMsg(err: unknown): string {
  return toJapaneseError(err);
}
