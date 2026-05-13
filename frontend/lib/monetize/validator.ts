import type { RawOutputJson } from "./types";

export class GenerationValidationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "GenerationValidationError";
  }
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isNonEmptyStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every(isNonEmptyString);
}

export function validateRawOutput(input: unknown): RawOutputJson {
  if (!input || typeof input !== "object") {
    throw new GenerationValidationError("INVALID_ROOT", "AI出力がオブジェクト形式ではありません");
  }
  const obj = input as Record<string, unknown>;

  const analysis = obj.analysis as Record<string, unknown> | undefined;
  if (!analysis) throw new GenerationValidationError("MISSING_ANALYSIS", "analysis フィールドが欠落しています");
  if (!isNonEmptyString(analysis.summary)) throw new GenerationValidationError("EMPTY_ANALYSIS_SUMMARY", "analysis.summary が空");
  if (!isNonEmptyStringArray(analysis.appeal_points)) throw new GenerationValidationError("EMPTY_ANALYSIS_APPEAL", "analysis.appeal_points が空");
  if (!isNonEmptyStringArray(analysis.target_needs)) throw new GenerationValidationError("EMPTY_ANALYSIS_NEEDS", "analysis.target_needs が空");
  if (!isNonEmptyString(analysis.content_strategy)) throw new GenerationValidationError("EMPTY_ANALYSIS_STRATEGY", "analysis.content_strategy が空");

  const article = obj.article as Record<string, unknown> | undefined;
  if (!article) throw new GenerationValidationError("MISSING_ARTICLE", "article フィールドが欠落しています");
  if (!isNonEmptyString(article.title)) throw new GenerationValidationError("EMPTY_ARTICLE_TITLE", "article.title が空");
  if (!isNonEmptyString(article.lead)) throw new GenerationValidationError("EMPTY_ARTICLE_LEAD", "article.lead が空");
  if (!isNonEmptyStringArray(article.outline)) throw new GenerationValidationError("EMPTY_ARTICLE_OUTLINE", "article.outline が空");
  if (!isNonEmptyString(article.body)) throw new GenerationValidationError("EMPTY_ARTICLE_BODY", "article.body が空");

  const sns = obj.sns as Record<string, unknown> | undefined;
  if (!sns || !Array.isArray(sns.posts) || sns.posts.length === 0) {
    throw new GenerationValidationError("EMPTY_SNS_POSTS", "sns.posts が空");
  }
  for (const p of sns.posts) {
    const post = p as Record<string, unknown>;
    if (!isNonEmptyString(post.platform) || !isNonEmptyString(post.text)) {
      throw new GenerationValidationError("INVALID_SNS_POST", "sns.posts の各項目に platform/text が必要");
    }
  }

  const reel = obj.reel as Record<string, unknown> | undefined;
  if (!reel) throw new GenerationValidationError("MISSING_REEL", "reel フィールドが欠落しています");
  if (!isNonEmptyString(reel.hook)) throw new GenerationValidationError("EMPTY_REEL_HOOK", "reel.hook が空");
  if (!isNonEmptyStringArray(reel.scenes)) throw new GenerationValidationError("EMPTY_REEL_SCENES", "reel.scenes が空");
  if (!isNonEmptyString(reel.script)) throw new GenerationValidationError("EMPTY_REEL_SCRIPT", "reel.script が空");
  if (!isNonEmptyString(reel.caption)) throw new GenerationValidationError("EMPTY_REEL_CAPTION", "reel.caption が空");

  const line = obj.line as Record<string, unknown> | undefined;
  if (!line) throw new GenerationValidationError("MISSING_LINE", "line フィールドが欠落しています");
  if (!isNonEmptyString(line.short_message)) throw new GenerationValidationError("EMPTY_LINE_SHORT", "line.short_message が空");
  if (!isNonEmptyString(line.standard_message)) throw new GenerationValidationError("EMPTY_LINE_STANDARD", "line.standard_message が空");
  if (!isNonEmptyString(line.cta_message)) throw new GenerationValidationError("EMPTY_LINE_CTA", "line.cta_message が空");

  const cta = obj.cta as Record<string, unknown> | undefined;
  if (!cta || !isNonEmptyStringArray(cta.patterns)) {
    throw new GenerationValidationError("EMPTY_CTA_PATTERNS", "cta.patterns が空");
  }

  const compliance = obj.compliance as Record<string, unknown> | undefined;
  if (!compliance || !Array.isArray(compliance.risk_flags)) {
    throw new GenerationValidationError("MISSING_COMPLIANCE", "compliance.risk_flags が欠落");
  }
  for (const r of compliance.risk_flags) {
    const flag = r as Record<string, unknown>;
    if (!isNonEmptyString(flag.text) || !isNonEmptyString(flag.reason) || !isNonEmptyString(flag.suggestion)) {
      throw new GenerationValidationError("INVALID_COMPLIANCE_FLAG", "compliance.risk_flags の各項目に text/reason/suggestion が必要");
    }
  }

  return obj as unknown as RawOutputJson;
}
