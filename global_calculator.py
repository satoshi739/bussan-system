"""
グローバル物販 利益計算モジュール
- 日本で仕入れ → 世界各プラットフォームで販売
- 為替換算 + プラットフォーム手数料 + 国際送料 を含む
"""

from typing import Dict, List, Optional
from currency import jpy_to, to_jpy, get_rates, format_price

# ───────────────────────────────────────────────────────────────
# グローバル販売プラットフォーム設定
# ───────────────────────────────────────────────────────────────

GLOBAL_PLATFORMS = {
    'eBay': {
        'name': 'eBay',
        'flag': '🌏',
        'currency': 'USD',
        'fee_rate': 0.1325,
        'fixed_fee_jpy': 45,  # $0.30固定費（@150円/USD）
        'area': '米国・欧州・世界',
        'note': '手数料13.25%＋$0.30固定費・世界190カ国',
        'shipping_note': 'EMS/FedEx推奨',
        'category': 'global',
    },
    'Amazon.com': {
        'name': 'Amazon.com',
        'flag': '🇺🇸',
        'currency': 'USD',
        'fee_rate': 0.15,
        'fixed_fee_jpy': 0,
        'area': '米国',
        'note': '手数料約15%・米国向け',
        'category': 'global',
    },
    'Amazon.co.uk': {
        'name': 'Amazon.co.uk',
        'flag': '🇬🇧',
        'currency': 'GBP',
        'fee_rate': 0.15,
        'fixed_fee_jpy': 0,
        'area': '英国',
        'note': '手数料約15%・英国向け',
        'category': 'global',
    },
    'Amazon.de': {
        'name': 'Amazon.de',
        'flag': '🇩🇪',
        'currency': 'EUR',
        'fee_rate': 0.15,
        'fixed_fee_jpy': 0,
        'area': 'ドイツ・欧州',
        'note': '手数料約15%・欧州向け',
        'category': 'global',
    },
    'Amazon.com.au': {
        'name': 'Amazon.com.au',
        'flag': '🇦🇺',
        'currency': 'AUD',
        'fee_rate': 0.15,
        'fixed_fee_jpy': 0,
        'area': 'オーストラリア',
        'note': '手数料約15%・豪州向け',
        'category': 'global',
    },
    'Shopee_SG': {
        'name': 'Shopee SG',
        'flag': '🇸🇬',
        'currency': 'SGD',
        'fee_rate': 0.08,
        'fixed_fee_jpy': 0,
        'area': 'シンガポール',
        'note': '手数料8%・越境販売対応',
        'category': 'sea',
    },
    'Shopee_MY': {
        'name': 'Shopee MY',
        'flag': '🇲🇾',
        'currency': 'MYR',
        'fee_rate': 0.07,
        'fixed_fee_jpy': 0,
        'area': 'マレーシア',
        'note': '手数料7%',
        'category': 'sea',
    },
    'Shopee_TH': {
        'name': 'Shopee TH',
        'flag': '🇹🇭',
        'currency': 'THB',
        'fee_rate': 0.05,
        'fixed_fee_jpy': 0,
        'area': 'タイ',
        'note': '手数料5%',
        'category': 'sea',
    },
    'Shopee_PH': {
        'name': 'Shopee PH',
        'flag': '🇵🇭',
        'currency': 'PHP',
        'fee_rate': 0.06,
        'fixed_fee_jpy': 0,
        'area': 'フィリピン',
        'note': '手数料6%',
        'category': 'sea',
    },
    'Shopee_ID': {
        'name': 'Shopee ID',
        'flag': '🇮🇩',
        'currency': 'IDR',
        'fee_rate': 0.05,
        'fixed_fee_jpy': 0,
        'area': 'インドネシア',
        'note': '手数料5%',
        'category': 'sea',
    },
    'Shopee_TW': {
        'name': 'Shopee TW',
        'flag': '🇹🇼',
        'currency': 'TWD',
        'fee_rate': 0.06,
        'fixed_fee_jpy': 0,
        'area': '台湾',
        'note': '手数料6%',
        'category': 'sea',
    },
    'Lazada_SG': {
        'name': 'Lazada SG',
        'flag': '🇸🇬',
        'currency': 'SGD',
        'fee_rate': 0.04,
        'fixed_fee_jpy': 0,
        'area': 'シンガポール',
        'note': '手数料4%',
        'category': 'sea',
    },
    'Lazada_MY': {
        'name': 'Lazada MY',
        'flag': '🇲🇾',
        'currency': 'MYR',
        'fee_rate': 0.04,
        'fixed_fee_jpy': 0,
        'area': 'マレーシア',
        'note': '手数料4%',
        'category': 'sea',
    },
    'Lazada_TH': {
        'name': 'Lazada TH',
        'flag': '🇹🇭',
        'currency': 'THB',
        'fee_rate': 0.03,
        'fixed_fee_jpy': 0,
        'area': 'タイ',
        'note': '手数料3%',
        'category': 'sea',
    },
    'Lazada_PH': {
        'name': 'Lazada PH',
        'flag': '🇵🇭',
        'currency': 'PHP',
        'fee_rate': 0.04,
        'fixed_fee_jpy': 0,
        'area': 'フィリピン',
        'note': '手数料4%',
        'category': 'sea',
    },
    'Lazada_ID': {
        'name': 'Lazada ID',
        'flag': '🇮🇩',
        'currency': 'IDR',
        'fee_rate': 0.03,
        'fixed_fee_jpy': 0,
        'area': 'インドネシア',
        'note': '手数料3%',
        'category': 'sea',
    },
    'Etsy': {
        'name': 'Etsy',
        'flag': '🎨',
        'currency': 'USD',
        'fee_rate': 0.065,
        'fixed_fee_jpy': 30,
        'area': '米国・欧州',
        'note': '6.5%＋出品料約30円・ハンドメイド特化',
        'category': 'global',
    },
}

