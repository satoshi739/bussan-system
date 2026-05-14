"""Openlogi API クライアント。

- ベースURL: サンドボックス `https://api-demo.openlogi.com/api`、本番 `https://api.openlogi.com/api`
- 認証: `Authorization: Bearer <api_key>` + `X-Api-Version: 1.5`
- vendor 行の `api_endpoint` 列で上書き可。未設定なら ENV `OPENLOGI_BASE_URL`、
  それも無ければサンドボックスをデフォルトにする（誤発送防止のため）。
"""

from __future__ import annotations

import hashlib
import hmac
import os
from typing import Any, Dict, Optional

import requests

API_VERSION = "1.5"
DEFAULT_BASE_URL = "https://api-demo.openlogi.com/api"
PROD_BASE_URL = "https://api.openlogi.com/api"


class OpenlogiError(Exception):
    """Openlogi API 呼び出しの失敗。`user_message` は UI にそのまま出せる日本語。"""

    def __init__(self, user_message: str, status_code: Optional[int] = None, detail: Any = None):
        super().__init__(user_message)
        self.user_message = user_message
        self.status_code = status_code
        self.detail = detail


def resolve_base_url(api_endpoint: Optional[str] = None) -> str:
    if api_endpoint and api_endpoint.strip():
        return api_endpoint.strip().rstrip("/")
    env = os.environ.get("OPENLOGI_BASE_URL", "").strip()
    if env:
        return env.rstrip("/")
    return DEFAULT_BASE_URL


def _headers(api_key: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "X-Api-Version": API_VERSION,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _request(
    method: str,
    path: str,
    api_key: str,
    base_url: Optional[str] = None,
    *,
    params: Optional[Dict[str, Any]] = None,
    json_body: Optional[Dict[str, Any]] = None,
    timeout: float = 15.0,
) -> Dict[str, Any]:
    if not api_key:
        raise OpenlogiError("APIキーが設定されていません")
    url = f"{resolve_base_url(base_url)}/{path.lstrip('/')}"
    try:
        resp = requests.request(
            method, url, headers=_headers(api_key), params=params, json=json_body, timeout=timeout
        )
    except requests.Timeout:
        raise OpenlogiError("オープンロジAPIがタイムアウトしました。時間をおいて再試行してください")
    except requests.RequestException as e:
        raise OpenlogiError(f"オープンロジAPIに接続できませんでした: {e}")

    if resp.status_code == 401:
        raise OpenlogiError("APIキーが無効です。再発行・再設定してください", 401)
    if resp.status_code == 403:
        raise OpenlogiError("このAPIキーには操作権限がありません", 403)
    if resp.status_code == 404:
        raise OpenlogiError("オープンロジAPIのエンドポイントが見つかりません", 404)
    if resp.status_code >= 500:
        raise OpenlogiError("オープンロジAPI側でエラーが発生しています。時間をおいて再試行してください", resp.status_code)

    try:
        data = resp.json() if resp.content else {}
    except ValueError:
        data = {"raw": resp.text}

    if resp.status_code >= 400:
        msg = (data.get("message") if isinstance(data, dict) else None) or "リクエストが拒否されました"
        raise OpenlogiError(f"オープンロジAPIエラー: {msg}", resp.status_code, data)

    return data if isinstance(data, dict) else {"data": data}


def test_connection(api_key: str, base_url: Optional[str] = None) -> Dict[str, Any]:
    """軽量GETで認証と疎通を確認。専用 ping は無いため /items?limit=1 を利用。"""
    return _request("GET", "/items", api_key, base_url, params={"limit": 1})


def create_shipment(
    api_key: str, payload: Dict[str, Any], base_url: Optional[str] = None
) -> Dict[str, Any]:
    """出荷依頼を作成。payload は Openlogi 仕様（identifier / items / recipient ...）。"""
    return _request("POST", "/shipments", api_key, base_url, json_body=payload)


def get_shipment(api_key: str, shipment_id: str, base_url: Optional[str] = None) -> Dict[str, Any]:
    return _request("GET", f"/shipments/{shipment_id}", api_key, base_url)


def verify_webhook_signature(secret: str, raw_body: bytes, header_signature: Optional[str]) -> bool:
    """HMAC-SHA256 で Webhook の署名を検証する汎用実装。

    オープンロジの公式署名仕様は現時点で公開ドキュメントに記載がないため、
    一般的な `hex(hmac_sha256(secret, raw_body))` 方式を採用。
    実運用前に Openlogi 側の仕様確定が必要（必要に応じてアルゴリズム差し替え）。
    """
    if not secret or not header_signature:
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    received = header_signature.strip()
    if received.lower().startswith("sha256="):
        received = received[len("sha256="):]
    return hmac.compare_digest(expected, received)
