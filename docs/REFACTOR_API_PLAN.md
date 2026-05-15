# api.py 分割計画

## 現状
- `api.py` 4,385行（パイロット分割後）→ 元 4,458行
- 138ルート（うち6本を `routers/calculations.py` に分離済み）

## 分割方針
- FastAPI `APIRouter` パターン
- 1セクション = 1 router ファイル
- エンドポイント名は**絶対に変更しない**（既存フロント・本番互換性のため）
- 認証 `_verify_key` は `app = FastAPI(dependencies=[...])` でグローバル設定済 → router 側で再宣言不要
- 段階的に1〜2セクションずつ分離し、毎回 Railway デプロイで動作確認

## 完了
| # | セクション | ファイル | エンドポイント数 | 状態 |
|---|---|---|---|---|
| 1 | 利益計算 | `routers/calculations.py` | 6 | ✅ 2026-05-15 |

## 残作業（優先順）

### Phase A（疎結合・低リスク）
| # | セクション | 想定ファイル | 概算エンドポイント数 |
|---|---|---|---|
| 2 | 為替レート | `routers/currency.py` | 2 |
| 3 | プラットフォーム一覧 | `routers/platforms.py` | 1 |
| 4 | 国際送料計算 | `routers/shipping_intl.py` | 2 |
| 5 | 輸入送料計算 | `routers/shipping_import.py` | 1 |
| 6 | 推奨販売価格計算 | `routers/pricing.py` | 1 |

### Phase B（DB依存中・要慎重）
| # | セクション | 想定ファイル | 概算エンドポイント数 |
|---|---|---|---|
| 7 | ダッシュボード | `routers/dashboard.py` | 4 |
| 8 | 仕入れ | `routers/purchases.py` | 12 |
| 9 | 出品 | `routers/listings.py` | 3 |
| 10 | 売上 | `routers/sales.py` | 4 |
| 11 | 設定 | `routers/settings.py` | 3 |
| 12 | 月次目標 | `routers/goals.py` | 2 |
| 13 | ウォッチリスト | `routers/watchlist.py` | 4 |
| 14 | 分析（best-products, by-platform 等） | `routers/analytics.py` | 6 |

### Phase C（スクレイピング・外部API）
| # | セクション | 想定ファイル | 概算エンドポイント数 |
|---|---|---|---|
| 15 | 相場検索（国内） | `routers/search_jp.py` | 3 |
| 16 | 相場検索（グローバル） | `routers/search_global.py` | 4 |
| 17 | eBay落札済み検索 | `routers/ebay_sold.py` | 2 |
| 18 | 全プラットフォーム相場 | `routers/market_all.py` | 1 |
| 19 | 単品利益計算 | `routers/profit_single.py` | 1 |
| 20 | 画像商品識別 | `routers/image_id.py` | 2 |
| 21 | LINE通知 | `routers/line.py` | 2 |

### Phase D（AI/エージェント・本番影響大）
| # | セクション | 想定ファイル | 概算エンドポイント数 |
|---|---|---|---|
| 22 | AI分析 | `routers/ai_analysis.py` | 4 |
| 23 | CEO エージェント | `routers/agent_ceo.py` | 6 |
| 24 | Research Agent 単体 | `routers/agent_research.py` | 1 |
| 25 | 承認キュー | `routers/approvals.py` | 4 |
| 26 | 出品文生成 | `routers/ai_listing.py` | 2 |
| 27 | SNSコンテンツ生成 | `routers/ai_sns.py` | 3 |
| 28 | SNSパフォーマンス記録 | `routers/sns_metrics.py` | 2 |
| 29 | エージェント記憶 | `routers/agent_memory.py` | 3 |
| 30 | モニタリング制御 | `routers/monitoring.py` | 2 |
| 31 | 動画生成 | `routers/video.py` | 3 |

### Phase E（管理・運用）
| # | セクション | 想定ファイル | 概算エンドポイント数 |
|---|---|---|---|
| 32 | 外注・発送管理 | `routers/fulfillment.py` | 5 |
| 33 | 発送代行業者 | `routers/vendors.py` | 4 |
| 34 | バックアップ | `routers/backup.py` | 2 |
| 35 | 為替レート強制更新 | `routers/admin_currency.py` | 1 |
| 36 | 管理者統計 | `routers/admin_stats.py` | 2 |
| 37 | ベスト商品ランキング | `routers/best_products.py` | 2 |
| 38 | 利益マトリクス計算 | `routers/profit_matrix.py` | 1 |

## 分割手順テンプレート（1セクションあたり）
1. `routers/<name>.py` 新規作成
   - `router = APIRouter()` 宣言
   - 該当セクションの Pydantic モデルと endpoint をコピー
   - `@app.xxx` を `@router.xxx` に変更
2. `api.py` から該当セクションを削除（コメントだけ「routers/<name>.py に分離」と残す）
3. `api.py` の include_router セクションに追加：`from routers import <name> as _<name>_router; app.include_router(_<name>_router.router)`
4. ローカル構文チェック：`python3 -m py_compile api.py routers/<name>.py`
5. ローカル動作確認：`python3 -c "import api; print(len(api.app.routes))"`（ルート数が変わらないこと）
6. Git commit（1セクション = 1コミット）
7. Railway デプロイ → 該当エンドポイントを実機テスト

## リスク管理
- **1度のPRで複数セクションを分割しない**（バグ発生時の特定が困難）
- 分離前に Sentry でそのエンドポイントの利用状況を確認
- 分離後は Railway ログで起動エラーが出ていないか確認
- フロントエンド（`frontend/lib/api.ts` 等）のエンドポイント呼び出しは**一切変更しない**

## 完成イメージ
- `api.py` 4,458行 → 約 400行（app初期化・lifespan・include_router のみ）
- `routers/` 配下 38ファイル
- 編集時の影響範囲が局所化、Sentryエラーの追跡が容易に
