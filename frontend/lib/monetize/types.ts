export const PROMPT_VERSION = "mvp_v1";

export type GenerationCategory =
  | "analysis"
  | "article"
  | "sns"
  | "reel"
  | "line"
  | "cta"
  | "compliance";

export const ALL_CATEGORIES: GenerationCategory[] = [
  "analysis",
  "article",
  "sns",
  "reel",
  "line",
  "cta",
  "compliance",
];

export const CATEGORY_LABELS: Record<GenerationCategory, string> = {
  analysis: "分析",
  article: "記事",
  sns: "SNS",
  reel: "リール",
  line: "LINE",
  cta: "CTA",
  compliance: "注意表現",
};

export interface ProjectInputSnapshot {
  name: string;
  genre: string;
  target: string;
  product_url: string | null;
  lp_url: string | null;
  blog_url: string | null;
  affiliate_link: string | null;
  memo: string | null;
}

export interface AnalysisJson {
  summary: string;
  appeal_points: string[];
  target_needs: string[];
  content_strategy: string;
}

export interface ArticleJson {
  title: string;
  lead: string;
  outline: string[];
  body: string;
}

export interface SnsPostItem {
  platform: string;
  text: string;
}
export interface SnsJson {
  posts: SnsPostItem[];
}

export interface ReelJson {
  hook: string;
  scenes: string[];
  script: string;
  caption: string;
}

export interface LineJson {
  short_message: string;
  standard_message: string;
  cta_message: string;
}

export interface CtaJson {
  patterns: string[];
}

export interface ComplianceRiskFlag {
  text: string;
  reason: string;
  suggestion: string;
}
export interface ComplianceJson {
  risk_flags: ComplianceRiskFlag[];
}

export interface RawOutputJson {
  analysis: AnalysisJson;
  article: ArticleJson;
  sns: SnsJson;
  reel: ReelJson;
  line: LineJson;
  cta: CtaJson;
  compliance: ComplianceJson;
}
