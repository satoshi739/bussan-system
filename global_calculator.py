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
    # eBay
    'eBay': {
        'name': 'eBay',
        'flag': '🌏',
        'currency': 'USD',
        'fee_rate': 0.1325,    # 13.25%
        'fixed_fee_jpy': 0,
        'area': '米国・欧州・世界',
        'note': '手数料13.25%・世界190カ国',
        'shipping_note': 'EMS/FedEx推奨',
        'category': 'global',
    },

    # Amazon 各国
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

    # Shopee 各国
    'Shopee_SG': {
        'name': 'Shopee SG',
        'flag': '🇸🇬',
        'currency': 'SGD',
        'fee_rate': 0.08,      # 8%（越境販売）
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

    # Lazada 各国
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

    # Etsy
    'Etsy': {
        'name': 'Etsy',
        'flag': '🎨',
        'currency': 'USD',
        'fee_rate': 0.065,
        'fixed_fee_jpy': 30,   # 出品料 約$0.20
        'area': '米国・欧州',
        'note': '6.5%＋出品料約30円・ハンドメイド特化',
        'category': 'global',
    },
}

# ───────────────────────────────────────────────────────────────
# 国際送料目安（日本→各国・小型荷物500g想定）
# ───────────────────────────────────────────────────────────────

# 国コード → EMS送料（円）小型500g
INTL_SHIPPING_JPY = {
    'US':  2200,  # 米国
    'UK':  2000,  # 英国
    'DE':  2000,  # ドイツ
    'AU':  2200,  # 豪州
    'SG':  1200,  # シンガポール
    'MY':  1200,  # マレーシア
    'TH':  1200,  # タイ
    'PH':  1200,  # フィリピン
    'ID':  1400,  # インドネシア
    'TW':  900,   # 台湾
    'HK':  900,   # 香港
    'KR':  900,   # 韓国
    'CN':  1000,  # 中国
    'FR':  2000,  # フランス
    'IT':  2000,  # イタリア
    'CA':  2200,  # カナダ
}

# プラットフォーム → 発送先国コード
PLATFORM_COUNTRY = {
    'eBay':         'US',
    'Amazon.com':   'US',
    'Amazon.co.uk': 'UK',
    'Amazon.de':    'DE',
    'Amazon.com.au': 'AU',
    'Shopee_SG':    'SG',
    'Shopee_MY':    'MY',
    'Shopee_TH':    'TH',
    'Shopee_PH':    'PH',
    'Shopee_ID':    'ID',
    'Shopee_TW':    'TW',
    'Lazada_SG':    'SG',
    'Lazada_MY':    'MY',
    'Lazada_TH':    'TH',
    'Lazada_PH':    'PH',
    'Lazada_ID':    'ID',
    'Etsy':         'US',
}


def get_intl_shipping(platform_key: str, weight_g: float = 500) -> int:
    """プラットフォームへの国際送料を概算（円）"""
    country = PLATFORM_COUNTRY.get(platform_key, 'US')
    base = INTL_SHIPPING_JPY.get(country, 2000)
    # 500g 超過分を概算加算
    if weight_g > 500:
        extra_units = (weight_g - 500) / 500
        base += int(extra_units * 400)
    return base


# ───────────────────────────────────────────────────────────────
# 利益計算（グローバル）
# ───────────────────────────────────────────────────────────────

