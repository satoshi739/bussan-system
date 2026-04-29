import sqlite3
import json
import shutil
from datetime import date, datetime
from pathlib import Path
from typing import List, Dict, Optional

DB_PATH = Path(__file__).parent / "data" / "bussan.db"
BACKUP_DIR = Path(__file__).parent / "data" / "backups"


class Database:
    def __init__(self):
        DB_PATH.parent.mkdir(exist_ok=True)
        self.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        # WALモード: 読み書き同時アクセスの安全性向上
        self.conn.execute("PRAGMA journal_mode=WAL")
        # 外部キー制約を有効化
        self.conn.execute("PRAGMA foreign_keys=ON")
        self._create_tables()
        self._add_indexes()

    def _create_tables(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_name TEXT NOT NULL,
                platform TEXT NOT NULL,
                purchase_price REAL NOT NULL,
                purchase_shipping REAL DEFAULT 0,
                purchase_url TEXT,
                purchase_date DATE NOT NULL,
                status TEXT DEFAULT 'purchased',
                notes TEXT,
                image_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS listings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_id INTEGER REFERENCES purchases(id),
                selling_platform TEXT DEFAULT 'Amazon',
                asin TEXT,
                listing_price REAL NOT NULL,
                amazon_shipping REAL DEFAULT 0,
                use_fba INTEGER DEFAULT 0,
                category TEXT DEFAULT 'その他',
                listed_date DATE,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                listing_id INTEGER REFERENCES listings(id),
                sale_price REAL NOT NULL,
                amazon_fees REAL NOT NULL,
                net_profit REAL NOT NULL,
                sale_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fulfillment (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_id INTEGER REFERENCES purchases(id),
                worker_name TEXT,
                status TEXT DEFAULT 'waiting',
                tracking_number TEXT,
                shipping_company TEXT,
                pickup_date DATE,
                pack_date DATE,
                ship_date DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fulfillment_vendors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                vendor_type TEXT NOT NULL DEFAULT 'manual',
                connection_type TEXT NOT NULL DEFAULT 'manual',
                status TEXT DEFAULT 'inactive',
                api_key TEXT,
                api_endpoint TEXT,
                contact_email TEXT,
                line_token TEXT,
                base_fee REAL DEFAULT 0,
                per_item_fee REAL DEFAULT 0,
                supported_methods TEXT DEFAULT '[]',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fulfillment_status_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER REFERENCES fulfillment(id),
                from_status TEXT,
                to_status TEXT NOT NULL,
                changed_by TEXT DEFAULT 'user',
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fba_shipments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_name TEXT NOT NULL,
                status TEXT DEFAULT 'draft',
                destination TEXT DEFAULT 'Amazon倉庫（川越FC）',
                box_count INTEGER DEFAULT 1,
                total_items INTEGER DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sent_at TIMESTAMP,
                received_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fba_shipment_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                shipment_id INTEGER REFERENCES fba_shipments(id) ON DELETE CASCADE,
                purchase_id INTEGER REFERENCES purchases(id),
                product_name TEXT NOT NULL,
                asin TEXT,
                fnsku TEXT,
                sku TEXT,
                quantity INTEGER NOT NULL DEFAULT 1,
                box_number INTEGER DEFAULT 1,
                condition_type TEXT DEFAULT 'NewItem',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_name TEXT NOT NULL,
                asin TEXT,
                sku TEXT,
                fnsku TEXT,
                quantity INTEGER DEFAULT 0,
                reserved_quantity INTEGER DEFAULT 0,
                daily_sales REAL DEFAULT 0,
                reorder_point INTEGER DEFAULT 5,
                location TEXT DEFAULT 'FBA',
                status TEXT DEFAULT 'active',
                unit_cost REAL DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- AI エージェント: 承認キュー（CEOが発見→Satoshiが購入承認）
            CREATE TABLE IF NOT EXISTS agent_approval_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_name TEXT NOT NULL,
                buy_price REAL NOT NULL,
                buy_url TEXT,
                buy_source TEXT,
                buy_image TEXT,
                sell_platform TEXT,
                est_sell_price REAL,
                net_profit_jpy REAL,
                profit_rate REAL,
                score REAL,
                ceo_reason TEXT,
                status TEXT DEFAULT 'pending',
                approved_at TIMESTAMP,
                rejected_at TIMESTAMP,
                reject_reason TEXT,
                purchase_id INTEGER REFERENCES purchases(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- AI エージェント: 出品文草稿
            CREATE TABLE IF NOT EXISTS agent_listings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_id INTEGER REFERENCES purchases(id),
                approval_queue_id INTEGER REFERENCES agent_approval_queue(id),
                sell_platform TEXT NOT NULL,
                title TEXT,
                description TEXT,
                price REAL,
                price_currency TEXT DEFAULT 'JPY',
                tags TEXT DEFAULT '[]',
                category_suggestion TEXT,
                shipping_notes TEXT,
                seo_keywords TEXT DEFAULT '[]',
                status TEXT DEFAULT 'draft',
                published_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- AI エージェント: SNSコンテンツ
            CREATE TABLE IF NOT EXISTS agent_sns_content (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_id INTEGER REFERENCES purchases(id),
                approval_queue_id INTEGER REFERENCES agent_approval_queue(id),
                post_type TEXT DEFAULT 'listing',
                platform TEXT NOT NULL,
                content TEXT,
                hashtags TEXT DEFAULT '[]',
                status TEXT DEFAULT 'draft',
                published_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- AI エージェント: 共有記憶（学習・パターン・市場データ）
            CREATE TABLE IF NOT EXISTS agent_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_name TEXT NOT NULL,
                memory_type TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                tags TEXT DEFAULT '[]',
                importance INTEGER DEFAULT 5,
                access_count INTEGER DEFAULT 0,
                last_accessed TIMESTAMP,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- AI エージェント: CEOセッションログ
            CREATE TABLE IF NOT EXISTS agent_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                goal TEXT,
                budget_jpy REAL,
                status TEXT DEFAULT 'running',
                scanned_count INTEGER DEFAULT 0,
                queued_count INTEGER DEFAULT 0,
                report TEXT DEFAULT '{}',
                log TEXT DEFAULT '[]',
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        self.conn.commit()
        self._migrate()

    def _add_indexes(self):
        """検索パフォーマンス向上のためのインデックス（存在しない場合のみ作成）"""
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status)",
            "CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date)",
            "CREATE INDEX IF NOT EXISTS idx_purchases_platform ON purchases(platform)",
            "CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)",
            "CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status)",
            "CREATE INDEX IF NOT EXISTS idx_listings_purchase_id ON listings(purchase_id)",
            "CREATE INDEX IF NOT EXISTS idx_fulfillment_status ON fulfillment(status)",
            "CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status)",
        ]
        for sql in indexes:
            self.conn.execute(sql)
        self.conn.commit()

    def _migrate(self):
        """既存DBへのカラム追加（初回のみ実行）"""
        listing_cols = [r[1] for r in self.conn.execute("PRAGMA table_info(listings)").fetchall()]
        if 'selling_platform' not in listing_cols:
            self.conn.execute(
                "ALTER TABLE listings ADD COLUMN selling_platform TEXT DEFAULT 'Amazon'"
            )
            self.conn.commit()

        purchase_cols = [r[1] for r in self.conn.execute("PRAGMA table_info(purchases)").fetchall()]
        if 'image_data' not in purchase_cols:
            self.conn.execute("ALTER TABLE purchases ADD COLUMN image_data TEXT")
            self.conn.commit()

        fulfillment_cols = [r[1] for r in self.conn.execute("PRAGMA table_info(fulfillment)").fetchall()]
        new_fulfillment_cols = [
            ('vendor_id', 'INTEGER'),
            ('vendor_task_id', 'TEXT'),
            ('shipping_method', 'TEXT'),
            ('shipping_cost', 'REAL'),
            ('vendor_fee', 'REAL'),
            ('requested_at', 'TIMESTAMP'),
            ('recipient_name', 'TEXT'),
            ('recipient_zip', 'TEXT'),
            ('recipient_prefecture', 'TEXT'),
            ('recipient_address', 'TEXT'),
            ('recipient_phone', 'TEXT'),
            ('request_options', 'TEXT'),
        ]
        for col_name, col_type in new_fulfillment_cols:
            if col_name not in fulfillment_cols:
                self.conn.execute(f"ALTER TABLE fulfillment ADD COLUMN {col_name} {col_type}")
        self.conn.commit()

    # ===== BACKUP =====

    def backup(self) -> str:
        """DBを日付付きファイルにバックアップ。バックアップファイルのパスを返す"""
        BACKUP_DIR.mkdir(exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest = BACKUP_DIR / f"bussan_{ts}.db"
        # WALモードでも安全にコピーするためVACUUM INTO を使用
        try:
            self.conn.execute(f"VACUUM INTO '{dest}'")
        except Exception:
            # VACUUM INTOが使えない古いSQLiteはshutilでコピー
            shutil.copy2(str(DB_PATH), str(dest))
        # 直近30個だけ保持（古いものを削除）
        backups = sorted(BACKUP_DIR.glob("bussan_*.db"))
        for old in backups[:-30]:
            old.unlink(missing_ok=True)
        return str(dest)

    def list_backups(self) -> List[Dict]:
        BACKUP_DIR.mkdir(exist_ok=True)
        result = []
        for f in sorted(BACKUP_DIR.glob("bussan_*.db"), reverse=True):
            result.append({
                "filename": f.name,
                "size_kb": round(f.stat().st_size / 1024, 1),
                "created_at": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            })
        return result

    # ===== PURCHASES =====

    def add_purchase(self, data: Dict) -> int:
        cursor = self.conn.execute("""
            INSERT INTO purchases
            (product_name, platform, purchase_price, purchase_shipping,
             purchase_url, purchase_date, notes, image_data)
            VALUES (:product_name, :platform, :purchase_price, :purchase_shipping,
                    :purchase_url, :purchase_date, :notes, :image_data)
        """, {**data, 'image_data': data.get('image_data', None)})
        self.conn.commit()
        return cursor.lastrowid

    def get_purchases(self, status: str = None, platform: str = None, limit: int = None) -> List:
        conditions = []
        params = []
        if status:
            conditions.append("status = ?")
            params.append(status)
        if platform:
            conditions.append("platform = ?")
            params.append(platform)
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        lim = f"LIMIT {limit}" if limit else ""
        return self.conn.execute(
            f"SELECT * FROM purchases {where} ORDER BY purchase_date DESC {lim}",
            params
        ).fetchall()

    def update_purchase_status(self, purchase_id: int, status: str):
        self.conn.execute(
            "UPDATE purchases SET status = ? WHERE id = ?", (status, purchase_id)
        )
        self.conn.commit()

    def update_purchase(self, purchase_id: int, data: Dict):
        allowed = {"product_name", "platform", "purchase_price", "purchase_shipping",
                   "purchase_url", "purchase_date", "notes"}
        fields = {k: v for k, v in data.items() if k in allowed}
        if not fields:
            return
        set_clause = ", ".join(f"{k} = :{k}" for k in fields)
        self.conn.execute(
            f"UPDATE purchases SET {set_clause} WHERE id = :id",
            {**fields, "id": purchase_id}
        )
        self.conn.commit()

    def get_product_names(self) -> List[str]:
        rows = self.conn.execute(
            "SELECT DISTINCT product_name FROM purchases ORDER BY created_at DESC LIMIT 200"
        ).fetchall()
        return [r["product_name"] for r in rows]

    def import_purchases_csv(self, rows: List[Dict]) -> Dict:
        imported = 0
        errors = []
        for i, row in enumerate(rows, 1):
            try:
                self.add_purchase({
                    "product_name": row["product_name"],
                    "platform": row.get("platform", "その他"),
                    "purchase_price": float(str(row.get("purchase_price", 0)).replace(",", "").replace("¥", "") or 0),
                    "purchase_shipping": float(str(row.get("purchase_shipping", 0)).replace(",", "").replace("¥", "") or 0),
                    "purchase_url": row.get("purchase_url") or None,
                    "purchase_date": row.get("purchase_date") or date.today().isoformat(),
                    "notes": row.get("notes") or None,
                    "image_data": None,
                })
                imported += 1
            except Exception as e:
                errors.append(f"行{i}: {str(e)}")
        return {"imported": imported, "errors": errors}

    def delete_purchase(self, purchase_id: int):
        """仕入れと関連する出品を安全にトランザクション削除"""
        try:
            self.conn.execute("BEGIN")
            self.conn.execute("DELETE FROM listings WHERE purchase_id = ?", (purchase_id,))
            self.conn.execute("DELETE FROM purchases WHERE id = ?", (purchase_id,))
            self.conn.execute("COMMIT")
        except Exception:
            self.conn.execute("ROLLBACK")
            raise

    # ===== LISTINGS =====

    def add_listing(self, data: Dict) -> int:
        cursor = self.conn.execute("""
            INSERT INTO listings
            (purchase_id, selling_platform, asin, listing_price,
             amazon_shipping, use_fba, category, listed_date)
            VALUES (:purchase_id, :selling_platform, :asin, :listing_price,
                    :amazon_shipping, :use_fba, :category, :listed_date)
        """, data)
        self.conn.commit()
        return cursor.lastrowid

    def get_listings(self, status: str = None) -> List:
        query = """
            SELECT l.*, p.product_name, p.purchase_price, p.purchase_shipping,
                   p.platform, p.id as purchase_id
            FROM listings l
            JOIN purchases p ON l.purchase_id = p.id
        """
        if status:
            return self.conn.execute(
                query + " WHERE l.status = ? ORDER BY l.listed_date DESC", (status,)
            ).fetchall()
        return self.conn.execute(query + " ORDER BY l.listed_date DESC").fetchall()

    # ===== SALES =====

    def add_sale(self, data: Dict) -> int:
        cursor = self.conn.execute("""
            INSERT INTO sales (listing_id, sale_price, amazon_fees, net_profit, sale_date)
            VALUES (:listing_id, :sale_price, :amazon_fees, :net_profit, :sale_date)
        """, data)
        self.conn.execute(
            "UPDATE listings SET status = 'sold' WHERE id = ?", (data['listing_id'],)
        )
        self.conn.commit()
        return cursor.lastrowid

    # ===== ANALYTICS =====

    def record_sale_simple(self, purchase_id: int, sale_price: float,
                           sell_platform: str = 'メルカリ') -> float:
        """
        仕入れIDから直接売上を記録（簡易版）。
        listing・sale・購入ステータス更新をトランザクションで一括処理。
        """
        from calculators import calculate_profit
        p = self.conn.execute(
            "SELECT * FROM purchases WHERE id = ?", (purchase_id,)
        ).fetchone()
        if not p:
            return 0.0

        rv = calculate_profit(
            float(p['purchase_price']), float(sale_price), 'その他',
            purchase_shipping=float(p['purchase_shipping'] or 0),
            selling_platform=sell_platform,
        )
        net_profit = rv['gross_profit']

        try:
            self.conn.execute("BEGIN")

            cur = self.conn.execute("""
                INSERT INTO listings
                (purchase_id, selling_platform, listing_price, amazon_shipping,
                 use_fba, category, listed_date, status)
                VALUES (?, ?, ?, 0, 0, 'その他', ?, 'sold')
            """, (purchase_id, sell_platform, sale_price, date.today().isoformat()))
            listing_id = cur.lastrowid

            self.conn.execute("""
                INSERT INTO sales (listing_id, sale_price, amazon_fees, net_profit, sale_date)
                VALUES (?, ?, ?, ?, ?)
            """, (listing_id, sale_price, rv['platform_fees'], net_profit,
                  date.today().isoformat()))

            self.conn.execute(
                "UPDATE purchases SET status = 'sold' WHERE id = ?", (purchase_id,)
            )

            self.conn.execute("COMMIT")
        except Exception:
            self.conn.execute("ROLLBACK")
            raise

        return net_profit

    def get_all_sales(self) -> List:
        return self.conn.execute("""
            SELECT s.*, p.product_name, p.purchase_price, p.purchase_shipping,
                   p.platform as buy_platform, l.selling_platform
            FROM sales s
            JOIN listings l ON s.listing_id = l.id
            JOIN purchases p ON l.purchase_id = p.id
            ORDER BY s.sale_date DESC
        """).fetchall()

    def get_summary_stats(self) -> Dict:
        row = self.conn.execute("""
            SELECT
                COUNT(DISTINCT p.id) as total_purchases,
                COALESCE(SUM(p.purchase_price + p.purchase_shipping), 0) as total_invested,
                COUNT(DISTINCT CASE WHEN p.status = 'sold' THEN p.id END) as total_sold,
                COALESCE(SUM(s.net_profit), 0) as total_profit
            FROM purchases p
            LEFT JOIN listings l ON p.id = l.purchase_id
            LEFT JOIN sales s ON l.id = s.listing_id
        """).fetchone()
        return dict(row)

    def get_monthly_profit(self) -> List:
        return self.conn.execute("""
            SELECT
                strftime('%Y-%m', sale_date) as month,
                SUM(net_profit) as profit,
                COUNT(*) as sales_count
            FROM sales
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        """).fetchall()

    def get_status_breakdown(self) -> List:
        rows = self.conn.execute("""
            SELECT status, COUNT(*) as count FROM purchases GROUP BY status
        """).fetchall()
        return [(r['status'], r['count']) for r in rows]

    def get_platform_breakdown(self) -> List:
        rows = self.conn.execute("""
            SELECT platform, COUNT(*) as count FROM purchases GROUP BY platform
        """).fetchall()
        return [(r['platform'], r['count']) for r in rows]

    # ===== SETTINGS =====

    def get_settings(self) -> Dict:
        rows = self.conn.execute("SELECT key, value FROM settings").fetchall()
        return {r['key']: r['value'] for r in rows}

    def save_settings(self, settings: Dict):
        for key, value in settings.items():
            self.conn.execute("""
                INSERT OR REPLACE INTO settings (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            """, (key, str(value)))
        self.conn.commit()

    def save_fee_settings(self, fees: Dict):
        self.conn.execute("""
            INSERT OR REPLACE INTO settings (key, value, updated_at)
            VALUES ('custom_fees', ?, CURRENT_TIMESTAMP)
        """, (json.dumps(fees),))
        self.conn.commit()

    def get_custom_fees(self) -> Optional[Dict]:
        row = self.conn.execute(
            "SELECT value FROM settings WHERE key = 'custom_fees'"
        ).fetchone()
        return json.loads(row['value']) if row else None

    # ===== WATCHLIST =====

    def get_watchlist(self) -> List[Dict]:
        row = self.conn.execute(
            "SELECT value FROM settings WHERE key = 'watchlist'"
        ).fetchone()
        return json.loads(row['value']) if row else []

    def save_watchlist(self, items: List[Dict]):
        self.conn.execute("""
            INSERT OR REPLACE INTO settings (key, value, updated_at)
            VALUES ('watchlist', ?, CURRENT_TIMESTAMP)
        """, (json.dumps(items, ensure_ascii=False),))
        self.conn.commit()

    def add_watchlist_item(self, keyword: str, sell_platform: str = 'メルカリ',
                           target_rate: float = 20.0):
        items = self.get_watchlist()
        if not any(i['keyword'] == keyword for i in items):
            items.append({'keyword': keyword, 'sell_platform': sell_platform,
                          'target_rate': target_rate})
            self.save_watchlist(items)

    def remove_watchlist_item(self, keyword: str):
        items = [i for i in self.get_watchlist() if i['keyword'] != keyword]
        self.save_watchlist(items)

    # ===== API使用量カウンター =====

    def get_monthly_api_calls(self, api_name: str) -> int:
        """当月のAPI呼び出し回数を取得"""
        month = datetime.now().strftime("%Y-%m")
        key = f"api_calls_{api_name}_{month}"
        row = self.conn.execute(
            "SELECT value FROM settings WHERE key = ?", (key,)
        ).fetchone()
        return int(row['value']) if row else 0

    def increment_api_calls(self, api_name: str) -> int:
        """API呼び出し回数を1増やして返す"""
        month = datetime.now().strftime("%Y-%m")
        key = f"api_calls_{api_name}_{month}"
        current = self.get_monthly_api_calls(api_name)
        new_count = current + 1
        self.conn.execute("""
            INSERT OR REPLACE INTO settings (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        """, (key, str(new_count)))
        self.conn.commit()
        return new_count

    # ===== FULFILLMENT VENDORS =====

    def get_vendors(self) -> List:
        return self.conn.execute(
            "SELECT * FROM fulfillment_vendors ORDER BY created_at DESC"
        ).fetchall()

    def get_vendor(self, vendor_id: int):
        return self.conn.execute(
            "SELECT * FROM fulfillment_vendors WHERE id = ?", (vendor_id,)
        ).fetchone()

    def add_vendor(self, data: Dict) -> int:
        cursor = self.conn.execute("""
            INSERT INTO fulfillment_vendors
            (name, vendor_type, connection_type, status, api_key, api_endpoint,
             contact_email, line_token, base_fee, per_item_fee, supported_methods, notes)
            VALUES (:name, :vendor_type, :connection_type, :status, :api_key, :api_endpoint,
                    :contact_email, :line_token, :base_fee, :per_item_fee, :supported_methods, :notes)
        """, data)
        self.conn.commit()
        return cursor.lastrowid

    def update_vendor(self, vendor_id: int, data: Dict):
        fields = ", ".join(f"{k} = :{k}" for k in data if k != 'id')
        self.conn.execute(
            f"UPDATE fulfillment_vendors SET {fields}, updated_at = CURRENT_TIMESTAMP WHERE id = :id",
            {**data, 'id': vendor_id}
        )
        self.conn.commit()

    def delete_vendor(self, vendor_id: int):
        self.conn.execute("DELETE FROM fulfillment_vendors WHERE id = ?", (vendor_id,))
        self.conn.commit()

    # ===== FULFILLMENT STATUS LOGS =====

    def add_status_log(self, task_id: int, from_status: str, to_status: str,
                       changed_by: str = 'user', note: str = None):
        self.conn.execute("""
            INSERT INTO fulfillment_status_logs (task_id, from_status, to_status, changed_by, note)
            VALUES (?, ?, ?, ?, ?)
        """, (task_id, from_status, to_status, changed_by, note))
        self.conn.commit()

    def get_status_logs(self, task_id: int) -> List:
        return self.conn.execute(
            "SELECT * FROM fulfillment_status_logs WHERE task_id = ? ORDER BY created_at DESC",
            (task_id,)
        ).fetchall()

    def create_shipping_request(self, task_id: int, data: Dict):
        fields = ", ".join(f"{k} = :{k}" for k in data)
        self.conn.execute(
            f"UPDATE fulfillment SET {fields} WHERE id = :task_id",
            {**data, 'task_id': task_id}
        )
        self.conn.commit()

    # ===== FULFILLMENT =====

    def get_fulfillments(self, status: str = None) -> List:
        query = """
            SELECT f.*, p.product_name, p.platform, p.purchase_price,
                   p.purchase_shipping, p.purchase_url, p.purchase_date
            FROM fulfillment f
            JOIN purchases p ON f.purchase_id = p.id
        """
        if status:
            return self.conn.execute(
                query + " WHERE f.status = ? ORDER BY f.created_at DESC", (status,)
            ).fetchall()
        return self.conn.execute(query + " ORDER BY f.created_at DESC").fetchall()

    def add_fulfillment(self, data: Dict) -> int:
        cursor = self.conn.execute("""
            INSERT INTO fulfillment
            (purchase_id, worker_name, status, tracking_number, shipping_company,
             pickup_date, pack_date, ship_date, notes)
            VALUES (:purchase_id, :worker_name, :status, :tracking_number,
                    :shipping_company, :pickup_date, :pack_date, :ship_date, :notes)
        """, data)
        self.conn.commit()
        return cursor.lastrowid

    def update_fulfillment(self, fulfillment_id: int, data: Dict):
        fields = ", ".join(f"{k} = :{k}" for k in data if k != "id")
        self.conn.execute(
            f"UPDATE fulfillment SET {fields} WHERE id = :id",
            {**data, "id": fulfillment_id}
        )
        self.conn.commit()

    def delete_fulfillment(self, fulfillment_id: int):
        self.conn.execute("DELETE FROM fulfillment WHERE id = ?", (fulfillment_id,))
        self.conn.commit()

    # ===== FBA SHIPMENTS =====

    def get_fba_shipments(self) -> List:
        return self.conn.execute(
            "SELECT * FROM fba_shipments ORDER BY created_at DESC"
        ).fetchall()

    def get_fba_shipment(self, shipment_id: int):
        return self.conn.execute(
            "SELECT * FROM fba_shipments WHERE id = ?", (shipment_id,)
        ).fetchone()

    def add_fba_shipment(self, data: Dict) -> int:
        cursor = self.conn.execute("""
            INSERT INTO fba_shipments (plan_name, status, destination, box_count, notes)
            VALUES (:plan_name, :status, :destination, :box_count, :notes)
        """, data)
        self.conn.commit()
        return cursor.lastrowid

    def update_fba_shipment(self, shipment_id: int, data: Dict):
        allowed = {"plan_name", "status", "destination", "box_count", "total_items",
                   "notes", "sent_at", "received_at"}
        fields = {k: v for k, v in data.items() if k in allowed}
        if not fields:
            return
        set_clause = ", ".join(f"{k} = :{k}" for k in fields)
        self.conn.execute(
            f"UPDATE fba_shipments SET {set_clause} WHERE id = :id",
            {**fields, "id": shipment_id}
        )
        self.conn.commit()

    def delete_fba_shipment(self, shipment_id: int):
        self.conn.execute("DELETE FROM fba_shipments WHERE id = ?", (shipment_id,))
        self.conn.commit()

    def get_fba_shipment_items(self, shipment_id: int) -> List:
        return self.conn.execute(
            "SELECT * FROM fba_shipment_items WHERE shipment_id = ? ORDER BY box_number, id",
            (shipment_id,)
        ).fetchall()

    def add_fba_shipment_item(self, data: Dict) -> int:
        cursor = self.conn.execute("""
            INSERT INTO fba_shipment_items
            (shipment_id, purchase_id, product_name, asin, fnsku, sku, quantity, box_number, condition_type, notes)
            VALUES (:shipment_id, :purchase_id, :product_name, :asin, :fnsku, :sku,
                    :quantity, :box_number, :condition_type, :notes)
        """, data)
        self.conn.execute(
            "UPDATE fba_shipments SET total_items = (SELECT SUM(quantity) FROM fba_shipment_items WHERE shipment_id = ?) WHERE id = ?",
            (data['shipment_id'], data['shipment_id'])
        )
        self.conn.commit()
        return cursor.lastrowid

    def update_fba_shipment_item(self, item_id: int, data: Dict):
        allowed = {"product_name", "asin", "fnsku", "sku", "quantity", "box_number", "condition_type", "notes"}
        fields = {k: v for k, v in data.items() if k in allowed}
        if not fields:
            return
        set_clause = ", ".join(f"{k} = :{k}" for k in fields)
        self.conn.execute(
            f"UPDATE fba_shipment_items SET {set_clause} WHERE id = :id",
            {**fields, "id": item_id}
        )
        self.conn.commit()

    def delete_fba_shipment_item(self, item_id: int):
        item = self.conn.execute(
            "SELECT shipment_id FROM fba_shipment_items WHERE id = ?", (item_id,)
        ).fetchone()
        self.conn.execute("DELETE FROM fba_shipment_items WHERE id = ?", (item_id,))
        if item:
            self.conn.execute(
                "UPDATE fba_shipments SET total_items = COALESCE((SELECT SUM(quantity) FROM fba_shipment_items WHERE shipment_id = ?), 0) WHERE id = ?",
                (item['shipment_id'], item['shipment_id'])
            )
        self.conn.commit()

    # ===== INVENTORY =====

    def get_inventory(self, status: str = None) -> List:
        if status:
            return self.conn.execute(
                "SELECT * FROM inventory WHERE status = ? ORDER BY quantity ASC",
                (status,)
            ).fetchall()
        return self.conn.execute("SELECT * FROM inventory ORDER BY quantity ASC").fetchall()

    def get_inventory_item(self, item_id: int):
        return self.conn.execute("SELECT * FROM inventory WHERE id = ?", (item_id,)).fetchone()

    def add_inventory_item(self, data: Dict) -> int:
        cursor = self.conn.execute("""
            INSERT INTO inventory
            (product_name, asin, sku, fnsku, quantity, reserved_quantity, daily_sales,
             reorder_point, location, status, unit_cost)
            VALUES (:product_name, :asin, :sku, :fnsku, :quantity, :reserved_quantity,
                    :daily_sales, :reorder_point, :location, :status, :unit_cost)
        """, data)
        self.conn.commit()
        return cursor.lastrowid

    def update_inventory_item(self, item_id: int, data: Dict):
        allowed = {"product_name", "asin", "sku", "fnsku", "quantity", "reserved_quantity",
                   "daily_sales", "reorder_point", "location", "status", "unit_cost"}
        fields = {k: v for k, v in data.items() if k in allowed}
        if not fields:
            return
        fields["last_updated"] = "CURRENT_TIMESTAMP"
        set_clause = ", ".join(
            f"{k} = CURRENT_TIMESTAMP" if v == "CURRENT_TIMESTAMP" else f"{k} = :{k}"
            for k, v in fields.items()
        )
        clean = {k: v for k, v in fields.items() if v != "CURRENT_TIMESTAMP"}
        self.conn.execute(
            f"UPDATE inventory SET {set_clause} WHERE id = :id",
            {**clean, "id": item_id}
        )
        self.conn.commit()

    def delete_inventory_item(self, item_id: int):
        self.conn.execute("DELETE FROM inventory WHERE id = ?", (item_id,))
        self.conn.commit()

    # ===== AGENT: APPROVAL QUEUE =====

    def add_approval_queue_item(self, data: dict) -> int:
        cursor = self.conn.execute("""
            INSERT INTO agent_approval_queue
            (product_name, buy_price, buy_url, buy_source, buy_image,
             sell_platform, est_sell_price, net_profit_jpy, profit_rate, score, ceo_reason)
            VALUES (:product_name, :buy_price, :buy_url, :buy_source, :buy_image,
                    :sell_platform, :est_sell_price, :net_profit_jpy, :profit_rate, :score, :ceo_reason)
        """, {
            "product_name": data.get("product_name", ""),
            "buy_price": data.get("buy_price", 0),
            "buy_url": data.get("buy_url", ""),
            "buy_source": data.get("buy_source", ""),
            "buy_image": data.get("buy_image", ""),
            "sell_platform": data.get("sell_platform", ""),
            "est_sell_price": data.get("est_sell_price", 0),
            "net_profit_jpy": data.get("net_profit_jpy", 0),
            "profit_rate": data.get("profit_rate", 0),
            "score": data.get("score", 0),
            "ceo_reason": data.get("ceo_reason", ""),
        })
        self.conn.commit()
        return cursor.lastrowid

    def get_approval_queue(self, status: str = None) -> List[Dict]:
        if status:
            rows = self.conn.execute(
                "SELECT * FROM agent_approval_queue WHERE status = ? ORDER BY score DESC, created_at DESC",
                (status,)
            ).fetchall()
        else:
            rows = self.conn.execute(
                "SELECT * FROM agent_approval_queue ORDER BY created_at DESC"
            ).fetchall()
        return [dict(r) for r in rows]

    def approve_queue_item(self, item_id: int, purchase_id: int = None) -> bool:
        self.conn.execute("""
            UPDATE agent_approval_queue
            SET status = 'approved', approved_at = CURRENT_TIMESTAMP, purchase_id = ?
            WHERE id = ?
        """, (purchase_id, item_id))
        self.conn.commit()
        return True

    def reject_queue_item(self, item_id: int, reason: str = "") -> bool:
        self.conn.execute("""
            UPDATE agent_approval_queue
            SET status = 'rejected', rejected_at = CURRENT_TIMESTAMP, reject_reason = ?
            WHERE id = ?
        """, (reason, item_id))
        self.conn.commit()
        return True

    def get_approval_queue_item(self, item_id: int) -> Optional[Dict]:
        row = self.conn.execute(
            "SELECT * FROM agent_approval_queue WHERE id = ?", (item_id,)
        ).fetchone()
        return dict(row) if row else None

    # ===== AGENT: LISTINGS =====

    def add_agent_listing(self, data: dict) -> int:
        cursor = self.conn.execute("""
            INSERT INTO agent_listings
            (purchase_id, approval_queue_id, sell_platform, title, description,
             price, price_currency, tags, category_suggestion, shipping_notes, seo_keywords)
            VALUES (:purchase_id, :approval_queue_id, :sell_platform, :title, :description,
                    :price, :price_currency, :tags, :category_suggestion, :shipping_notes, :seo_keywords)
        """, {
            "purchase_id": data.get("purchase_id"),
            "approval_queue_id": data.get("approval_queue_id"),
            "sell_platform": data.get("sell_platform", ""),
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "price": data.get("price", 0),
            "price_currency": data.get("price_currency", "JPY"),
            "tags": json.dumps(data.get("tags", []), ensure_ascii=False),
            "category_suggestion": data.get("category_suggestion", ""),
            "shipping_notes": data.get("shipping_notes", ""),
            "seo_keywords": json.dumps(data.get("seo_keywords", []), ensure_ascii=False),
        })
        self.conn.commit()
        return cursor.lastrowid

    def get_agent_listings(self, purchase_id: int = None, status: str = None) -> List[Dict]:
        q = "SELECT * FROM agent_listings WHERE 1=1"
        params = []
        if purchase_id:
            q += " AND purchase_id = ?"
            params.append(purchase_id)
        if status:
            q += " AND status = ?"
            params.append(status)
        q += " ORDER BY created_at DESC"
        rows = self.conn.execute(q, params).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["tags"] = json.loads(d.get("tags") or "[]")
            d["seo_keywords"] = json.loads(d.get("seo_keywords") or "[]")
            result.append(d)
        return result

    def publish_agent_listing(self, listing_id: int) -> bool:
        self.conn.execute(
            "UPDATE agent_listings SET status = 'published', published_at = CURRENT_TIMESTAMP WHERE id = ?",
            (listing_id,)
        )
        self.conn.commit()
        return True

    # ===== AGENT: SNS CONTENT =====

    def add_agent_sns_content(self, data: dict) -> int:
        cursor = self.conn.execute("""
            INSERT INTO agent_sns_content
            (purchase_id, approval_queue_id, post_type, platform, content, hashtags)
            VALUES (:purchase_id, :approval_queue_id, :post_type, :platform, :content, :hashtags)
        """, {
            "purchase_id": data.get("purchase_id"),
            "approval_queue_id": data.get("approval_queue_id"),
            "post_type": data.get("post_type", "listing"),
            "platform": data.get("platform", ""),
            "content": data.get("content", ""),
            "hashtags": json.dumps(data.get("hashtags", []), ensure_ascii=False),
        })
        self.conn.commit()
        return cursor.lastrowid

    def get_agent_sns_content(self, purchase_id: int = None, status: str = None) -> List[Dict]:
        q = "SELECT * FROM agent_sns_content WHERE 1=1"
        params = []
        if purchase_id:
            q += " AND purchase_id = ?"
            params.append(purchase_id)
        if status:
            q += " AND status = ?"
            params.append(status)
        q += " ORDER BY created_at DESC"
        rows = self.conn.execute(q, params).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["hashtags"] = json.loads(d.get("hashtags") or "[]")
            result.append(d)
        return result

    def publish_agent_sns_content(self, content_id: int) -> bool:
        self.conn.execute(
            "UPDATE agent_sns_content SET status = 'published', published_at = CURRENT_TIMESTAMP WHERE id = ?",
            (content_id,)
        )
        self.conn.commit()
        return True

    # ===== AGENT: SESSIONS =====

    def create_agent_session(self, goal: str, budget_jpy: float = None) -> int:
        cursor = self.conn.execute(
            "INSERT INTO agent_sessions (goal, budget_jpy) VALUES (?, ?)",
            (goal, budget_jpy)
        )
        self.conn.commit()
        return cursor.lastrowid

    def update_agent_session(self, session_id: int, data: dict):
        fields = {k: v for k, v in data.items() if k in [
            "status", "scanned_count", "queued_count", "report", "log", "completed_at"
        ]}
        if not fields:
            return
        set_clause = ", ".join(f"{k} = :{k}" for k in fields)
        self.conn.execute(
            f"UPDATE agent_sessions SET {set_clause} WHERE id = :id",
            {**fields, "id": session_id}
        )
        self.conn.commit()

    def get_agent_sessions(self, limit: int = 20) -> List[Dict]:
        rows = self.conn.execute(
            "SELECT * FROM agent_sessions ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["report"] = json.loads(d.get("report") or "{}")
            except Exception:
                d["report"] = {}
            result.append(d)
        return result

    def append_agent_log(self, entry: dict):
        pass  # ログはセッション終了時にまとめて保存
