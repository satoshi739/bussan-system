"""search_ebay の絞り込みオプション検証"""
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

from scrapers import search_ebay, _build_ebay_filter  # noqa: E402


print("=== フィルタ文字列生成テスト ===")
print(_build_ebay_filter(None, None, None, 'FIXED_PRICE'))
print(_build_ebay_filter(10, 100, None, 'FIXED_PRICE'))
print(_build_ebay_filter(None, 50, 'new', 'FIXED_PRICE'))
print(_build_ebay_filter(20, None, 'used', 'FIXED_PRICE|AUCTION'))

print("\n=== 1) デフォルト ===")
r = search_ebay("iphone", limit=3)
print(f"件数: {len(r)} / 範囲: ${min(x['price_usd'] for x in r) if r else 0}-${max(x['price_usd'] for x in r) if r else 0}")

print("\n=== 2) 価格 $5-$15 ===")
r = search_ebay("iphone", limit=5, min_price=5, max_price=15)
for x in r:
    print(f"  ${x['price_usd']:.2f} - {x['title'][:50]}")

print("\n=== 3) 新品のみ ===")
r = search_ebay("iphone", limit=3, condition='new')
for x in r:
    print(f"  cond={x['condition']} ${x['price_usd']:.2f} - {x['title'][:40]}")

print("\n=== 4) Marketplace 切替（EBAY_GB）※Sandboxではダミーの可能性 ===")
r = search_ebay("iphone", limit=3, marketplace='EBAY_GB')
print(f"  件数: {len(r)}")
for x in r[:2]:
    print(f"    ${x['price_usd']:.2f} - {x['title'][:40]}")
