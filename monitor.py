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


def _get_db():
    """呼び出し元が必ず close() する前提の Database インスタンスを返す"""
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from database import Database
    return Database()


def _get_all_user_ids(db) -> list:
    """settingsテーブルに存在するユーザーID一覧を返す（'default' を先頭に）"""
    rows = db.conn.execute(
        "SELECT DISTINCT user_id FROM settings ORDER BY user_id"
    ).fetchall()
    ids = [r["user_id"] for r in rows]
    if not ids:
        ids = ["default"]
    return ids


# ── 定期タスク ───────────────────────────────────────────────────────

def _run_domestic_notify(db, line_token: str):
    """登録済みキーワードで国内転売スキャンを実行し、高ROI商品をLINEに通知する。"""
    try:
        from profit_scanner import scan_keyword_domestic
        keywords = db.load_scan_keywords() if hasattr(db, 'load_scan_keywords') else []
        if not keywords:
            return

        all_hits = []
        for kw_conf in keywords[:5]:  # 最大5キーワードに絞る
            keyword = kw_conf.get('keyword', '')
            if not keyword:
                continue
            results = scan_keyword_domestic(keyword, sell_platform='Amazon', min_profit_rate=20.0, limit=8)
            hits = [r for r in results if r.get('roi', 0) >= 50 and r.get('net_profit_jpy', 0) >= 2000]
            for h in hits:
                h['scan_keyword'] = keyword
            all_hits.extend(hits)

        if not all_hits:
            return

        all_hits.sort(key=lambda x: x.get('roi', 0), reverse=True)
        lines = [f'\n🔥 高利益商品 {len(all_hits)}件 発見！']
        for r in all_hits[:5]:
            lines.append(
                f'\n▶ {r["scan_keyword"]} / ROI {r["roi"]}%\n'
                f'  仕入れ ¥{r["buy_price"]:,} → 利益 ¥{r["net_profit_jpy"]:,}\n'
                f'  {r["name"][:28]}\n'
                f'  {r["buy_url"]}'
            )
        _send_line(line_token, '\n'.join(lines))
        print(f"[Monitor] 国内転売通知: {len(all_hits)}件")
    except Exception as e:
        print(f"[Monitor] 国内転売通知エラー: {e}")


