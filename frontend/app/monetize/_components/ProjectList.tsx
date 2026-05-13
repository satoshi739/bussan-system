"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { T } from "@/lib/tokens";

type ProjectListItem = {
  id: string;
  name: string;
  genre: string;
  target: string;
  status: "DRAFT" | "READY" | "GENERATING" | "GENERATED" | "ERROR";
  latestGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

interface Props {
  projects: ProjectListItem[];
}

export default function ProjectList({ projects }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.genre.toLowerCase().includes(q) ||
        p.target.toLowerCase().includes(q),
    );
  }, [projects, query]);

  if (projects.length === 0) {
    return (
      <div style={{
        background: T.bg1,
        border: `1px solid ${T.bd}`,
        borderRadius: 14,
        padding: 48,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.t1, marginBottom: 8 }}>
          まだプロジェクトがありません
        </div>
        <div style={{ fontSize: 13, color: T.t3, marginBottom: 20 }}>
          案件情報を入力して、AIで収益化コンテンツを一括生成しましょう
        </div>
        <Link href="/monetize/new" style={{
          display: "inline-block",
          background: T.gold,
          color: "#fff",
          padding: "10px 24px",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
        }}>
          新規プロジェクト作成
        </Link>
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="案件名・ジャンル・ターゲットで検索..."
        style={{
          width: "100%",
          padding: "10px 14px",
          fontSize: 14,
          border: `1px solid ${T.bd}`,
          borderRadius: 10,
          background: T.bg2,
          color: T.t1,
          marginBottom: 16,
          outline: "none",
        }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/monetize/${p.id}`}
            style={{
              background: T.bg1,
              border: `1px solid ${T.bd}`,
              borderRadius: 14,
              padding: 18,
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              transition: "transform 0.15s, border-color 0.15s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.t1, margin: 0, flex: 1 }}>
                {p.name}
              </h3>
              <StatusBadge status={p.status} />
            </div>
            <div style={{ fontSize: 12, color: T.t3 }}>
              <span>{p.genre}</span>
              <span style={{ margin: "0 6px" }}>·</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block", maxWidth: 200, verticalAlign: "bottom" }}>
                {p.target}
              </span>
            </div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
              <span>作成: {formatDate(p.createdAt)}</span>
              <span>最終生成: {p.latestGeneratedAt ? formatDate(p.latestGeneratedAt) : "—"}</span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: T.t3, fontSize: 13 }}>
          検索条件に該当するプロジェクトがありません
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ProjectListItem["status"] }) {
  const map: Record<typeof status, { label: string; bg: string; color: string }> = {
    DRAFT:      { label: "未生成",   bg: "rgba(8,13,28,0.06)",  color: T.t2 },
    READY:      { label: "生成可能", bg: "rgba(0,111,230,0.10)", color: T.gold },
    GENERATING: { label: "生成中",   bg: "rgba(232,133,0,0.12)", color: T.warn },
    GENERATED:  { label: "生成済み", bg: "rgba(30,156,60,0.12)", color: T.up },
    ERROR:      { label: "エラー",   bg: "rgba(224,46,36,0.12)", color: T.dn },
  };
  const m = map[status];
  return (
    <span style={{
      background: m.bg, color: m.color,
      fontSize: 11, fontWeight: 700,
      padding: "3px 8px", borderRadius: 999,
      whiteSpace: "nowrap",
    }}>{m.label}</span>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}