# ───────────────────────────────────────────────────────────────
# 国際送料テーブル（日本発 EMS・重量別）
# 郵便局 EMS 2024年料金に基づく概算
# ───────────────────────────────────────────────────────────────

# 構造: 国コード → [(最大g, 料金円), ...]  ※重量昇順
_INTL_SHIPPING_TIERS: Dict[str, List[tuple]] = {
    # 第1地帯：アジア近隣
    'TW': [(500, 700),  (1000, 950),  (2000, 1450), (5000, 2800),  (10000, 5100)],
    'HK': [(500, 700),  (1000, 950),  (2000, 1450), (5000, 2800),  (10000, 5100)],
    'KR': [(500, 700),  (1000, 950),  (2000, 1450), (5000, 2800),  (10000, 5100)],
    'CN': [(500, 800),  (1000, 1050), (2000, 1600), (5000, 3100),  (10000, 5600)],

    # 第2地帯：東南アジア
    'SG': [(500, 1000), (1000, 1400), (2000, 2200), (5000, 4200),  (10000, 7700)],
    'MY': [(500, 1000), (1000, 1400), (2000, 2200), (5000, 4200),  (10000, 7700)],
    'TH': [(500, 1000), (1000, 1400), (2000, 2200), (5000, 4200),  (10000, 7700)],
    'PH': [(500, 1100), (1000, 1500), (2000, 2400), (5000, 4600),  (10000, 8400)],
    'ID': [(500, 1200), (1000, 1700), (2000, 2700), (5000, 5200),  (10000, 9500)],

    # 第3地帯：欧州・豪州
    'UK': [(500, 1700), (1000, 2400), (2000, 3800), (5000, 7400),  (10000, 13500)],
    'DE': [(500, 1700), (1000, 2400), (2000, 3800), (5000, 7400),  (10000, 13500)],
    'FR': [(500, 1700), (1000, 2400), (2000, 3800), (5000, 7400),  (10000, 13500)],
    'IT': [(500, 1700), (1000, 2400), (2000, 3800), (5000, 7400),  (10000, 13500)],
    'AU': [(500, 1800), (1000, 2600), (2000, 4100), (5000, 8000),  (10000, 14600)],

    # 第4地帯：北米
    'US': [(500, 1800), (1000, 2600), (2000, 4100), (5000, 8000),  (10000, 14600)],
    'CA': [(500, 1900), (1000, 2700), (2000, 4300), (5000, 8300),  (10000, 15200)],
}