def _daily_scan_for_user(db, user_id: str):
    """指定ユーザーの毎朝スキャンを実行する"""
    settings = db.get_settings(user_id=user_id)
    api_key = settings.get("anthropic_api_key", "").strip()
    line_token = settings.get("line_token", "").strip()

    if not api_key:
        return

    from agents import CEOAgent
    agent = CEOAgent(api_key=api_key, db=db)
    result = agent.run(
        goal="今日の定期スキャンです。登録済みキーワードを全てスキャンし、利益率25%以上の候補を承認キューに追加してください。季節トレンドも考慮してください。",
        max_turns=10,
    )

    queued = result.get("queued_count", 0)
    scanned = result.get("scanned_count", 0)

    session_id = db.create_agent_session("自動デイリースキャン", user_id=user_id)
    db.update_agent_session(session_id, {
        "status": "completed",
        "scanned_count": scanned,
        "queued_count": queued,
        "report": json.dumps(result.get("report", {}), ensure_ascii=False),
        "log": json.dumps(result.get("log", []), ensure_ascii=False),
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
        _run_domestic_notify(db, line_token)

    print(f"[Monitor] daily_scan user={user_id} 完了: queued={queued}")


def daily_scan():
    """毎朝自動スキャン: 全ユーザーの登録キーワードをスキャンしてLINE通知"""
    print(f"[Monitor] daily_scan 開始: {datetime.now().isoformat()}")
    db = None
    try:
        db = _get_db()
        for user_id in _get_all_user_ids(db):
            try:
                _daily_scan_for_user(db, user_id)
            except Exception as e:
                print(f"[Monitor] daily_scan user={user_id} エラー: {e}")
    except Exception as e:
        print(f"[Monitor] daily_scan エラー: {e}")
    finally:
        if db:
            db.close()


def _check_stale_inventory_for_user(db, user_id: str):
    """指定ユーザーの売れ残り在庫をチェックしてLINE通知する"""
    settings = db.get_settings(user_id=user_id)
    line_token = settings.get("line_token", "").strip()
    if not line_token:
        return

    threshold = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    stale = db.conn.execute("""
        SELECT p.product_name, p.purchase_price, p.purchase_date, p.platform
        FROM purchases p
        WHERE p.user_id = %s
          AND p.purchase_date IS NOT NULL
          AND p.purchase_date <= %s
          AND p.status NOT IN ('sold', 'returned')
        ORDER BY p.purchase_date ASC
        LIMIT 10
    """, (user_id, threshold)).fetchall()

    if not stale:
        return

    lines = [f"\n⚠️ 【売れ残り警告】30日以上経過した在庫が{len(stale)}件あります\n"]
    for row in stale[:5]:
        purchase_date = row["purchase_date"]
        if isinstance(purchase_date, str):
            purchase_date = datetime.strptime(purchase_date, "%Y-%m-%d").date()
        days_held = (datetime.now().date() - purchase_date).days
        price = row["purchase_price"]
        price_str = f"¥{price:,.0f}" if price is not None else "不明"
        lines.append(f"・{row['product_name'][:20]} ({price_str} / {days_held}日経過)")

    if len(stale) > 5:
        lines.append(f"…他{len(stale)-5}件")
    lines.append("\n値下げか別プラットフォームへの移動を検討してください")

    _send_line(line_token, "\n".join(lines))
    print(f"[Monitor] stale_inventory user={user_id}: {len(stale)}件警告")


def check_stale_inventory():
    """売れ残り在庫チェック: 全ユーザーの30日以上売れていない商品をLINEで警告"""
    print(f"[Monitor] stale_inventory チェック: {datetime.now().isoformat()}")
    db = None
    try:
        db = _get_db()
        for user_id in _get_all_user_ids(db):
            try:
                _check_stale_inventory_for_user(db, user_id)
            except Exception as e:
                print(f"[Monitor] stale_inventory user={user_id} エラー: {e}")
    except Exception as e:
        print(f"[Monitor] stale_inventory エラー: {e}")
    finally:
        if db:
            db.close()


def _weekly_report_for_user(db, user_id: str):
    """指定ユーザーの週次レポートを生成してLINE送信する"""
    settings = db.get_settings(user_id=user_id)
    line_token = settings.get("line_token", "").strip()
    if not line_token:
        return

    since = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    sales = db.conn.execute("""
        SELECT COUNT(*) as count,
               COALESCE(SUM(net_profit), 0) as total_profit,
               COALESCE(AVG(CASE WHEN sale_price > 0 THEN net_profit / sale_price * 100 END), 0) as avg_rate
        FROM sales WHERE user_id = %s AND sale_date >= %s
    """, (user_id, since)).fetchone()

    purchases = db.conn.execute(
        "SELECT COUNT(*) as purchase_count, COALESCE(SUM(purchase_price), 0) as purchase_total"
        " FROM purchases WHERE user_id = %s AND purchase_date >= %s",
        (user_id, since)
    ).fetchone()

    sessions = db.conn.execute(
        "SELECT COUNT(*) as session_count,"
        " COALESCE(SUM(queued_count), 0) as queued_total,"
        " COALESCE(SUM(scanned_count), 0) as scanned_total"
        " FROM agent_sessions WHERE user_id = %s AND created_at >= %s",
        (user_id, since)
    ).fetchone()

    pending = db.conn.execute(
        "SELECT COUNT(*) as pending_count FROM agent_approval_queue WHERE user_id = %s AND status = 'pending'",
        (user_id,)
    ).fetchone()["pending_count"]

    msg = (
        f"\n📊 【週次レポート】{since} 〜 今日\n\n"
        f"💰 売上: {sales['count']}件 / 利益 ¥{sales['total_profit']:,.0f} / 平均利益率 {sales['avg_rate']:.1f}%\n"
        f"🛒 仕入れ: {purchases['purchase_count']}件 / ¥{purchases['purchase_total']:,.0f}\n"
        f"🤖 AIスキャン: {sessions['session_count']}回 / {sessions['scanned_total']}件スキャン / {sessions['queued_total']}件候補発見\n"
        f"⏳ 承認待ち: {pending}件\n\n"
        f"{'✅ 好調です！この調子で続けましょう' if sales['avg_rate'] >= 25 else '📈 利益率改善の余地あり。仕入れ単価を見直しましょう'}"
    )

    _send_line(line_token, msg)
    print(f"[Monitor] weekly_report user={user_id} 完了")


def weekly_report():
    """週次レポート: 全ユーザーの週間売上・利益・エージェント活動をまとめてLINE送信"""
    print(f"[Monitor] weekly_report 開始: {datetime.now().isoformat()}")
    db = None
    try:
        db = _get_db()
        for user_id in _get_all_user_ids(db):
            try:
                _weekly_report_for_user(db, user_id)
            except Exception as e:
                print(f"[Monitor] weekly_report user={user_id} エラー: {e}")
    except Exception as e:
        print(f"[Monitor] weekly_report エラー: {e}")
    finally:
        if db:
            db.close()


def cleanup_memory():
    """期限切れの記憶を定期削除"""
    db = None
    try:
        db = _get_db()
        from agents import AgentMemory
        for agent_name in ["ceo", "research", "listing", "sns"]:
            AgentMemory(agent_name, db).delete_expired()
        print(f"[Monitor] memory cleanup 完了")
    except Exception as e:
        print(f"[Monitor] memory cleanup エラー: {e}")
    finally:
        if db:
            db.close()


# ── スケジューラー ────────────────────────────────────────────────────

def _load_schedule_settings() -> dict:
    """設定からスケジュール設定を読み込む"""
    db = None
    try:
        db = _get_db()
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
    finally:
        if db:
            db.close()


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
        time.sleep(30)  # 起動直後のDB競合を防ぐため遅延起動
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
