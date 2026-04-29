"""
Monitor — 24時間自動監視・定期実行
- 毎朝スキャンを自動実行してLINEに通知
- 売れ残り在庫を監視して警告
- 週次レポートを自動生成
- api.py から background thread として起動される
"""

import schedule
import time
import json
import threading
from datetime import datetime, timedelta
from pathlib import Path


# ── 通知 ────────────────────────────────────────────────────────────

def _send_line(token: str, message: str) -> bool:
    try:
        import requests
        resp = requests.post(
            "https://notify-api.line.me/api/notify",
            headers={"Authorization": f"Bearer {token}"},
            data={"message": message},
            timeout=10,
        )
        return resp.status_code == 200
    except Exception:
        return False


def _get_settings_and_db():
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from database import Database
    db = Database()
    return db.get_settings(), db


# ── 定期タスク ───────────────────────────────────────────────────────

def daily_scan():
    """毎朝自動スキャン: 登録キーワードをスキャンしてLINE通知"""
    print(f"[Monitor] daily_scan 開始: {datetime.now().isoformat()}")
    try:
        settings, db = _get_settings_and_db()
        api_key = settings.get("anthropic_api_key", "").strip()
        line_token = settings.get("line_notify_token", "").strip()

        if not api_key:
            print("[Monitor] APIキー未設定のためスキップ")
            return

        from agents import CEOAgent
        agent = CEOAgent(api_key=api_key, db=db)
        result = agent.run(
            goal="今日の定期スキャンです。登録済みキーワードを全てスキャンし、利益率25%以上の候補を承認キューに追加してください。季節トレンドも考慮してください。",
            max_turns=10,
        )

        queued = result.get("queued_count", 0)
        scanned = result.get("scanned_count", 0)

        # セッションをDBに保存
        session_id = db.create_agent_session("自動デイリースキャン", None)
        db.update_agent_session(session_id, {
            "status": "completed",
            "scanned_count": scanned,
            "queued_count": queued,
            "report": json.dumps(result.get("report", {}), ensure_ascii=False),
            "completed_at": datetime.now().isoformat(),
        })

        if line_token:
            if queued > 0:
                msg = (
                    f"\n🌅 【毎朝スキャン完了】\n"
                    f"スキャン: {scanned}件 / 候補: {queued}件\n"
                    f"承認キューを確認して購入を承認してください！"
                )
            else:
                msg = (
                    f"\n🌅 【毎朝スキャン完了】\n"
                    f"スキャン: {scanned}件 — 本日は有望な候補なし"
                )
            _send_line(line_token, msg)

        print(f"[Monitor] daily_scan 完了: queued={queued}")

    except Exception as e:
        print(f"[Monitor] daily_scan エラー: {e}")


def check_stale_inventory():
    """売れ残り在庫チェック: 30日以上売れていない商品をLINEで警告"""
    print(f"[Monitor] stale_inventory チェック: {datetime.now().isoformat()}")
    try:
        settings, db = _get_settings_and_db()
        line_token = settings.get("line_notify_token", "").strip()
        if not line_token:
            return

        threshold = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        stale = db.conn.execute("""
            SELECT p.product_name, p.purchase_price, p.purchase_date, p.platform
            FROM purchases p
            WHERE p.purchase_date <= ?
              AND p.status NOT IN ('sold', 'returned')
            ORDER BY p.purchase_date ASC
            LIMIT 10
        """, (threshold,)).fetchall()

        if not stale:
            return

        lines = [f"\n⚠️ 【売れ残り警告】30日以上経過した在庫が{len(stale)}件あります\n"]
        for row in stale[:5]:
            days_held = (datetime.now() - datetime.strptime(row[2], "%Y-%m-%d")).days
            lines.append(f"・{row[0][:20]} (¥{row[1]:,.0f} / {days_held}日経過)")

        if len(stale) > 5:
            lines.append(f"…他{len(stale)-5}件")
        lines.append("\n値下げか別プラットフォームへの移動を検討してください")

        _send_line(line_token, "\n".join(lines))
        print(f"[Monitor] stale_inventory: {len(stale)}件警告")

    except Exception as e:
        print(f"[Monitor] stale_inventory エラー: {e}")


