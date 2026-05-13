import type { ProjectInputSnapshot } from "./types";

export function buildSystemPrompt(): string {
  return `あなたは日本語アフィリエイト/コンテンツマーケティングの専門家です。
以下の案件情報を分析し、収益化に直結する高品質なコンテンツを7カテゴリに分けて生成します。

【厳守ルール】
- 出力は generate_monetize_content ツール経由の構造化JSONのみ
- 空文字 "" や 空配列 [] は原則禁止。情報が少なくても最低限の文面を生成すること
- 誇大表現・断定的保証(「絶対」「必ず」「確実」「100%」等)は使わない
- 景表法・薬機法に抵触しうる表現があれば必ず compliance.risk_flags で指摘すること
- ターゲット層に最も刺さる言葉選びをすること
- リール台本は冒頭3秒のフックを特に強くすること(視聴離脱防止)
- アフィリエイトリンクは導線設計の最終地点として活用、分析の主材料は商品URL/LP URL/ブログURL/案件情報を優先すること
- 出力本文は読みやすい日本語で、改行・箇条書きを適切に使うこと`;
}

export function buildUserPrompt(input: ProjectInputSnapshot): string {
  const lines: string[] = [];
  lines.push("## 案件情報");
  lines.push(`- 案件名: ${input.name}`);
  lines.push(`- ジャンル: ${input.genre}`);
  lines.push(`- ターゲット: ${input.target}`);
  if (input.product_url) lines.push(`- 商品URL: ${input.product_url}`);
  if (input.lp_url) lines.push(`- 自社LP URL: ${input.lp_url}`);
  if (input.blog_url) lines.push(`- ブログURL: ${input.blog_url}`);
  if (input.affiliate_link) lines.push(`- アフィリエイトリンク: ${input.affiliate_link}`);
  if (input.memo) lines.push(`- メモ: ${input.memo}`);
  lines.push("");
  lines.push("## 想定読者属性");
  lines.push("- アフィリエイト運用者");
  lines.push("- 自社LPや商品ページを元に集客導線を作りたい事業者");
  lines.push("- ブログ・SNS・LINE導線を一気に作りたい運用担当者");
  lines.push("");
  lines.push("以上の情報を元に、generate_monetize_content ツールを必ず呼び出して、7カテゴリ全てのコンテンツを生成してください。");
  return lines.join("\n");
}

export const TOOL_DEFINITION = {
  name: "generate_monetize_content",
  description: "案件情報を元に、収益化用コンテンツを7カテゴリで生成し構造化JSONで返す",
  input_schema: {
    type: "object" as const,
    properties: {
      analysis: {
        type: "object",
        properties: {
          summary: { type: "string", description: "商品・サービス概要 200〜400字" },
          appeal_points: { type: "array", items: { type: "string" }, description: "売れる訴求ポイント 3〜5件" },
          target_needs: { type: "array", items: { type: "string" }, description: "想定読者の悩み・ニーズ 3〜5件" },
          content_strategy: { type: "string", description: "販売導線の提案 200〜400字" },
        },
        required: ["summary", "appeal_points", "target_needs", "content_strategy"],
      },
      article: {
        type: "object",
        properties: {
          title: { type: "string", description: "SEO最適化された記事タイトル" },
          lead: { type: "string", description: "導入文 150〜300字" },
          outline: { type: "array", items: { type: "string" }, description: "見出し構成 5〜8個" },
          body: { type: "string", description: "記事本文 1500〜3000字。Markdown形式で見出し含む" },
        },
        required: ["title", "lead", "outline", "body"],
      },
      sns: {
        type: "object",
        properties: {
          posts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                platform: { type: "string", description: "X / Instagram / Facebook / Threads のいずれか" },
                text: { type: "string", description: "投稿本文。各プラットフォームの最適文字数に合わせる" },
              },
              required: ["platform", "text"],
            },
            description: "X(140字程度)5本+ Instagram1本+ Facebook1本+ Threads1本 = 計8件以上",
          },
        },
        required: ["posts"],
      },
      reel: {
        type: "object",
        properties: {
          hook: { type: "string", description: "冒頭3秒のフック文。視聴離脱を強く防ぐ一言" },
          scenes: { type: "array", items: { type: "string" }, description: "シーン構成 5〜8個" },
          script: { type: "string", description: "ナレーション・台本本文 30〜60秒分" },
          caption: { type: "string", description: "投稿時のキャプション文" },
        },
        required: ["hook", "scenes", "script", "caption"],
      },
      line: {
        type: "object",
        properties: {
          short_message: { type: "string", description: "短文配信 100字以内" },
          standard_message: { type: "string", description: "通常配信 300〜500字" },
          cta_message: { type: "string", description: "CTA付き配信 申込誘導文を含む 300〜500字" },
        },
        required: ["short_message", "standard_message", "cta_message"],
      },
      cta: {
        type: "object",
        properties: {
          patterns: {
            type: "array",
            items: { type: "string" },
            description: "CTA文パターン 5〜8個。ボタン文言/LP誘導/アフィリンク誘導/無料相談誘導を網羅",
          },
        },
        required: ["patterns"],
      },
      compliance: {
        type: "object",
        properties: {
          risk_flags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string", description: "上記コンテンツ内で問題となりうる表現の引用" },
                reason: { type: "string", description: "なぜ問題か(景表法/薬機法/誇大/断定 等の理由)" },
                suggestion: { type: "string", description: "言い換え提案" },
              },
              required: ["text", "reason", "suggestion"],
            },
            description: "上記コンテンツから抽出した注意表現候補。最低3件以上",
          },
        },
        required: ["risk_flags"],
      },
    },
    required: ["analysis", "article", "sns", "reel", "line", "cta", "compliance"],
  },
};
