import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Optional

DB_PATH = Path(__file__).parent / "data" / "bussan.db"


class Database:
    def __init__(self):
        DB_PATH.parent.mkdir(exist_ok=True)
        self.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._create_tables()

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
        """)
        self.conn.commit()
        self._migrate()

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

    def delete_purchase(self, purchase_id: int):
        self.conn.execute("DELETE FROM listings WHERE purchase_id = ?", (purchase_id,))
        self.conn.execute("DELETE FROM purchases WHERE id = ?", (purchase_id,))
        self.conn.commit()

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
        仕入れIDから直接売上を記録する（簡易版）
        listingsテーブルを自動で作成してsalesに記録。純利益を返す。
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

        # listing を自動作成
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
        self.conn.commit()
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
        # 重複チェック
        if not any(i['keyword'] == keyword for i in items):
            items.append({'keyword': keyword, 'sell_platform': sell_platform,
                          'target_rate': target_rate})
            self.save_watchlist(items)

    def remove_watchlist_item(self, keyword: str):
        items = [i for i in self.get_watchlist() if i['keyword'] != keyword]
        self.save_watchlist(items)
