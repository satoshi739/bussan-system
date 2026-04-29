"""
多通貨対応モジュール
- 為替レートはフリーAPIから取得（frankfurter.app）
- キャッシュTTL: 30分
- 失敗時は3回リトライ（指数バックオフ）→ フォールバック値
"""

import requests
import time
import threading
from typing import Dict, Optional, Tuple

# ───────────────────────────────────────────────────────────────
# 通貨設定
# ───────────────────────────────────────────────────────────────

CURRENCIES = {
    'JPY': {'name': '日本円',             'symbol': '¥',   'flag': '🇯🇵'},
    'USD': {'name': '米ドル',             'symbol': '$',   'flag': '🇺🇸'},
    'EUR': {'name': 'ユーロ',             'symbol': '€',   'flag': '🇪🇺'},
    'GBP': {'name': '英ポンド',           'symbol': '£',   'flag': '🇬🇧'},
    'AUD': {'name': '豪ドル',             'symbol': 'A$',  'flag': '🇦🇺'},
    'SGD': {'name': 'シンガポールドル',   'symbol': 'S$',  'flag': '🇸🇬'},
    'MYR': {'name': 'マレーシアリンギット','symbol': 'RM',  'flag': '🇲🇾'},
    'THB': {'name': 'タイバーツ',         'symbol': '฿',   'flag': '🇹🇭'},
    'PHP': {'name': 'フィリピンペソ',     'symbol': '₱',   'flag': '🇵🇭'},
    'IDR': {'name': 'インドネシアルピア', 'symbol': 'Rp',  'flag': '🇮🇩'},
    'TWD': {'name': '台湾ドル',           'symbol': 'NT$', 'flag': '🇹🇼'},
    'HKD': {'name': '香港ドル',           'symbol': 'HK$', 'flag': '🇭🇰'},
    'KRW': {'name': '韓国ウォン',         'symbol': '₩',   'flag': '🇰🇷'},
    'CNY': {'name': '人民元',             'symbol': '¥',   'flag': '🇨🇳'},
}

# フォールバック用デフォルトレート（1 JPY = X 外貨）
FALLBACK_RATES: Dict[str, float] = {
    'JPY': 1.0,
    'USD': 0.0067,
    'EUR': 0.0062,
    'GBP': 0.0053,
    'AUD': 0.0104,
    'SGD': 0.0090,
    'MYR': 0.0314,
    'THB': 0.238,
    'PHP': 0.375,
    'IDR': 104.5,
    'TWD': 0.216,
    'HKD': 0.0524,
    'KRW': 8.87,
    'CNY': 0.0487,
}

# ───────────────────────────────────────────────────────────────
# キャッシュ（スレッドセーフ）
# ───────────────────────────────────────────────────────────────

_lock = threading.Lock()
_rate_cache: Dict[str, float] = {}
_cache_ts: float = 0
_cache_is_fallback: bool = False   # フォールバック値を使用中かどうか
_CACHE_TTL = 1800                  # 30分


# ───────────────────────────────────────────────────────────────
# 取得ロジック（リトライ付き）
# ───────────────────────────────────────────────────────────────

_API_URLS = [
    'https://api.frankfurter.app/latest',
    'https://frankfurter.dev/latest',   # 予備ミラー
]


def _fetch_rates() -> Tuple[Dict[str, float], bool]:
    """
    JPY ベースのレートを外部APIから取得する。
    3回リトライ（指数バックオフ: 1s → 2s → 4s）。
    成功時: (rates_dict, False)
    全失敗時: ({}, True)  ← is_fallback=True
    """
    symbols = ','.join(k for k in CURRENCIES if k != 'JPY')
    params = {'base': 'JPY', 'symbols': symbols}

    for attempt in range(3):
        for url in _API_URLS:
            try:
                resp = requests.get(url, params=params, timeout=8)
                resp.raise_for_status()
                data = resp.json()
                rates = data.get('rates', {})
                if rates:
                    rates['JPY'] = 1.0
                    return rates, False
            except Exception as e:
                print(f'[Currency] 試行{attempt + 1}/3 ({url}): {e}')

        if attempt < 2:
            time.sleep(2 ** attempt)  # 1s, 2s

    print('[Currency] 全APIが失敗 → フォールバック値を使用')
    return {}, True


def get_rates(force_refresh: bool = False) -> Dict[str, float]:
    """JPY ベースのレート辞書を返す（キャッシュ付き）"""
    global _rate_cache, _cache_ts, _cache_is_fallback

    now = time.time()
    with _lock:
        if force_refresh or not _rate_cache or (now - _cache_ts) > _CACHE_TTL:
            fetched, is_fallback = _fetch_rates()
            if fetched:
                _rate_cache = fetched
                _cache_ts = now
                _cache_is_fallback = False
            elif not _rate_cache:
                # 初回かつ取得失敗 → フォールバック
                _rate_cache = dict(FALLBACK_RATES)
                _cache_ts = now
                _cache_is_fallback = True
            else:
                # キャッシュが残っていればそのまま継続使用（stale but valid）
                _cache_is_fallback = True

        return dict(_rate_cache)


def is_using_fallback() -> bool:
    """フォールバックレートを使用中かどうか"""
    with _lock:
        return _cache_is_fallback


def get_cache_age_minutes() -> Optional[float]:
    """現在のキャッシュ取得からの経過時間（分）。未取得の場合はNone"""
    with _lock:
        if _cache_ts == 0:
            return None
        return (time.time() - _cache_ts) / 60


# ───────────────────────────────────────────────────────────────
# 変換ユーティリティ
# ───────────────────────────────────────────────────────────────

def jpy_to(amount_jpy: float, currency: str) -> float:
    """円 → 指定通貨に変換"""
    if currency == 'JPY':
        return amount_jpy
    rates = get_rates()
    rate = rates.get(currency, FALLBACK_RATES.get(currency, 1.0))
    return round(amount_jpy * rate, 2)


def to_jpy(amount: float, currency: str) -> float:
    """指定通貨 → 円に変換"""
    if currency == 'JPY':
        return amount
    rates = get_rates()
    rate = rates.get(currency, FALLBACK_RATES.get(currency, 1.0))
    if rate == 0:
        return 0.0
    return round(amount / rate)


def format_price(amount: float, currency: str) -> str:
    """価格を現地通貨フォーマットで表示"""
    info = CURRENCIES.get(currency, {'symbol': currency})
    symbol = info['symbol']

    if currency in ('IDR', 'KRW', 'JPY'):
        return f"{symbol}{amount:,.0f}"
    else:
        return f"{symbol}{amount:,.2f}"


def get_all_rates_info() -> Dict:
    """フロントエンド用：全通貨情報 + 現在レート + メタ情報を返す"""
    rates = get_rates()
    result = {}
    for code, info in CURRENCIES.items():
        rate = rates.get(code, FALLBACK_RATES.get(code, 1.0))
        result[code] = {
            **info,
            'rate_from_jpy': rate,
            'rate_to_jpy': round(1 / rate, 2) if rate else 0,
        }
    return {
        'rates': result,
        'is_fallback': is_using_fallback(),
        'cache_age_minutes': get_cache_age_minutes(),
        'ttl_minutes': _CACHE_TTL // 60,
    }