def weekly_report():
    """週次レポート: 週間の売上・利益・エージェント活動をまとめてLINE送信"""
    print(f"[Monitor] weekly_report 開始: {datetime.now().isoformat()}")
    try:
        settings, db = _get_settings_and_db()
        line_token = settings.get("line_notify_token", "").strip()
        if not line_token:
            return

        since = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

        # 週間売上
        sales = db.conn.execute("""
            SELECT COUNT(*) as count,
                   COALESCE(SUM(net_profit), 0) as total_profit,
                   COALESCE(AVG(CASE WHEN sale_price > 0 THEN net_profit / sale_price * 100 END), 0) as avg_rate
            FROM sales WHERE sale_date >= ?
        """, (since,)).fetchone()

        # 週間仕入れ
        purchases = db.conn.execute(
            "SELECT COUNT(*), COALESCE(SUM(purchase_price), 0) FROM purchases WHERE purchase_date >= ?",
            (since,)
        ).fetchone()

        # エージェントの活動
        sessions = db.conn.execute(
            "SELECT COUNT(*), COALESCE(SUM(queued_count), 0), COALESCE(SUM(scanned_count), 0) FROM agent_sessions WHERE created_at >= ?",
            (since,)
        ).fetchone()

        # 承認キュー
        pending = db.conn.execute(
            "SELECT COUNT(*) FROM agent_approval_queue WHERE status = 'pending'"
        ).fetchone()[0]

        msg = (
            f"\n📊 【週次レポート】{since} 〜 今日\n\n"
            f"💰 売上: {sales[0]}件 / 利益 ¥{sales[1]:,.0f} / 平均利益率 {sales[2]:.1f}%\n"
            f"🛒 仕入れ: {purchases[0]}件 / ¥{purchases[1]:,.0f}\n"
            f"🤖 AIスキャン: {sessions[0]}回 / {sessions[2]}件スキャン / {sessions[1]}件候補発見\n"
            f"⏳ 承認待ち: {pending}件\n\n"
            f"{'✅ 好調です！この調子で続けましょう' if sales[2] >= 25 else '📈 利益率改善の余地あり。仕入れ単価を見直しましょう'}"
        )

        _send_line(line_token, msg)
        print(f"[Monitor] weekly_report 完了")

    except Exception as e:
        print(f"[Monitor] weekly_report エラー: {e}")


def cleanup_memory():
    """期限切れの記憶を定期削除"""
    try:
        _, db = _get_settings_and_db()
        from agents import AgentMemory
        for agent_name in ["ceo", "research", "listing", "sns"]:
            AgentMemory(agent_name, db).delete_expired()
        print(f"[Monitor] memory cleanup 完了")
    except Exception as e:
        print(f"[Monitor] memory cleanup エラー: {e}")


# ── スケジューラー ────────────────────────────────────────────────────

def _load_schedule_settings() -> dict:
    """設定からスケジュール設定を読み込む"""
    try:
        _, db = _get_settings_and_db()
        settings = db.get_settings()
        return {
            "daily_scan_time": settings.get("monitor_daily_scan_time", "08:00"),
            "stale_check_enabled": settings.get("monitor_stale_check", "true") == "true",
            "weekly_report_day": settings.get("monitor_weekly_day", "monday"),
            "weekly_report_time": settings.get("monitor_weekly_time", "09:00"),
        }
    except Exception:
        return {
            "daily_scan_time": "08:00",
            "stale_check_enabled": True,
            "weekly_report_day": "monday",
            "weekly_report_time": "09:00",
        }


def setup_schedules():
    """スケジュールを設定する"""
    schedule.clear()
    cfg = _load_schedule_settings()

    # 毎朝スキャン
    schedule.every().day.at(cfg["daily_scan_time"]).do(daily_scan)
    print(f"[Monitor] 毎朝スキャン: {cfg['daily_scan_time']}")

    # 売れ残りチェック（毎日18時）
    if cfg["stale_check_enabled"]:
        schedule.every().day.at("18:00").do(check_stale_inventory)
        print("[Monitor] 売れ残りチェック: 毎日18:00")

    # 週次レポート（月曜9時）
    day = cfg["weekly_report_day"]
    time_str = cfg["weekly_report_time"]
    getattr(schedule.every(), day).at(time_str).do(weekly_report)
    print(f"[Monitor] 週次レポート: {day} {time_str}")

    # 記憶クリーンアップ（毎日深夜2時）
    schedule.every().day.at("02:00").do(cleanup_memory)

    return cfg


_monitor_thread: threading.Thread = None
_monitor_running = False


def start(reload_interval_seconds: int = 300):
    """
    バックグラウンドスレッドでモニタリングを開始する。
    reload_interval_seconds ごとにスケジュール設定を再読み込みする。
    """
    global _monitor_thread, _monitor_running

    if _monitor_running:
        return

    _monitor_running = True

    def _run():
        setup_schedules()
        reload_counter = 0
        while _monitor_running:
            schedule.run_pending()
            time.sleep(60)
            reload_counter += 60
            if reload_counter >= reload_interval_seconds:
                setup_schedules()
                reload_counter = 0

    _monitor_thread = threading.Thread(target=_run, daemon=True, name="AgentMonitor")
    _monitor_thread.start()
    print("[Monitor] バックグラウンド監視スレッド起動")


def stop():
    global _monitor_running
    _monitor_running = False
    print("[Monitor] 停止")


def get_status() -> dict:
    """現在のスケジュール状況を返す"""
    jobs = []
    for job in schedule.get_jobs():
        jobs.append({
            "job": str(job.job_func.__name__),
            "next_run": str(job.next_run),
            "interval": str(job.interval),
        })
    return {
        "running": _monitor_running,
        "thread_alive": _monitor_thread.is_alive() if _monitor_thread else False,
        "scheduled_jobs": jobs,
        "current_time": datetime.now().isoformat(),
    }
