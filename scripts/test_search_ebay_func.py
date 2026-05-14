"""scrapers.search_ebay の動作確認スクリプト（Sandbox）"""
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
from scrapers import search_ebay  # noqa: E402

print(f"EBAY_ENV: {os.getenv('EBAY_ENV')}")
print(f"EBAY_APP_ID head: {(os.getenv('EBAY_APP_ID') or '')[:14]}")
print()

results = search_ebay("iphone", limit=5)
print(f"Returned {len(results)} items\n")

required_keys = {
    "item_id", "title", "price_usd", "shipping_usd",
    "price_jpy", "shipping_jpy", "total_jpy",
    "condition", "url", "image",
}

if not results:
    print("[FAIL] 結果ゼロ。認証 or API 呼び出しで失敗の可能性。")
    sys.exit(1)

first = results[0]
missing = required_keys - set(first.keys())
if missing:
    print(f"[FAIL] 必須キーが欠落: {missing}")
    sys.exit(1)
print("[OK] 戻り値の構造は互換性維持")

for i, r in enumerate(results, 1):
    print(f"{i}. {r['title'][:60]}")
    print(f"   ${r['price_usd']} + ship ${r['shipping_usd']} = ¥{r['total_jpy']}")
    print(f"   cond={r['condition']} | id={r['item_id']}")
