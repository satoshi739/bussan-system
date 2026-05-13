-- ========================================================
-- 物販チェッカー: AI収益化コンテンツ生成機能 (MVP) 追加用 SQL
--
-- 目的     : 新しい3テーブル + 2 enum を本番Neonに追加するのみ
-- 安全性   : 既存テーブル(FastAPI管理含む)には一切影響しない
-- 適用方法 : Neon Console SQL Editor または psql で本SQL全体をコピペ実行
-- ロールバック : 末尾のロールバック用SQLをコメント解除して実行
-- 作成日   : 2026-05-12
-- ========================================================

BEGIN;

-- ========== 1. Enum 2つ ==========
CREATE TYPE "project_status" AS ENUM ('DRAFT', 'READY', 'GENERATING', 'GENERATED', 'ERROR');
CREATE TYPE "generation_history_status" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED');

-- ========== 2. テーブル3つ ==========
CREATE TABLE "monetize_projects" (
    "id"                          UUID            NOT NULL,
    "user_id"                     TEXT            NOT NULL,
    "name"                        VARCHAR(200)    NOT NULL,
    "genre"                       VARCHAR(100)    NOT NULL,
    "target"                      TEXT            NOT NULL,
    "product_url"                 TEXT,
    "lp_url"                      TEXT,
    "blog_url"                    TEXT,
    "affiliate_link"              TEXT,
    "memo"                        TEXT,
    "latest_generation_result_id" UUID,
    "latest_generated_at"         TIMESTAMP(3),
    "status"                      "project_status" NOT NULL DEFAULT 'DRAFT',
    "created_at"                  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                  TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "monetize_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monetize_generation_results" (
    "id"              UUID         NOT NULL,
    "project_id"      UUID         NOT NULL,
    "analysis_json"   JSONB        NOT NULL,
    "article_json"    JSONB        NOT NULL,
    "sns_json"        JSONB        NOT NULL,
    "reel_json"       JSONB        NOT NULL,
    "line_json"       JSONB        NOT NULL,
    "cta_json"        JSONB        NOT NULL,
    "compliance_json" JSONB        NOT NULL,
    "raw_output_json" JSONB        NOT NULL,
    "prompt_version"  VARCHAR(50)  NOT NULL,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "monetize_generation_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monetize_generation_histories" (
    "id"                   UUID                          NOT NULL,
    "project_id"           UUID                          NOT NULL,
    "generation_result_id" UUID,
    "input_snapshot_json"  JSONB                         NOT NULL,
    "status"               "generation_history_status"   NOT NULL,
    "error_code"           VARCHAR(50),
    "error_message"        TEXT,
    "prompt_version"       VARCHAR(50)                   NOT NULL,
    "started_at"           TIMESTAMP(3)                  NOT NULL,
    "completed_at"         TIMESTAMP(3),
    "created_at"           TIMESTAMP(3)                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "monetize_generation_histories_pkey" PRIMARY KEY ("id")
);

-- ========== 3. Index 6つ ==========
CREATE UNIQUE INDEX "monetize_projects_latest_generation_result_id_key"
    ON "monetize_projects"("latest_generation_result_id");
CREATE INDEX "monetize_projects_user_id_idx"
    ON "monetize_projects"("user_id");
CREATE INDEX "monetize_projects_status_idx"
    ON "monetize_projects"("status");
CREATE INDEX "monetize_generation_results_project_id_idx"
    ON "monetize_generation_results"("project_id");
CREATE UNIQUE INDEX "monetize_generation_histories_generation_result_id_key"
    ON "monetize_generation_histories"("generation_result_id");
CREATE INDEX "monetize_generation_histories_project_id_idx"
    ON "monetize_generation_histories"("project_id");
CREATE INDEX "monetize_generation_histories_status_idx"
    ON "monetize_generation_histories"("status");

-- ========== 4. ForeignKey 5つ ==========
ALTER TABLE "monetize_projects"
    ADD CONSTRAINT "monetize_projects_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monetize_projects"
    ADD CONSTRAINT "monetize_projects_latest_generation_result_id_fkey"
    FOREIGN KEY ("latest_generation_result_id") REFERENCES "monetize_generation_results"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "monetize_generation_results"
    ADD CONSTRAINT "monetize_generation_results_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "monetize_projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monetize_generation_histories"
    ADD CONSTRAINT "monetize_generation_histories_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "monetize_projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monetize_generation_histories"
    ADD CONSTRAINT "monetize_generation_histories_generation_result_id_fkey"
    FOREIGN KEY ("generation_result_id") REFERENCES "monetize_generation_results"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;

-- ========================================================
-- ロールバック用SQL（必要時のみコメント解除して実行）
-- ========================================================
-- BEGIN;
-- DROP TABLE IF EXISTS "monetize_generation_histories" CASCADE;
-- DROP TABLE IF EXISTS "monetize_generation_results" CASCADE;
-- DROP TABLE IF EXISTS "monetize_projects" CASCADE;
-- DROP TYPE  IF EXISTS "generation_history_status";
-- DROP TYPE  IF EXISTS "project_status";
-- COMMIT;
