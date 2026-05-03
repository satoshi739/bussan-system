import json
import os
import threading
from datetime import date, datetime
from typing import List, Dict, Optional

import psycopg2
import psycopg2.extras


class _Cursor:
    """psycopg2 RealDictCursor を sqlite3 カーソル互換に薄くラップする"""
    def __init__(self, cur):
        self._cur = cur

    def fetchall(self):
        try:
            return self._cur.fetchall() or []
        except psycopg2.ProgrammingError:
            return []

    def fetchone(self):
        try:
            return self._cur.fetchone()
        except psycopg2.ProgrammingError:
            return None

    @property
    def lastrowid(self):
        row = self.fetchone()
        return row["id"] if row else None

    def __iter__(self):
        return iter(self.fetchall())


class _Connection:
    """
    psycopg2 接続を sqlite3 の conn.execute() インターフェース互換にラップ。
    - ? プレースホルダーを %s に自動変換
    - BEGIN / COMMIT / ROLLBACK をネイティブ処理に変換
    - OperationalError / InterfaceError 時に自動再接続 (Railway idle timeout 対策)
    """
    def __init__(self, conn):
        self._conn = conn
        self._lock = threading.Lock()

    def _reconnect(self):
        try:
            self._conn.close()
        except Exception:
            pass
        self._conn = _pg_connect()
        print("[DB] 接続を再確立しました")

    def execute(self, sql: str, params=()):
        stripped = sql.strip().upper().split()[0] if sql.strip() else ""
        if stripped == "BEGIN":
            return _Cursor(self._new_cursor())
        if stripped == "COMMIT":
            self._conn.commit()
            return _Cursor(self._new_cursor())
        if stripped == "ROLLBACK":
            self._conn.rollback()
            return _Cursor(self._new_cursor())

        sql_pg = sql.replace("?", "%s")
        with self._lock:
            try:
                cur = self._new_cursor()
                cur.execute(sql_pg, params or ())
                return _Cursor(cur)
            except (psycopg2.OperationalError, psycopg2.InterfaceError):
                # Railway idle timeout 等でコネクションが切断された場合に再接続して1回リトライ
                self._reconnect()
                cur = self._new_cursor()
                cur.execute(sql_pg, params or ())
                return _Cursor(cur)

    def executescript(self, script: str):
        statements = [s.strip() for s in script.split(";") if s.strip()]
        with self._lock:
            cur = self._new_cursor()
            for stmt in statements:
                cur.execute(stmt)
        self._conn.commit()

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def _new_cursor(self):
        return self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


def _pg_connect() -> psycopg2.extensions.connection:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL 環境変数が設定されていません")
    conn = psycopg2.connect(url)
    conn.autocommit = False
    return conn


