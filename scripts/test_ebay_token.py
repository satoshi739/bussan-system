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

if not app_id or not cert_id:
    print("ERROR: EBAY_APP_ID または EBAY_CERT_ID が読み込めていません")
    print(f"  EBAY_APP_ID set: {bool(app_id)}")
    print(f"  EBAY_CERT_ID set: {bool(cert_id)}")
    sys.exit(1)

base = "https://api.sandbox.ebay.com" if env == "SANDBOX" else "https://api.ebay.com"
print(f"Environment: {env}")
print(f"App ID (head): {app_id[:12]}...")

creds = f"{app_id}:{cert_id}"
b64 = base64.b64encode(creds.encode()).decode()

res = requests.post(
    f"{base}/identity/v1/oauth2/token",
    headers={
        "Authorization": f"Basic {b64}",
        "Content-Type": "application/x-www-form-urlencoded",
    },
    data={
        "grant_type": "client_credentials",
        "scope": "https://api.ebay.com/oauth/api_scope",
    },
    timeout=15,
)

print(f"Status: {res.status_code}")
data = res.json()
if res.status_code == 200 and "access_token" in data:
    token = data["access_token"]
    print(f"SUCCESS: token head = {token[:24]}...")
    print(f"expires_in: {data.get('expires_in')} sec")
else:
    print("FAILED:")
    print(data)
    sys.exit(1)