def calculate_global_profit(
    purchase_price_jpy: float,
    selling_price_local: float,          # 販売価格（現地通貨）
    platform_key: str,
    purchase_shipping_jpy: float = 0,
    intl_shipping_jpy: Optional[float] = None,  # None=自動計算
    weight_g: float = 500,
    include_packaging_jpy: float = 0,
) -> Dict:
    """
    グローバル物販の純利益を計算する。

    Args:
        purchase_price_jpy:    仕入れ価格（円）
        selling_price_local:   販売価格（現地通貨）
        platform_key:          プラットフォームキー（例 'Shopee_SG'）
        purchase_shipping_jpy: 仕入れ時の国内送料（円）
        intl_shipping_jpy:     国際送料（円）Noneで自動計算
        weight_g:              商品重量（g）
        include_packaging_jpy: 梱包材費（円）

    Returns:
        利益計算の詳細辞書
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

    # 利益率
    profit_rate = (net_profit_jpy / selling_price_jpy * 100) if selling_price_jpy > 0 else 0

    # ROI（仕入れ額に対する利益率）
    invest_total = purchase_price_jpy + purchase_shipping_jpy
    roi = (net_profit_jpy / invest_total * 100) if invest_total > 0 else 0

    return {
        'platform_key': platform_key,
        'platform_name': pf['name'],
        'platform_flag': pf['flag'],
        'currency': currency,
        'area': pf['area'],
        'note': pf['note'],

        # 価格
        'selling_price_local': selling_price_local,
        'selling_price_jpy': selling_price_jpy,
        'purchase_price_jpy': purchase_price_jpy,

        # コスト内訳
        'purchase_shipping_jpy': purchase_shipping_jpy,
        'intl_shipping_jpy': intl_shipping_jpy,
        'platform_fee_jpy': round(platform_fee_jpy),
        'platform_fee_rate': fee_rate,
        'packaging_jpy': include_packaging_jpy,
        'total_cost_jpy': round(total_cost_jpy),

        # 利益
        'net_profit_jpy': round(net_profit_jpy),
        'profit_rate': round(profit_rate, 1),
        'roi': round(roi, 1),

        # 判定
        'is_profitable': net_profit_jpy > 0,
        'rating': _rate_deal(profit_rate),
    }


def _rate_deal(profit_rate: float) -> str:
    """利益率から評価を返す"""
    if profit_rate >= 40:
        return 'excellent'   # 優秀
    elif profit_rate >= 25:
        return 'good'        # 良い
    elif profit_rate >= 10:
        return 'ok'          # まあまあ
    elif profit_rate >= 0:
        return 'marginal'    # ギリギリ
    else:
        return 'loss'        # 赤字


def calculate_profit_matrix(
    purchase_price_jpy: float,
    selling_prices: Dict[str, float],     # {'Shopee_SG': 50.0, 'eBay': 45.0, ...} 現地通貨
    purchase_shipping_jpy: float = 0,
    weight_g: float = 500,
) -> List[Dict]:
    """
    複数プラットフォームの利益を一括計算してランキング形式で返す。

    Args:
        selling_prices: {platform_key: 現地通貨での販売価格}
    """
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

    # 純利益の高い順にソート
    results.sort(key=lambda x: x.get('net_profit_jpy', -9999999), reverse=True)
    return results


def calculate_breakeven_price_local(
    purchase_price_jpy: float,
    platform_key: str,
    purchase_shipping_jpy: float = 0,
    weight_g: float = 500,
    target_profit_rate: float = 0.0,    # 0 = 損益分岐のみ
) -> Dict:
    """
    指定プラットフォームで利益ゼロ（または目標利益率）になる最低販売価格を計算。

    Returns: {'price_local': ..., 'price_jpy': ..., 'currency': ...}
    """
    pf = GLOBAL_PLATFORMS.get(platform_key)
    if not pf:
        return {}

    currency = pf['currency']
    fee_rate = pf['fee_rate']
    fixed_fee_jpy = pf.get('fixed_fee_jpy', 0)
    intl_shipping = get_intl_shipping(platform_key, weight_g)

    total_fixed_cost = purchase_price_jpy + purchase_shipping_jpy + intl_shipping + fixed_fee_jpy

    # selling_jpy * (1 - fee_rate) * (1 - target_profit_rate) >= total_fixed_cost
    # selling_jpy = total_fixed_cost / ((1 - fee_rate) * (1 - target_profit_rate))
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
    }


def suggest_selling_price(
    purchase_price_jpy: float,
    platform_key: str,
    target_profit_rate: float = 0.25,
    purchase_shipping_jpy: float = 0,
    weight_g: float = 500,
) -> Dict:
    """
    目標利益率（デフォルト25%）を達成するための推奨販売価格を計算。
    """
    return calculate_breakeven_price_local(
        purchase_price_jpy,
        platform_key,
        purchase_shipping_jpy,
        weight_g,
        target_profit_rate,
    )
