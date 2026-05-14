"""get_ebay_item の動作確認"""
import os
import sys
from pathlib import Path


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


load_env_file(Path(__file__).parent.parent / ".env")
load_env_file(Path(__file__).parent.parent / "frontend" / ".env.local")
sys.path.insert(0, str(Path(__file__).parent.parent))

from scrapers import search_ebay, get_ebay_item  # noqa: E402


# まず検索 → 最初の itemId で詳細取得
results = search_ebay("iphone", limit=1)
if not results:
    print("検索で結果ゼロ。テスト中止。")
    sys.exit(1)

item_id = results[0]['item_id']
print(f"取得対象 item_id: {item_id}\n")

detail = get_ebay_item(item_id)
if not detail:
    print("[FAIL] 詳細取得失敗")
    sys.exit(1)

print("[OK] 詳細取得成功\n")
for k, v in detail.items():
    if isinstance(v, list):
        print(f"  {k}: ({len(v)} items) {v[:2]}{'...' if len(v) > 2 else ''}")
    else:
        s = str(v)
        print(f"  {k}: {s[:80]}{'...' if len(s) > 80 else ''}")

# 存在しない itemId の挙動
print("\n存在しない itemId のテスト:")
bad = get_ebay_item("v1|0000000000|0")
print(f"  -> {bad}")
