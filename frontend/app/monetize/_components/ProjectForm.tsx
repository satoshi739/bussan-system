"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/tokens";

interface ProjectFormValue {
  name: string;
  genre: string;
  target: string;
  product_url: string;
  lp_url: string;
  blog_url: string;
  affiliate_link: string;
  memo: string;
}

interface Props {
  mode: "create" | "edit";
  projectId?: string;
  initial?: Partial<ProjectFormValue>;
}

const EMPTY: ProjectFormValue = {
  name: "",
  genre: "",
  target: "",
  product_url: "",
  lp_url: "",
  blog_url: "",
  affiliate_link: "",
  memo: "",
};

export default function ProjectForm({ mode, projectId, initial }: Props) {
  const router = useRouter();
  const [value, setValue] = useState<ProjectFormValue>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const set = <K extends keyof ProjectFormValue>(k: K, v: ProjectFormValue[K]) => {
    setValue((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const submit = async (goToGenerate: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    setGlobalError(null);
    try {
      const url =
        mode === "create"
          ? "/api/monetize/projects"
          : `/api/monetize/projects/${projectId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });

      if (res.status === 422) {
        const json = await res.json();
        const errs = (json?.errors ?? {}) as Record<string, string>;
        setErrors(errs);
        const firstKey = Object.keys(errs)[0];
        if (firstKey && fieldRefs.current[firstKey]) {
          fieldRefs.current[firstKey]!.scrollIntoView({ behavior: "smooth", block: "center" });
          (fieldRefs.current[firstKey] as HTMLInputElement).focus?.();
        }
        return;
      }

      if (!res.ok) {
        setGlobalError("保存に失敗しました。再度お試しください");
        return;
      }

      const json = await res.json();
      const id = json?.project?.id ?? projectId;
      if (goToGenerate && id) {
        router.push(`/monetize/${id}?autostart=1`);
      } else if (mode === "create" && id) {
        router.push(`/monetize/${id}`);
      } else {
        router.push("/monetize");
      }
      router.refresh();
    } catch {
      setGlobalError("保存に失敗しました。再度お試しください");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <Field
        label="案件名"
        required
        max={200}
        error={errors.name}
        fieldRef={(el) => { fieldRefs.current.name = el; }}
      >
        <input
          type="text"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          maxLength={200}
          style={inputStyle(!!errors.name)}
          placeholder="例: ○○ダイエットサプリ アフィリエイト案件"
        />
      </Field>

      <Field
        label="ジャンル"
        required
        max={100}
        error={errors.genre}
        fieldRef={(el) => { fieldRefs.current.genre = el; }}
      >
        <input
          type="text"
          value={value.genre}
          onChange={(e) => set("genre", e.target.value)}
          maxLength={100}
          style={inputStyle(!!errors.genre)}
          placeholder="例: 美容/健康/副業/金融 など"
        />
      </Field>

      <Field
        label="ターゲット"
        required
        max={500}
        error={errors.target}
        fieldRef={(el) => { fieldRefs.current.target = el; }}
      >
        <textarea
          value={value.target}
          onChange={(e) => set("target", e.target.value)}
          maxLength={500}
          rows={3}
          style={{ ...inputStyle(!!errors.target), resize: "vertical" }}
          placeholder="例: 30〜40代女性 / 産後ダイエットに悩んでいる / SNS情報をよく見る"
        />
      </Field>

      <Field
        label="商品URL"
        error={errors.product_url}
        fieldRef={(el) => { fieldRefs.current.product_url = el; }}
      >
        <input
          type="url"
          value={value.product_url}
          onChange={(e) => set("product_url", e.target.value)}
          style={inputStyle(!!errors.product_url)}
          placeholder="https://..."
        />
      </Field>

      <Field
        label="LP URL"
        error={errors.lp_url}
        fieldRef={(el) => { fieldRefs.current.lp_url = el; }}
      >
        <input
          type="url"
          value={value.lp_url}
          onChange={(e) => set("lp_url", e.target.value)}
          style={inputStyle(!!errors.lp_url)}
          placeholder="https://..."
        />
      </Field>

      <Field
        label="ブログURL"
        error={errors.blog_url}
        fieldRef={(el) => { fieldRefs.current.blog_url = el; }}
      >
        <input
          type="url"
          value={value.blog_url}
          onChange={(e) => set("blog_url", e.target.value)}
          style={inputStyle(!!errors.blog_url)}
          placeholder="https://..."
        />
      </Field>

      <Field
        label="アフィリエイトリンク"
        error={errors.affiliate_link}
        fieldRef={(el) => { fieldRefs.current.affiliate_link = el; }}
      >
        <input
          type="url"
          value={value.affiliate_link}
          onChange={(e) => set("affiliate_link", e.target.value)}
          style={inputStyle(!!errors.affiliate_link)}
          placeholder="https://..."
        />
      </Field>

      <Field
        label="メモ（任意・推奨）"
        max={2000}
        error={errors.memo}
        fieldRef={(el) => { fieldRefs.current.memo = el; }}
      >
        <textarea
          value={value.memo}
          onChange={(e) => set("memo", e.target.value)}
          maxLength={2000}
          rows={5}
          style={{ ...inputStyle(!!errors.memo), resize: "vertical" }}
          placeholder="商品の特徴・差別化ポイント・補足情報など。AI分析の精度が上がります"
        />
      </Field>

      {globalError && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(224,46,36,0.10)",
            border: `1px solid ${T.dn}`,
            color: T.dn,
            borderRadius: 10,
            fontSize: 14,
          }}
        >
          {globalError}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={submitting}
          style={btnSecondary}
        >
          戻る
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={btnPrimary}
        >
          {submitting ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={submitting}
          style={btnPrimaryEmphasized}
        >
          保存してAI分析へ進む
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  max,
  error,
  children,
  fieldRef,
}: {
  label: string;
  required?: boolean;
  max?: number;
  error?: string;
  children: React.ReactNode;
  fieldRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={fieldRef} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>
        {label}
        {required && <span style={{ color: T.dn, marginLeft: 4 }}>*</span>}
        {max && <span style={{ color: T.t3, fontWeight: 400, marginLeft: 8 }}>(最大{max}文字)</span>}
      </label>
      {children}
      {error && (
        <div style={{ color: T.dn, fontSize: 12, marginTop: 2 }}>{error}</div>
      )}
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    background: T.bg2,
    border: `1px solid ${hasError ? T.dn : T.bd}`,
    borderRadius: 10,
    color: T.t1,
    padding: "10px 12px",
    fontSize: 14,
    width: "100%",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.5,
  };
}

const btnPrimary: React.CSSProperties = {
  background: T.gold,
  color: "#fff",
  border: "none",
  padding: "10px 20px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const btnPrimaryEmphasized: React.CSSProperties = {
  ...btnPrimary,
  background: T.goldDm,
};

const btnSecondary: React.CSSProperties = {
  background: T.bg2,
  color: T.t1,
  border: `1px solid ${T.bd}`,
  padding: "10px 20px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
