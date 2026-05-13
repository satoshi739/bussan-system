"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/tokens";
import CopyButton from "./CopyButton";
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  type GenerationCategory,
  type RawOutputJson,
  type AnalysisJson,
  type ArticleJson,
  type SnsJson,
  type ReelJson,
  type LineJson,
  type CtaJson,
  type ComplianceJson,
} from "@/lib/monetize/types";

type ProjectSummary = {
  id: string;
  name: string;
  genre: string;
  target: string;
  status: "DRAFT" | "READY" | "GENERATING" | "GENERATED" | "ERROR";
  latestGeneratedAt: string | null;
  latestGenerationResultId: string | null;
};

type HistoryItem = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "SUCCESS" | "FAILED";
  generationResultId: string | null;
  promptVersion: string;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
};

interface Props {
  project: ProjectSummary;
  initialResult: RawOutputJson | null;
  initialResultCreatedAt: string | null;
}

export default function GenerateView({ project: initialProject, initialResult, initialResultCreatedAt }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const autostart = search.get("autostart") === "1";

  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState<GenerationCategory>("analysis");
  const [result, setResult] = useState<RawOutputJson | null>(initialResult);
  const [resultCreatedAt, setResultCreatedAt] = useState<string | null>(initialResultCreatedAt);
  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("latest");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historiesError, setHistoriesError] = useState<string | null>(null);

  const loadHistories = useCallback(async () => {
    try {
      const res = await fetch(`/api/monetize/projects/${project.id}/histories`, { cache: "no-store" });
      if (!res.ok) {
        setHistoriesError("履歴の取得に失敗しました");
        return;
      }
      const json = await res.json();
      setHistories(json.histories ?? []);
      setHistoriesError(null);
    } catch {
      setHistoriesError("履歴の取得に失敗しました");
    }
  }, [project.id]);

  useEffect(() => {
    loadHistories();
  }, [loadHistories]);

  const runGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    setProject((p) => ({ ...p, status: "GENERATING" }));
    try {
      const res = await fetch(`/api/monetize/projects/${project.id}/generate`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        const code = json?.errorCode ?? "";
        const msg =
          code === "NO_TOOL_USE" || code.startsWith("EMPTY_") || code.startsWith("INVALID_") || code === "MISSING_ANALYSIS"
            ? "生成結果の解析に失敗しました。再試行してください"
            : "AI生成に失敗しました。再度お試しください";
        setError(msg);
        setProject((p) => ({ ...p, status: "ERROR" }));
        await loadHistories();
        return;
      }
      setResult(json.result as RawOutputJson);
      setResultCreatedAt(new Date().toISOString());
      setSelectedHistoryId(json.historyId);
      setProject((p) => ({
        ...p,
        status: "GENERATED",
        latestGeneratedAt: new Date().toISOString(),
        latestGenerationResultId: json.resultId,
      }));
      setActiveTab("analysis");
      await loadHistories();
      router.refresh();
    } catch {
      setError("AI生成に失敗しました。再度お試しください");
      setProject((p) => ({ ...p, status: "ERROR" }));
    } finally {
      setGenerating(false);
    }
  }, [generating, project.id, loadHistories, router]);

  // autostart=1 の時、初回だけ自動生成
  const [autostartFired, setAutostartFired] = useState(false);
  useEffect(() => {
    if (autostart && !autostartFired && !generating && project.status !== "GENERATING") {
      setAutostartFired(true);
      runGenerate();
    }
  }, [autostart, autostartFired, generating, project.status, runGenerate]);

  const onSelectHistory = useCallback(async (historyId: string) => {
    setSelectedHistoryId(historyId);
    if (historyId === "latest") {
      // フォールバックとして最新結果を再取得
      try {
        const res = await fetch(`/api/monetize/projects/${project.id}`, { cache: "no-store" });
        if (!res.ok) {
          setHistoriesError("履歴の取得に失敗しました");
          return;
        }
        const json = await res.json();
        const latest = json?.project?.latestResult;
        if (latest) {
          setResult(latest.rawOutputJson as RawOutputJson);
          setResultCreatedAt(latest.createdAt as string);
        }
      } catch {
        setHistoriesError("履歴の取得に失敗しました");
      }
      return;
    }
    try {
      const res = await fetch(`/api/monetize/projects/${project.id}/histories/${historyId}`, { cache: "no-store" });
      if (!res.ok) {
        setHistoriesError("履歴の取得に失敗しました");
        return;
      }
      const json = await res.json();
      const r = json?.history?.result;
      if (r?.rawOutputJson) {
        setResult(r.rawOutputJson as RawOutputJson);
        setResultCreatedAt(r.createdAt as string);
        setHistoriesError(null);
      } else {
        setHistoriesError("この履歴には生成結果がありません");
      }
    } catch {
      setHistoriesError("履歴の取得に失敗しました");
    }
  }, [project.id]);

  const generatedAtLabel = useMemo(() => {
    if (!project.latestGeneratedAt) return "未生成";
    return formatDate(project.latestGeneratedAt);
  }, [project.latestGeneratedAt]);

  const isGenerating = generating || project.status === "GENERATING";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ヘッダー */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 12, color: T.t3, marginBottom: 4 }}>案件</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.t1, margin: 0 }}>{project.name}</h1>
            <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              <Meta label="ジャンル" value={project.genre} />
              <Meta label="ターゲット" value={project.target} />
              <Meta label="最終生成日時" value={generatedAtLabel} />
              <Meta label="ステータス" value={statusLabel(project.status)} valueColor={statusColor(project.status)} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", minWidth: 220 }}>
            <button
              type="button"
              onClick={runGenerate}
              disabled={isGenerating}
              style={{
                background: isGenerating ? T.t3 : T.gold,
                color: "#fff",
                border: "none",
                padding: "12px 24px",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor: isGenerating ? "wait" : "pointer",
              }}
            >
              {isGenerating ? "AIで分析・生成中…" : result ? "再生成（AI分析）" : "AI分析"}
            </button>
            <Link href={`/monetize/${project.id}/edit`} style={{ fontSize: 13, color: T.gold }}>
              案件を編集
            </Link>
          </div>
        </div>

        {/* 履歴選択UI */}
        <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, color: T.t3 }}>履歴選択:</label>
          <select
            value={selectedHistoryId}
            onChange={(e) => onSelectHistory(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${T.bd}`,
              background: T.bg2,
              fontSize: 13,
              color: T.t1,
              minWidth: 280,
            }}
          >
            <option value="latest">最新の生成結果</option>
            {histories.map((h) => (
              <option key={h.id} value={h.id} disabled={h.status !== "SUCCESS"}>
                {formatDate(h.createdAt)} — {historyStatusLabel(h.status)}{h.status === "SUCCESS" ? "" : "（選択不可）"}
              </option>
            ))}
          </select>
          {historiesError && (
            <span style={{ fontSize: 12, color: T.dn }}>{historiesError}</span>
          )}
        </div>
      </div>

      {/* エラー */}
      {error && (
        <div style={{ ...cardStyle, background: "rgba(224,46,36,0.06)", borderColor: T.dn }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ color: T.dn, fontSize: 14, fontWeight: 600 }}>{error}</div>
            <button type="button" onClick={runGenerate} disabled={isGenerating} style={btnSecondary}>
              再試行
            </button>
          </div>
        </div>
      )}

      {/* タブ */}
      <div style={cardStyle}>
        <div style={{
          display: "flex",
          gap: 4,
          borderBottom: `1px solid ${T.bd}`,
          marginBottom: 20,
          overflowX: "auto",
        }}>
          {ALL_CATEGORIES.map((cat) => {
            const isActive = activeTab === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveTab(cat)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${isActive ? T.gold : "transparent"}`,
                  color: isActive ? T.gold : T.t2,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 14,
                  padding: "10px 16px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>

        <div>
          {!result ? (
            <EmptyState />
          ) : (
            <TabContent category={activeTab} result={result} />
          )}
          {result && resultCreatedAt && (
            <div style={{ marginTop: 16, fontSize: 11, color: T.t3, textAlign: "right" }}>
              保存日時: {formatDate(resultCreatedAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: T.t3 }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>まだ生成結果がありません</div>
      <div style={{ fontSize: 13 }}>「AI分析」ボタンを押して生成してください</div>
    </div>
  );
}

function TabContent({ category, result }: { category: GenerationCategory; result: RawOutputJson }) {
  switch (category) {
    case "analysis": return <AnalysisTab data={result.analysis} />;
    case "article":  return <ArticleTab  data={result.article}  />;
    case "sns":      return <SnsTab      data={result.sns}      />;
    case "reel":     return <ReelTab     data={result.reel}     />;
    case "line":     return <LineTab     data={result.line}     />;
    case "cta":      return <CtaTab      data={result.cta}      />;
    case "compliance": return <ComplianceTab data={result.compliance} />;
  }
}

function AnalysisTab({ data }: { data: AnalysisJson }) {
  const fullText = [
    `【商品・サービス概要】\n${data.summary}`,
    `【売れる訴求ポイント】\n${data.appeal_points.map((p) => `・${p}`).join("\n")}`,
    `【想定読者ニーズ】\n${data.target_needs.map((p) => `・${p}`).join("\n")}`,
    `【販売導線の提案】\n${data.content_strategy}`,
  ].join("\n\n");
  return (
    <Section text={fullText}>
      <SubBlock title="商品・サービス概要">{data.summary}</SubBlock>
      <SubBlock title="売れる訴求ポイント"><Bullets items={data.appeal_points} /></SubBlock>
      <SubBlock title="想定読者ニーズ"><Bullets items={data.target_needs} /></SubBlock>
      <SubBlock title="販売導線の提案">{data.content_strategy}</SubBlock>
    </Section>
  );
}

function ArticleTab({ data }: { data: ArticleJson }) {
  const fullText = `【タイトル】\n${data.title}\n\n【導入文】\n${data.lead}\n\n【見出し構成】\n${data.outline.map((p) => `・${p}`).join("\n")}\n\n【本文】\n${data.body}`;
  return (
    <Section text={fullText}>
      <SubBlock title="タイトル">{data.title}</SubBlock>
      <SubBlock title="導入文">{data.lead}</SubBlock>
      <SubBlock title="見出し構成"><Bullets items={data.outline} /></SubBlock>
      <SubBlock title="本文"><PreText>{data.body}</PreText></SubBlock>
    </Section>
  );
}

function SnsTab({ data }: { data: SnsJson }) {
  const fullText = data.posts.map((p, i) => `【${p.platform} 投稿${i + 1}】\n${p.text}`).join("\n\n");
  return (
    <Section text={fullText}>
      {data.posts.map((p, i) => (
        <SubBlock key={i} title={`${p.platform} 投稿 ${i + 1}`}>
          <PreText>{p.text}</PreText>
        </SubBlock>
      ))}
    </Section>
  );
}

function ReelTab({ data }: { data: ReelJson }) {
  const fullText = `【冒頭3秒フック】\n${data.hook}\n\n【シーン構成】\n${data.scenes.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n【ナレーション・台本】\n${data.script}\n\n【キャプション案】\n${data.caption}`;
  return (
    <Section text={fullText}>
      <SubBlock title="冒頭3秒フック">{data.hook}</SubBlock>
      <SubBlock title="シーン構成"><Bullets items={data.scenes} numbered /></SubBlock>
      <SubBlock title="ナレーション・台本"><PreText>{data.script}</PreText></SubBlock>
      <SubBlock title="キャプション案"><PreText>{data.caption}</PreText></SubBlock>
    </Section>
  );
}

function LineTab({ data }: { data: LineJson }) {
  const fullText = `【短文配信】\n${data.short_message}\n\n【通常配信】\n${data.standard_message}\n\n【CTA付き配信】\n${data.cta_message}`;
  return (
    <Section text={fullText}>
      <SubBlock title="短文配信"><PreText>{data.short_message}</PreText></SubBlock>
      <SubBlock title="通常配信"><PreText>{data.standard_message}</PreText></SubBlock>
      <SubBlock title="CTA付き配信"><PreText>{data.cta_message}</PreText></SubBlock>
    </Section>
  );
}

function CtaTab({ data }: { data: CtaJson }) {
  const fullText = data.patterns.map((p, i) => `${i + 1}. ${p}`).join("\n");
  return (
    <Section text={fullText}>
      <SubBlock title="CTA文パターン"><Bullets items={data.patterns} numbered /></SubBlock>
    </Section>
  );
}

function ComplianceTab({ data }: { data: ComplianceJson }) {
  const fullText = data.risk_flags
    .map((r, i) => `${i + 1}. 【リスク表現】${r.text}\n   理由: ${r.reason}\n   言い換え: ${r.suggestion}`)
    .join("\n\n");
  return (
    <Section text={fullText}>
      {data.risk_flags.map((r, i) => (
        <div key={i} style={{
          padding: 12, marginBottom: 10,
          background: "rgba(232,133,0,0.08)",
          border: `1px solid ${T.warn}`,
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.warn, marginBottom: 6 }}>
            #{i + 1} リスク表現: 「{r.text}」
          </div>
          <div style={{ fontSize: 12, color: T.t2, marginBottom: 4 }}>
            <strong>理由:</strong> {r.reason}
          </div>
          <div style={{ fontSize: 12, color: T.t2 }}>
            <strong>言い換え提案:</strong> {r.suggestion}
          </div>
        </div>
      ))}
    </Section>
  );
}

// === 共通サブコンポーネント ===

function Section({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <CopyButton text={text} label="このタブをコピー" />
      </div>
      <div style={{ maxHeight: 600, overflowY: "auto", paddingRight: 8 }}>
        {children}
      </div>
    </div>
  );
}

function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: T.gold, marginBottom: 6, marginTop: 0 }}>{title}</h3>
      <div style={{ fontSize: 14, color: T.t1, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function Bullets({ items, numbered }: { items: string[]; numbered?: boolean }) {
  const Tag = numbered ? "ol" : "ul";
  return (
    <Tag style={{ paddingLeft: 20, margin: 0 }}>
      {items.map((it, i) => (
        <li key={i} style={{ marginBottom: 4 }}>{it}</li>
      ))}
    </Tag>
  );
}

function PreText({ children }: { children: string }) {
  return (
    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{children}</div>
  );
}

function Meta({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.t3 }}>{label}</div>
      <div style={{ fontSize: 13, color: valueColor ?? T.t1, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: T.bg1,
  border: `1px solid ${T.bd}`,
  borderRadius: 14,
  padding: 20,
};

const btnSecondary: React.CSSProperties = {
  background: T.bg2,
  color: T.t1,
  border: `1px solid ${T.bd}`,
  padding: "8px 16px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

function statusLabel(s: ProjectSummary["status"]): string {
  switch (s) {
    case "DRAFT": return "未生成";
    case "READY": return "生成可能";
    case "GENERATING": return "生成中";
    case "GENERATED": return "生成済み";
    case "ERROR": return "生成エラー";
  }
}

function statusColor(s: ProjectSummary["status"]): string {
  switch (s) {
    case "DRAFT": return T.t2;
    case "READY": return T.gold;
    case "GENERATING": return T.warn;
    case "GENERATED": return T.up;
    case "ERROR": return T.dn;
  }
}

function historyStatusLabel(s: HistoryItem["status"]): string {
  switch (s) {
    case "QUEUED": return "待機中";
    case "PROCESSING": return "処理中";
    case "SUCCESS": return "成功";
    case "FAILED": return "失敗";
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}