# プラットフォーム → 発送先国コード
PLATFORM_COUNTRY = {
    'eBay':          'US',
    'Amazon.com':    'US',
    'Amazon.co.uk':  'UK',
    'Amazon.de':     'DE',
    'Amazon.com.au': 'AU',
    'Shopee_SG':     'SG',
    'Shopee_MY':     'MY',
    'Shopee_TH':     'TH',
    'Shopee_PH':     'PH',
    'Shopee_ID':     'ID',
    'Shopee_TW':     'TW',
    'Lazada_SG':     'SG',
    'Lazada_MY':     'MY',
    'Lazada_TH':     'TH',
    'Lazada_PH':     'PH',
    'Lazada_ID':     'ID',
    'Etsy':          'US',
}

# 梱包材費の概算（重量別）
_PACKAGING_COST: List[tuple] = [
    (500,   80),   # 〜500g: プチプチ+封筒
    (2000,  150),  # 〜2kg:  小箱+緩衝材
    (5000,  250),  # 〜5kg:  中箱
    (10000, 400),  # 〜10kg: 大箱+補強
]


def get_intl_shipping(platform_key: str, weight_g: float = 500) -> int:
    """プラットフォームへの国際送料を概算（円）"""
    country = PLATFORM_COUNTRY.get(platform_key, 'US')
    tiers = _INTL_SHIPPING_TIERS.get(country)

    if tiers:
        for max_g, fee in tiers:
            if weight_g <= max_g:
                return fee
        # 最大重量超過: 最終段階 + 超過1kg毎に加算
        last_max, last_fee = tiers[-1]
        extra_kg = max(0, (weight_g - last_max) / 1000)
        return int(last_fee + extra_kg * 800)

    # テーブルにない国は 2,000円をデフォルトとし重量補正
    base = 2000
    if weight_g > 500:
        extra = (weight_g - 500) / 500
        base += int(extra * 500)
    return base


def get_packaging_cost(weight_g: float = 500) -> int:
    """梱包材費を概算（円）"""
    for max_g, cost in _PACKAGING_COST:
        if weight_g <= max_g:
            return cost
    return 400


# ───────────────────────────────────────────────────────────────
# 利益計算（グローバル）
# ───────────────────────────────────────────────────────────────

def calculate_global_profit(
    purchase_price_jpy: float,
    selling_price_local: float,
    platform_key: str,
    purchase_shipping_jpy: float = 0,
    intl_shipping_jpy: Optional[float] = None,
    weight_g: float = 500,
    include_packaging_jpy: Optional[float] = None,  # Noneで自動計算
) -> Dict:
    """
    グローバル物販の純利益を計算する。

    Args:
        include_packaging_jpy: 梱包材費（円）Noneで重量から自動計算
    """
    pf = GLOBAL_PLATFORMS.get(platform_key)
    if not pf:
        return {'error': f'Unknown platform: {platform_key}'}

    currency = pf['currency']
    fee_rate = pf['fee_rate']
    fixed_fee_jpy = pf.get('fixed_fee_jpy', 0)

    # 販売価格を円換算
    selling_price_jpy = to_jpy(selling_price_local, currency)

    # プラットフォーム手数料（円）
    platform_fee_jpy = selling_price_jpy * fee_rate + fixed_fee_jpy

    # 国際送料
    if intl_shipping_jpy is None:
        intl_shipping_jpy = get_intl_shipping(platform_key, weight_g)

    # 梱包材費
    if include_packaging_jpy is None:
        include_packaging_jpy = get_packaging_cost(weight_g)

    # コスト合計
    total_cost_jpy = (
        purchase_price_jpy
        + purchase_shipping_jpy
        + intl_shipping_jpy
        + platform_fee_jpy
        + include_packaging_jpy
    )

    # 純利益（円）
    net_profit_jpy = selling_price_jpy - total_cost_jpy

    profit_rate = (net_profit_jpy / selling_price_jpy * 100) if selling_price_jpy > 0 else 0
    invest_total = purchase_price_jpy + purchase_shipping_jpy
    roi = (net_profit_jpy / invest_total * 100) if invest_total > 0 else 0

    return {
        'platform_key': platform_key,
        'platform_name': pf['name'],
        'platform_flag': pf['flag'],
        'currency': currency,
        'area': pf['area'],
        'note': pf['note'],

        'selling_price_local': selling_price_local,
        'selling_price_jpy': selling_price_jpy,
        'purchase_price_jpy': purchase_price_jpy,

        'purchase_shipping_jpy': purchase_shipping_jpy,
        'intl_shipping_jpy': intl_shipping_jpy,
        'platform_fee_jpy': round(platform_fee_jpy),
        'platform_fee_rate': fee_rate,
        'packaging_jpy': round(include_packaging_jpy),
        'total_cost_jpy': round(total_cost_jpy),

        'net_profit_jpy': round(net_profit_jpy),
        'profit_rate': round(profit_rate, 1),
        'roi': round(roi, 1),

        'is_profitable': net_profit_jpy > 0,
        'rating': _rate_deal(profit_rate),
    }


