import os
import base64
import sys
import requests
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

app_id = os.getenv("EBAY_APP_ID")
cert_id = os.getenv("EBAY_CERT_ID")
env = os.getenv("EBAY_ENV", "SANDBOX").upper()

base = "https://api.sandbox.ebay.com" if env == "SANDBOX" else "https://api.ebay.com"

# 1) Token
creds = f"{app_id}:{cert_id}"
b64 = base64.b64encode(creds.encode()).decode()
tok_res = requests.post(
    f"{base}/identity/v1/oauth2/token",
    headers={"Authorization": f"Basic {b64}", "Content-Type": "application/x-www-form-urlencoded"},
    data={"grant_type": "client_credentials", "scope": "https://api.ebay.com/oauth/api_scope"},
    timeout=15,
)
if tok_res.status_code != 200:
    print("Token error:", tok_res.json())
    sys.exit(1)
token = tok_res.json()["access_token"]
print(f"Token OK ({env})")

# 2) Browse API search
keyword = sys.argv[1] if len(sys.argv) > 1 else "iphone"
print(f"\nSearching: \"{keyword}\"")

search_res = requests.get(
    f"{base}/buy/browse/v1/item_summary/search",
    headers={
        "Authorization": f"Bearer {token}",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Content-Type": "application/json",
    },
    params={"q": keyword, "limit": 5},
    timeout=15,
)
print(f"Status: {search_res.status_code}")
data = search_res.json()

total = data.get("total", 0)
items = data.get("itemSummaries", [])
print(f"Total hits: {total}")
print(f"Returned: {len(items)} items\n")

for i, it in enumerate(items, 1):
    title = it.get("title", "(no title)")
    price = it.get("price", {})
    print(f"{i}. {title}")
    print(f"   price: {price.get('value')} {price.get('currency')}")
    print(f"   itemId: {it.get('itemId')}")
    print(f"   url: {it.get('itemWebUrl')}\n")

if not items:
    print("[NOTE] Sandbox はテストデータのみ。空でも疎通成功ならOK。")
    if "errors" in data or "warnings" in data:
        print("server messages:", data.get("errors") or data.get("warnings"))