class Database:
    def __init__(self):
        self.conn = _Connection(_pg_connect())
        self._create_tables()
        self._add_indexes()

    def close(self):
        try:
            self.conn._conn.close()
        except Exception:
            pass

    def _create_tables(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS purchases (
                id SERIAL PRIMARY KEY,
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
                id SERIAL PRIMARY KEY,
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
                id SERIAL PRIMARY KEY,
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
                id SERIAL PRIMARY KEY,
                purchase_id INTEGER REFERENCES purchases(id),
                worker_name TEXT,
                status TEXT DEFAULT 'waiting',
                tracking_number TEXT,
                shipping_company TEXT,
                pickup_date DATE,
                pack_date DATE,
                ship_date DATE,
                notes TEXT,
                vendor_id INTEGER,
                vendor_task_id TEXT,
                shipping_method TEXT,
                shipping_cost REAL,
                vendor_fee REAL,
                requested_at TIMESTAMP,
                recipient_name TEXT,
                recipient_zip TEXT,
                recipient_prefecture TEXT,
                recipient_address TEXT,
                recipient_phone TEXT,
                request_options TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fulfillment_vendors (
                id SERIAL PRIMARY KEY,
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
                id SERIAL PRIMARY KEY,
                task_id INTEGER REFERENCES fulfillment(id),
                from_status TEXT,
                to_status TEXT NOT NULL,
                changed_by TEXT DEFAULT 'user',
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fba_shipments (
                id SERIAL PRIMARY KEY,
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
                id SERIAL PRIMARY KEY,
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
                id SERIAL PRIMARY KEY,
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

            CREATE TABLE IF NOT EXISTS price_history (
                id SERIAL PRIMARY KEY,
                keyword TEXT NOT NULL,
                source TEXT NOT NULL,
                price INTEGER NOT NULL,
                checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS agent_approval_queue (
                id SERIAL PRIMARY KEY,
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

            CREATE TABLE IF NOT EXISTS agent_listings (
                id SERIAL PRIMARY KEY,
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

            CREATE TABLE IF NOT EXISTS agent_sns_content (
                id SERIAL PRIMARY KEY,
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

            CREATE TABLE IF NOT EXISTS agent_memory (
                id SERIAL PRIMARY KEY,
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

            CREATE TABLE IF NOT EXISTS agent_sessions (
                id SERIAL PRIMARY KEY,
                goal TEXT,
                budget_jpy REAL,
                status TEXT DEFAULT 'running',
                scanned_count INTEGER DEFAULT 0,
                queued_count INTEGER DEFAULT 0,
                report TEXT DEFAULT '{}',
                log TEXT DEFAULT '[]',
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self._migrate()

    def _add_indexes(self):
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
        """PostgreSQL 用: information_schema でカラム存在確認してから追加"""
        def col_exists(table: str, col: str) -> bool:
            row = self.conn.execute("""
                SELECT 1 FROM information_schema.columns
                WHERE table_name = %s AND column_name = %s
            """, (table, col)).fetchone()
            return row is not None

        # listings.selling_platform
        if not col_exists("listings", "selling_platform"):
            self.conn.execute(
                "ALTER TABLE listings ADD COLUMN selling_platform TEXT DEFAULT 'Amazon'"
            )
            self.conn.commit()

        # purchases.image_data
        if not col_exists("purchases", "image_data"):
            self.conn.execute("ALTER TABLE purchases ADD COLUMN image_data TEXT")
            self.conn.commit()

        # fulfillment extra columns
        new_fulfillment_cols = [
            ("vendor_id", "INTEGER"),
            ("vendor_task_id", "TEXT"),
            ("shipping_method", "TEXT"),
            ("shipping_cost", "REAL"),
            ("vendor_fee", "REAL"),
            ("requested_at", "TIMESTAMP"),
            ("recipient_name", "TEXT"),
            ("recipient_zip", "TEXT"),
            ("recipient_prefecture", "TEXT"),
            ("recipient_address", "TEXT"),
            ("recipient_phone", "TEXT"),
            ("request_options", "TEXT"),
        ]
        for col_name, col_type in new_fulfillment_cols:
            if not col_exists("fulfillment", col_name):
                self.conn.execute(
                    f"ALTER TABLE fulfillment ADD COLUMN {col_name} {col_type}"
                )
        self.conn.commit()

    # ===== BACKUP =====

    def backup(self) -> str:
        """pg_dump でバックアップ（DATABASE_URL が必要）"""
        import subprocess
        from pathlib import Path
        backup_dir = Path(__file__).parent / "data" / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest = backup_dir / f"bussan_{ts}.dump"
        url = os.environ.get("DATABASE_URL", "")
        result = subprocess.run(
            ["pg_dump", "--format=custom", f"--dbname={url}", f"--file={dest}"],
            capture_output=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"pg_dump failed: {result.stderr.decode()}")
        backups = sorted(backup_dir.glob("bussan_*.dump"))
        for old in backups[:-30]:
            old.unlink(missing_ok=True)
        return str(dest)

    def list_backups(self) -> List[Dict]:
        from pathlib import Path
        backup_dir = Path(__file__).parent / "data" / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        result = []
        for f in sorted(backup_dir.glob("bussan_*.dump"), reverse=True):
            result.append({
                "filename": f.name,
                "size_kb": round(f.stat().st_size / 1024, 1),
                "created_at": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            })
        return result

    # ===== PURCHASES =====

    def add_purchase(self, data: Dict) -> int:
        cur = self.conn.execute("""
            INSERT INTO purchases
            (product_name, platform, purchase_price, purchase_shipping,
             purchase_url, purchase_date, notes, image_data)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data["product_name"], data["platform"], data["purchase_price"],
            data.get("purchase_shipping", 0), data.get("purchase_url"),
            data["purchase_date"], data.get("notes"), data.get("image_data"),
        ))
        row = cur.fetchone()
        self.conn.commit()
        return row["id"]

    def get_purchases(self, status: str = None, platform: str = None, limit: int = None) -> List:
        conditions = []
        params = []
        if status:
            conditions.append("status = %s")
            params.append(status)
        if platform:
            conditions.append("platform = %s")
            params.append(platform)
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        lim = f"LIMIT {int(limit)}" if limit else ""
        return self.conn.execute(
            f"SELECT * FROM purchases {where} ORDER BY purchase_date DESC {lim}",
            params
        ).fetchall()

    def update_purchase_status(self, purchase_id: int, status: str):
        self.conn.execute(
            "UPDATE purchases SET status = %s WHERE id = %s", (status, purchase_id)
        )
        self.conn.commit()

    def update_purchase(self, purchase_id: int, data: Dict):
        allowed = {"product_name", "platform", "purchase_price", "purchase_shipping",
                   "purchase_url", "purchase_date", "notes"}
        fields = {k: v for k, v in data.items() if k in allowed}
        if not fields:
            return
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        self.conn.execute(
            f"UPDATE purchases SET {set_clause} WHERE id = %s",
            list(fields.values()) + [purchase_id]
        )
        self.conn.commit()

    def get_product_names(self) -> List[str]:
        rows = self.conn.execute(
            "SELECT DISTINCT product_name FROM purchases ORDER BY product_name LIMIT 200"
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
        try:
            # sales → listings の FK 制約: sales を先に削除する
            self.conn.execute("""
                DELETE FROM sales WHERE listing_id IN (
                    SELECT id FROM listings WHERE purchase_id = %s
                )
            """, (purchase_id,))
            self.conn.execute("DELETE FROM listings WHERE purchase_id = %s", (purchase_id,))
            self.conn.execute("DELETE FROM purchases WHERE id = %s", (purchase_id,))
            self.conn.commit()
        except Exception:
            self.conn.rollback()
            raise

    # ===== LISTINGS =====

    def add_listing(self, data: Dict) -> int:
        cur = self.conn.execute("""
            INSERT INTO listings
            (purchase_id, selling_platform, asin, listing_price,
             amazon_shipping, use_fba, category, listed_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data["purchase_id"], data.get("selling_platform", "Amazon"), data.get("asin"),
            data["listing_price"], data.get("amazon_shipping", 0), data.get("use_fba", 0),
            data.get("category", "その他"), data.get("listed_date"),
        ))
        row = cur.fetchone()
        self.conn.commit()
        return row["id"]

    def get_listings(self, status: str = None) -> List:
        query = """
            SELECT l.*, p.product_name, p.purchase_price, p.purchase_shipping,
                   p.platform, p.id as purchase_id
            FROM listings l
            JOIN purchases p ON l.purchase_id = p.id
        """
        if status:
            return self.conn.execute(
                query + " WHERE l.status = %s ORDER BY l.listed_date DESC", (status,)
            ).fetchall()
        return self.conn.execute(query + " ORDER BY l.listed_date DESC").fetchall()

    # ===== SALES =====

    def add_sale(self, data: Dict) -> int:
        cur = self.conn.execute("""
            INSERT INTO sales (listing_id, sale_price, amazon_fees, net_profit, sale_date)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data["listing_id"], data["sale_price"], data["amazon_fees"],
            data["net_profit"], data["sale_date"],
        ))
        row = cur.fetchone()
        self.conn.execute(
            "UPDATE listings SET status = 'sold' WHERE id = %s", (data["listing_id"],)
        )
        self.conn.commit()
        return row["id"]

    # ===== ANALYTICS =====

    def record_sale_simple(self, purchase_id: int, sale_price: float,
                           sell_platform: str = 'メルカリ') -> float:
        from calculators import calculate_profit
        p = self.conn.execute(
            "SELECT * FROM purchases WHERE id = %s", (purchase_id,)
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
            cur = self.conn.execute("""
                INSERT INTO listings
                (purchase_id, selling_platform, listing_price, amazon_shipping,
                 use_fba, category, listed_date, status)
                VALUES (%s, %s, %s, 0, 0, 'その他', %s, 'sold')
                RETURNING id
            """, (purchase_id, sell_platform, sale_price, date.today().isoformat()))
            listing_id = cur.fetchone()["id"]

            self.conn.execute("""
                INSERT INTO sales (listing_id, sale_price, amazon_fees, net_profit, sale_date)
                VALUES (%s, %s, %s, %s, %s)
            """, (listing_id, sale_price, rv['platform_fees'], net_profit,
                  date.today().isoformat()))

            self.conn.execute(
                "UPDATE purchases SET status = 'sold' WHERE id = %s", (purchase_id,)
            )
            self.conn.commit()
        except Exception:
            self.conn.rollback()
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
        return dict(row) if row else {}

    def get_monthly_profit(self) -> List:
        return self.conn.execute("""
            SELECT
                to_char(sale_date, 'YYYY-MM') as month,
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
                INSERT INTO settings (key, value, updated_at)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
            """, (key, str(value)))
        self.conn.commit()

    def save_fee_settings(self, fees: Dict):
        self.conn.execute("""
            INSERT INTO settings (key, value, updated_at)
            VALUES ('custom_fees', %s, CURRENT_TIMESTAMP)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
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
            INSERT INTO settings (key, value, updated_at)
            VALUES ('watchlist', %s, CURRENT_TIMESTAMP)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
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
        month = datetime.now().strftime("%Y-%m")
        key = f"api_calls_{api_name}_{month}"
        row = self.conn.execute(
            "SELECT value FROM settings WHERE key = %s", (key,)
        ).fetchone()
        return int(row['value']) if row else 0

    def increment_api_calls(self, api_name: str) -> int:
        month = datetime.now().strftime("%Y-%m")
        key = f"api_calls_{api_name}_{month}"
        new_count = self.get_monthly_api_calls(api_name) + 1
        self.conn.execute("""
            INSERT INTO settings (key, value, updated_at)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
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
            "SELECT * FROM fulfillment_vendors WHERE id = %s", (vendor_id,)
        ).fetchone()

    def add_vendor(self, data: Dict) -> int:
        cur = self.conn.execute("""
            INSERT INTO fulfillment_vendors
            (name, vendor_type, connection_type, status, api_key, api_endpoint,
             contact_email, line_token, base_fee, per_item_fee, supported_methods, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data["name"], data.get("vendor_type", "manual"), data.get("connection_type", "manual"),
            data.get("status", "inactive"), data.get("api_key"), data.get("api_endpoint"),
            data.get("contact_email"), data.get("line_token"), data.get("base_fee", 0),
            data.get("per_item_fee", 0), data.get("supported_methods", "[]"), data.get("notes"),
        ))
        row = cur.fetchone()
        self.conn.commit()
        return row["id"]

    def update_vendor(self, vendor_id: int, data: Dict):
        allowed = {"name", "vendor_type", "connection_type", "status", "api_key",
                   "api_endpoint", "contact_email", "line_token", "base_fee",
                   "per_item_fee", "supported_methods", "notes"}
        fields = {k: v for k, v in data.items() if k in allowed}
        if not fields:
            return
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        self.conn.execute(
            f"UPDATE fulfillment_vendors SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            list(fields.values()) + [vendor_id]
        )
        self.conn.commit()

    def delete_vendor(self, vendor_id: int):
        self.conn.execute("DELETE FROM fulfillment_vendors WHERE id = %s", (vendor_id,))
        self.conn.commit()

    # ===== FULFILLMENT STATUS LOGS =====

    def add_status_log(self, task_id: int, from_status: str, to_status: str,
                       changed_by: str = 'user', note: str = None):
        self.conn.execute("""
            INSERT INTO fulfillment_status_logs (task_id, from_status, to_status, changed_by, note)
            VALUES (%s, %s, %s, %s, %s)
        """, (task_id, from_status, to_status, changed_by, note))
        self.conn.commit()

    def get_status_logs(self, task_id: int) -> List:
        return self.conn.execute(
            "SELECT * FROM fulfillment_status_logs WHERE task_id = %s ORDER BY created_at DESC",
            (task_id,)
        ).fetchall()

    def create_shipping_request(self, task_id: int, data: Dict):
        allowed = {"shipping_method", "shipping_cost", "vendor_fee", "requested_at",
                   "recipient_name", "recipient_zip", "recipient_prefecture",
                   "recipient_address", "recipient_phone", "request_options",
                   "vendor_id", "vendor_task_id", "status"}
        safe = {k: v for k, v in data.items() if k in allowed}
        if not safe:
            return
        fields = ", ".join(f"{k} = %s" for k in safe)
        self.conn.execute(
            f"UPDATE fulfillment SET {fields} WHERE id = %s",
            list(safe.values()) + [task_id]
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
                query + " WHERE f.status = %s ORDER BY f.created_at DESC", (status,)
            ).fetchall()
        return self.conn.execute(query + " ORDER BY f.created_at DESC").fetchall()

    def add_fulfillment(self, data: Dict) -> int:
        cur = self.conn.execute("""
            INSERT INTO fulfillment
            (purchase_id, worker_name, status, tracking_number, shipping_company,
             pickup_date, pack_date, ship_date, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data["purchase_id"], data.get("worker_name"), data.get("status", "waiting"),
            data.get("tracking_number"), data.get("shipping_company"), data.get("pickup_date"),
            data.get("pack_date"), data.get("ship_date"), data.get("notes"),
        ))
        row = cur.fetchone()
        self.conn.commit()
        return row["id"]

    def update_fulfillment(self, fulfillment_id: int, data: Dict):
        allowed = {"worker_name", "status", "tracking_number", "shipping_company",
                   "pickup_date", "pack_date", "ship_date", "notes", "vendor_id",
                   "vendor_task_id", "shipping_method", "shipping_cost", "vendor_fee",
                   "requested_at", "recipient_name", "recipient_zip", "recipient_prefecture",
                   "recipient_address", "recipient_phone", "request_options"}
        fields = {k: v for k, v in data.items() if k in allowed}
        if not fields:
            return
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        self.conn.execute(
            f"UPDATE fulfillment SET {set_clause} WHERE id = %s",
            list(fields.values()) + [fulfillment_id]
        )
        self.conn.commit()

    def delete_fulfillment(self, fulfillment_id: int):
        self.conn.execute("DELETE FROM fulfillment WHERE id = %s", (fulfillment_id,))
        self.conn.commit()

    # ===== FBA SHIPMENTS =====

    def get_fba_shipments(self) -> List:
        return self.conn.execute(
            "SELECT * FROM fba_shipments ORDER BY created_at DESC"
        ).fetchall()

    def get_fba_shipment(self, shipment_id: int):
        return self.conn.execute(
            "SELECT * FROM fba_shipments WHERE id = %s", (shipment_id,)
        ).fetchone()

    def add_fba_shipment(self, data: Dict) -> int:
        cur = self.conn.execute("""
            INSERT INTO fba_shipments (plan_name, status, destination, box_count, notes)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data["plan_name"], data.get("status", "draft"), data.get("destination", "Amazon倉庫（川越FC）"),
            data.get("box_count", 1), data.get("notes"),
        ))
        row = cur.fetchone()
        self.conn.commit()
        return row["id"]

    def update_fba_shipment(self, shipment_id: int, data: Dict):
        allowed = {"plan_name", "status", "destination", "box_count", "total_items",
                   "notes", "sent_at", "received_at"}
        fields = {k: v for k, v in data.items() if k in allowed}
        if not fields:
            return
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        self.conn.execute(
            f"UPDATE fba_shipments SET {set_clause} WHERE id = %s",
            list(fields.values()) + [shipment_id]
        )
        self.conn.commit()

    def delete_fba_shipment(self, shipment_id: int):
        self.conn.execute("DELETE FROM fba_shipments WHERE id = %s", (shipment_id,))
        self.conn.commit()

    def get_fba_shipment_items(self, shipment_id: int) -> List:
        return self.conn.execute(
            "SELECT * FROM fba_shipment_items WHERE shipment_id = %s ORDER BY box_number, id",
            (shipment_id,)
        ).fetchall()

    def add_fba_shipment_item(self, data: Dict) -> int:
        cur = self.conn.execute("""
            INSERT INTO fba_shipment_items
            (shipment_id, purchase_id, product_name, asin, fnsku, sku, quantity, box_number, condition_type, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data["shipment_id"], data.get("purchase_id"), data["product_name"],
            data.get("asin"), data.get("fnsku"), data.get("sku"), data.get("quantity", 1),
            data.get("box_number", 1), data.get("condition_type", "NewItem"), data.get("notes"),
        ))
        row = cur.fetchone()
        self.conn.execute(
            "UPDATE fba_shipments SET total_items = (SELECT SUM(quantity) FROM fba_shipment_items WHERE shipment_id = %s) WHERE id = %s",
            (data['shipment_id'], data['shipment_id'])
        )
        self.conn.commit()
        return row["id"]

    def update_fba_shipment_item(self, item_id: int, data: Dict):
        allowed = {"product_name", "asin", "fnsku", "sku", "quantity", "box_number", "condition_type", "notes"}
        fields = {k: v for k, v in data.items() if k in allowed}
        if not fields:
            return
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        self.conn.execute(
            f"UPDATE fba_shipment_items SET {set_clause} WHERE id = %s",
            list(fields.values()) + [item_id]
        )
        self.conn.commit()

    def delete_fba_shipment_item(self, item_id: int):
        item = self.conn.execute(
            "SELECT shipment_id FROM fba_shipment_items WHERE id = %s", (item_id,)
        ).fetchone()
        self.conn.execute("DELETE FROM fba_shipment_items WHERE id = %s", (item_id,))
        if item:
            self.conn.execute(
                "UPDATE fba_shipments SET total_items = COALESCE((SELECT SUM(quantity) FROM fba_shipment_items WHERE shipment_id = %s), 0) WHERE id = %s",
                (item['shipment_id'], item['shipment_id'])
            )
        self.conn.commit()

    # ===== INVENTORY =====

    def get_inventory(self, status: str = None) -> List:
        if status:
            return self.conn.execute(
                "SELECT * FROM inventory WHERE status = %s ORDER BY quantity ASC",
                (status,)
            ).fetchall()
        return self.conn.execute("SELECT * FROM inventory ORDER BY quantity ASC").fetchall()

    def get_inventory_item(self, item_id: int):
        return self.conn.execute("SELECT * FROM inventory WHERE id = %s", (item_id,)).fetchone()

    def add_inventory_item(self, data: Dict) -> int:
        cur = self.conn.execute("""
            INSERT INTO inventory
            (product_name, asin, sku, fnsku, quantity, reserved_quantity, daily_sales,
             reorder_point, location, status, unit_cost)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data["product_name"], data.get("asin"), data.get("sku"), data.get("fnsku"),
            data.get("quantity", 0), data.get("reserved_quantity", 0), data.get("daily_sales", 0),
            data.get("reorder_point", 5), data.get("location", "FBA"), data.get("status", "active"),
            data.get("unit_cost", 0),
        ))
        row = cur.fetchone()
        self.conn.commit()
        return row["id"]

    def update_inventory_item(self, item_id: int, data: Dict):
        allowed = {"product_name", "asin", "sku", "fnsku", "quantity", "reserved_quantity",
                   "daily_sales", "reorder_point", "location", "status", "unit_cost"}
        fields = {k: v for k, v in data.items() if k in allowed}
        if not fields:
            return
        fields["last_updated"] = datetime.now()
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        self.conn.execute(
            f"UPDATE inventory SET {set_clause} WHERE id = %s",
            list(fields.values()) + [item_id]
        )
        self.conn.commit()

    def delete_inventory_item(self, item_id: int):
        self.conn.execute("DELETE FROM inventory WHERE id = %s", (item_id,))
        self.conn.commit()

    # ===== AGENT: APPROVAL QUEUE =====

    def add_approval_queue_item(self, data: dict) -> int:
        cur = self.conn.execute("""
            INSERT INTO agent_approval_queue
            (product_name, buy_price, buy_url, buy_source, buy_image,
             sell_platform, est_sell_price, net_profit_jpy, profit_rate, score, ceo_reason)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data.get("product_name", ""), data.get("buy_price", 0), data.get("buy_url", ""),
            data.get("buy_source", ""), data.get("buy_image", ""), data.get("sell_platform", ""),
            data.get("est_sell_price", 0), data.get("net_profit_jpy", 0), data.get("profit_rate", 0),
            data.get("score", 0), data.get("ceo_reason", ""),
        ))
        row = cur.fetchone()
        self.conn.commit()
        return row["id"]

    def get_approval_queue(self, status: str = None) -> List[Dict]:
        if status:
            rows = self.conn.execute(
                "SELECT * FROM agent_approval_queue WHERE status = %s ORDER BY score DESC, created_at DESC",
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
            SET status = 'approved', approved_at = CURRENT_TIMESTAMP, purchase_id = %s
            WHERE id = %s
        """, (purchase_id, item_id))
        self.conn.commit()
        return True

    def reject_queue_item(self, item_id: int, reason: str = "") -> bool:
        self.conn.execute("""
            UPDATE agent_approval_queue
            SET status = 'rejected', rejected_at = CURRENT_TIMESTAMP, reject_reason = %s
            WHERE id = %s
        """, (reason, item_id))
        self.conn.commit()
        return True

    def get_approval_queue_item(self, item_id: int) -> Optional[Dict]:
        row = self.conn.execute(
            "SELECT * FROM agent_approval_queue WHERE id = %s", (item_id,)
        ).fetchone()
        return dict(row) if row else None

    # ===== AGENT: LISTINGS =====

    def add_agent_listing(self, data: dict) -> int:
        cur = self.conn.execute("""
            INSERT INTO agent_listings
            (purchase_id, approval_queue_id, sell_platform, title, description,
             price, price_currency, tags, category_suggestion, shipping_notes, seo_keywords)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data.get("purchase_id"), data.get("approval_queue_id"), data.get("sell_platform", ""),
            data.get("title", ""), data.get("description", ""), data.get("price", 0),
            data.get("price_currency", "JPY"), json.dumps(data.get("tags", []), ensure_ascii=False),
            data.get("category_suggestion", ""), data.get("shipping_notes", ""),
            json.dumps(data.get("seo_keywords", []), ensure_ascii=False),
        ))
        row = cur.fetchone()
        self.conn.commit()
        return row["id"]

    def get_agent_listings(self, purchase_id: int = None, status: str = None) -> List[Dict]:
        conditions = ["1=1"]
        params = []
        if purchase_id:
            conditions.append("purchase_id = %s")
            params.append(purchase_id)
        if status:
            conditions.append("status = %s")
            params.append(status)
        rows = self.conn.execute(
            f"SELECT * FROM agent_listings WHERE {' AND '.join(conditions)} ORDER BY created_at DESC",
            params
        ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["tags"] = json.loads(d.get("tags") or "[]")
            d["seo_keywords"] = json.loads(d.get("seo_keywords") or "[]")
            result.append(d)
        return result

    def publish_agent_listing(self, listing_id: int) -> bool:
        self.conn.execute(
            "UPDATE agent_listings SET status = 'published', published_at = CURRENT_TIMESTAMP WHERE id = %s",
            (listing_id,)
        )
        self.conn.commit()
        return True

    # ===== AGENT: SNS CONTENT =====

    def add_agent_sns_content(self, data: dict) -> int:
        cur = self.conn.execute("""
            INSERT INTO agent_sns_content
            (purchase_id, approval_queue_id, post_type, platform, content, hashtags)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data.get("purchase_id"), data.get("approval_queue_id"), data.get("post_type", "listing"),
            data.get("platform", ""), data.get("content", ""),
            json.dumps(data.get("hashtags", []), ensure_ascii=False),
        ))
        row = cur.fetchone()
        self.conn.commit()
        return row["id"]

    def get_agent_sns_content(self, purchase_id: int = None, status: str = None) -> List[Dict]:
        conditions = ["1=1"]
        params = []
        if purchase_id:
            conditions.append("purchase_id = %s")
            params.append(purchase_id)
        if status:
            conditions.append("status = %s")
            params.append(status)
        rows = self.conn.execute(
            f"SELECT * FROM agent_sns_content WHERE {' AND '.join(conditions)} ORDER BY created_at DESC",
            params
        ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["hashtags"] = json.loads(d.get("hashtags") or "[]")
            result.append(d)
        return result

    def publish_agent_sns_content(self, content_id: int) -> bool:
        self.conn.execute(
            "UPDATE agent_sns_content SET status = 'published', published_at = CURRENT_TIMESTAMP WHERE id = %s",
            (content_id,)
        )
        self.conn.commit()
        return True

    # ===== AGENT: SESSIONS =====

    def create_agent_session(self, goal: str, budget_jpy: float = None) -> int:
        cur = self.conn.execute(
            "INSERT INTO agent_sessions (goal, budget_jpy) VALUES (%s, %s) RETURNING id",
            (goal, budget_jpy)
        )
        row = cur.fetchone()
        self.conn.commit()
        return row["id"]

    def update_agent_session(self, session_id: int, data: dict):
        fields = {k: v for k, v in data.items() if k in [
            "status", "scanned_count", "queued_count", "report", "log", "completed_at"
        ]}
        if not fields:
            return
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        self.conn.execute(
            f"UPDATE agent_sessions SET {set_clause} WHERE id = %s",
            list(fields.values()) + [session_id]
        )
        self.conn.commit()

    def get_agent_sessions(self, limit: int = 20) -> List[Dict]:
        rows = self.conn.execute(
            "SELECT * FROM agent_sessions ORDER BY created_at DESC LIMIT %s", (limit,)
        ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["report"] = json.loads(d.get("report") or "{}")
            except Exception:
                d["report"] = {}
            try:
                d["log"] = json.loads(d.get("log") or "[]")
            except Exception:
                d["log"] = []
            result.append(d)
        return result

    def append_agent_log(self, entry: dict):
        """直近セッション(running状態)のログ配列に entry を追記する"""
        row = self.conn.execute(
            "SELECT id, log FROM agent_sessions WHERE status = 'running' ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
        if not row:
            return
        try:
            current_log = json.loads(row["log"] or "[]")
        except Exception:
            current_log = []
        current_log.append(entry)
        self.conn.execute(
            "UPDATE agent_sessions SET log = %s WHERE id = %s",
            (json.dumps(current_log, ensure_ascii=False), row["id"])
        )
        self.conn.commit()