def _rate_deal(profit_rate: float) -> str:
    if profit_rate >= 40:
        return 'excellent'
    elif profit_rate >= 25:
        return 'good'
    elif profit_rate >= 10:
        return 'ok'
    elif profit_rate >= 0:
        return 'marginal'
    else:
        return 'loss'


def calculate_profit_matrix(
    purchase_price_jpy: float,
    selling_prices: Dict[str, float],
    purchase_shipping_jpy: float = 0,
    weight_g: float = 500,
) -> List[Dict]:
    """複数プラットフォームの利益を一括計算してランキング形式で返す。"""
    results = []
    for platform_key, price_local in selling_prices.items():
        if price_local and price_local > 0:
            result = calculate_global_profit(
                purchase_price_jpy=purchase_price_jpy,
                selling_price_local=price_local,
                platform_key=platform_key,
                purchase_shipping_jpy=purchase_shipping_jpy,
                weight_g=weight_g,
            )
            if 'error' not in result:
                results.append(result)

    results.sort(key=lambda x: x.get('net_profit_jpy', -9999999), reverse=True)
    return results


def calculate_breakeven_price_local(
    purchase_price_jpy: float,
    platform_key: str,
    purchase_shipping_jpy: float = 0,
    weight_g: float = 500,
    target_profit_rate: float = 0.0,
) -> Dict:
    """
    指定プラットフォームで損益分岐（または目標利益率）になる最低販売価格を計算。
    梱包材費も自動で含める。
    """
    pf = GLOBAL_PLATFORMS.get(platform_key)
    if not pf:
        return {}

    currency = pf['currency']
    fee_rate = pf['fee_rate']
    fixed_fee_jpy = pf.get('fixed_fee_jpy', 0)
    intl_shipping = get_intl_shipping(platform_key, weight_g)
    packaging = get_packaging_cost(weight_g)

    total_fixed_cost = (
        purchase_price_jpy
        + purchase_shipping_jpy
        + intl_shipping
        + fixed_fee_jpy
        + packaging
    )

    denominator = (1 - fee_rate) * (1 - target_profit_rate)
    if denominator <= 0:
        return {}

    breakeven_jpy = total_fixed_cost / denominator
    breakeven_local = jpy_to(breakeven_jpy, currency)

    return {
        'platform_key': platform_key,
        'platform_name': pf['name'],
        'currency': currency,
        'price_local': round(breakeven_local, 2),
        'price_jpy': round(breakeven_jpy),
        'target_profit_rate': target_profit_rate,
        'intl_shipping_jpy': intl_shipping,
        'packaging_jpy': packaging,
    }


# eBay US → 日本 輸入送料目安（重量別）
_EBAY_IMPORT_TIERS = [
    (200,  800),
    (500,  1200),
    (1000, 1800),
    (2000, 2800),
    (5000, 5000),
    (10000, 9000),
]


def get_import_shipping(weight_g: float, source: str = 'US') -> int:
    """海外（eBay等）から日本への輸入送料目安（円）を返す"""
    for max_g, fee in _EBAY_IMPORT_TIERS:
        if weight_g <= max_g:
            return fee
    extra_kg = (weight_g - 10000) / 1000
    return 9000 + int(extra_kg) * 800


def suggest_selling_price(
    purchase_price_jpy: float,
    platform_key: str,
    target_profit_rate: float = 0.25,
    purchase_shipping_jpy: float = 0,
    weight_g: float = 500,
) -> Dict:
    """目標利益率（デフォルト25%）を達成するための推奨販売価格を計算。"""
    return calculate_breakeven_price_local(
        purchase_price_jpy,
        platform_key,
        purchase_shipping_jpy,
        weight_g,
        target_profit_rate,
    )
