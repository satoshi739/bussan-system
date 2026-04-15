"""
多通貨対応モジュール
- 為替レートはフリーAPIから取得（frankfurter.app）
- キャッシュTTL: 1時間
"""

import requests
import time
from typing import Dict, Optional

# ───────────────────────────────────────────────────────────────
# 通貨設定
# ───────────────────────────────────────────────────────────────

CURRENCIES = {
    'JPY': {'name': '日本円',       'symbol': '¥',   'flag': '🇯🇵'},
    'USD': {'name': '米ドル',       'symbol': '$',   'flag': '🇺🇸'},
    'EUR': {'name': 'ユーロ',       'symbol': '€',   'flag': '🇪🇺'},
    'GBP': {'name': '英ポンド',     'symbol': '£',   'flag': '🇬🇧'},
    'AUD': {'name': '豪ドル',       'symbol': 'A$',  'flag': '🇦🇺'},
    'SGD': {'name': 'シンガポールドル', 'symbol': 'S$', 'flag': '🇸🇬'},
    'MYR': {'name': 'マレーシアリンギット', 'symbol': 'RM', 'flag': '🇲🇾'},
    'THB': {'name': 'タイバーツ',   'symbol': '฿',   'flag': '🇹🇭'},
    'PHP': {'name': 'フィリピンペソ', 'symbol': '₱',  'flag': '🇵🇭'},
    'IDR': {'name': 'インドネシアルピア', 'symbol': 'Rp', 'flag': '🇮🇩'},
    'TWD': {'name': '台湾ドル',     'symbol': 'NT$', 'flag': '🇹🇼'},
    'HKD': {'name': '香港ドル',     'symbol': 'HK$', 'flag': '🇭🇰'},
    'KRW': {'name': '韓国ウォン',   'symbol': '₩',   'flag': '🇰🇷'},
    'CNY': {'name': '人民元',       'symbol': '¥',   'flag': '🇨🇳'},
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
# キャッシュ
# ───────────────────────────────────────────────────────────────

_rate_cache: Dict[str, float] = {}
_cache_ts: float = 0
_CACHE_TTL = 3600  # 1時間


def _fetch_rates() -> Dict[str, float]:
    """frankfurter.app から JPY ベースのレートを取得"""
    try:
        resp = requests.get(
            'https://api.frankfurter.app/latest',
            params={'base': 'JPY', 'symbols': ','.join(k for k in CURRENCIES if k != 'JPY')},
            timeout=8,
        )
        resp.raise_for_status()
        data = resp.json()
        rates = data.get('rates', {})
        rates['JPY'] = 1.0
        return rates
    except Exception as e:
        print(f'[Currency] 為替レート取得エラー: {e} → フォールバック値を使用')
        return {}


def get_rates(force_refresh: bool = False) -> Dict[str, float]:
    """JPY ベースのレート辞書を返す（キャッシュ付き）"""
    global _rate_cache, _cache_ts

    now = time.time()
    if force_refresh or not _rate_cache or (now - _cache_ts) > _CACHE_TTL:
        fetched = _fetch_rates()
        if fetched:
            _rate_cache = fetched
            _cache_ts = now
        elif not _rate_cache:
            _rate_cache = dict(FALLBACK_RATES)

    return _rate_cache


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

    if currency == 'IDR':
        return f"{symbol}{amount:,.0f}"
    elif currency in ('KRW', 'JPY'):
        return f"{symbol}{amount:,.0f}"
    elif currency == 'THB':
        return f"{symbol}{amount:,.2f}"
    else:
        return f"{symbol}{amount:,.2f}"


def get_all_rates_info() -> Dict:
    """フロントエンド用：全通貨情報 + 現在レートを返す"""
    rates = get_rates()
    result = {}
    for code, info in CURRENCIES.items():
        rate = rates.get(code, FALLBACK_RATES.get(code, 1.0))
        result[code] = {
            **info,
            'rate_from_jpy': rate,      # 1円 = X 外貨
            'rate_to_jpy': round(1 / rate, 2) if rate else 0,  # 1外貨 = X円
        }
    return result
