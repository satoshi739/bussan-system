from typing import Dict, Optional

# ===== Amazon.co.jp カテゴリー別紹介料率 =====

AMAZON_REFERRAL_FEES = {
    '家電・カメラ':             0.08,
    'パソコン・周辺機器':       0.08,
    'スマートフォン・タブレット': 0.08,
    'おもちゃ・ゲーム':         0.10,
    'スポーツ・アウトドア':     0.10,
    'ホーム&キッチン':          0.10,
    'アパレル・ファッション':   0.15,
    '本・音楽・DVD':            0.15,
    'ビューティー・コスメ':     0.10,
    'ペット用品':               0.10,
    'コレクター商品':           0.12,
    'その他':                   0.10,
}

CATEGORIES = AMAZON_REFERRAL_FEES

# ===== カテゴリ別標準重量（g） =====
# 500g固定より精度の高い送料計算のために使用
CATEGORY_WEIGHT_G: dict = {
    '家電・カメラ':               800,
    'パソコン・周辺機器':         1200,
    'スマートフォン・タブレット':  300,
    'おもちゃ・ゲーム':            600,
    'スポーツ・アウトドア':       1000,
    'ホーム&キッチン':            1500,
    'アパレル・ファッション':      400,
    '本・音楽・DVD':               300,
    'ビューティー・コスメ':        300,
    'ペット用品':                  500,
    'コレクター商品':              400,
    'その他':                      500,
}


def estimate_weight_by_category(category: str) -> float:
    """カテゴリから標準重量(g)を推定する。500g固定より送料誤差を大幅削減。"""
    return float(CATEGORY_WEIGHT_G.get(category, 500))

# ===== Amazon FBA 料金表（2024年・Amazon.co.jp） =====
# 区分: (最大重量g, 手数料円)
# 重量が超えるたびに次の段階へ

_FBA_TIERS = [
    # 小型
    (250,   257),   # 小型（〜250g）
    # 標準
    (500,   307),   # 標準（〜500g）
    (1000,  396),   # 標準（〜1kg）
    (2000,  499),   # 標準（〜2kg）
    (3000,  609),   # 標準（〜3kg）
    (4000,  719),   # 標準（〜4kg）
    (5000,  829),   # 標準（〜5kg）
    # 大型
    (10000, 940),   # 大型（〜10kg）
    (20000, 1130),  # 大型（〜20kg）
    (30000, 1320),  # 大型（〜30kg）
]

# 後方互換用（テンプレートで使うシンプルな区分）
FBA_FEES = {
    '小型': 257,
    '標準': 396,
    '大型': 940,
}


def calculate_fba_fee(size: str = '標準', weight_g: float = 500) -> float:
    """
    FBA手数料を計算する。
    weight_g が指定されていれば段階課金テーブルで精密計算。
    size のみ指定の場合は代表値を返す。
    """
    for max_g, fee in _FBA_TIERS:
        if weight_g <= max_g:
            return float(fee)
    # 30kg超は最終段階 + 超過分加算（1kg毎に190円）
    extra_kg = (weight_g - 30000) / 1000
    return float(1320 + int(extra_kg) * 190)


# ===== 販売プラットフォーム設定 =====
# fee_rate: 手数料率（None=カテゴリー別）
# fixed_fee: 固定手数料（円）

SELLING_PLATFORMS = {
    # ===== 国内フリマ =====
    'メルカリ':          {'fee_rate': 0.10,   'fixed_fee': 0,   'note': '販売手数料10%',               'emoji': '🏪', 'area': '国内'},
    'ラクマ':            {'fee_rate': 0.06,   'fixed_fee': 0,   'note': '販売手数料6%（最安水準）',    'emoji': '🛍️', 'area': '国内'},
    'PayPayフリマ':      {'fee_rate': 0.05,   'fixed_fee': 0,   'note': '販売手数料5%（最安クラス）',  'emoji': '💛', 'area': '国内'},
    'Yahoo!オークション': {'fee_rate': 0.088,  'fixed_fee': 0,   'note': '落札手数料8.8%',              'emoji': '🔨', 'area': '国内'},
    'ジモティー':         {'fee_rate': 0.0,    'fixed_fee': 0,   'note': '手数料0円！（地元取引）',     'emoji': '📍', 'area': '国内'},

    # ===== 国内EC =====
    'Amazon':            {'fee_rate': None,   'fixed_fee': 0,   'note': 'カテゴリー別（8〜15%）',      'emoji': '📦', 'area': '国内'},
    'ヤフーショッピング':  {'fee_rate': 0.074,  'fixed_fee': 0,   'note': 'ストア手数料7.4%',            'emoji': '🟡', 'area': '国内'},
    '楽天市場':           {'fee_rate': 0.10,   'fixed_fee': 0,   'note': '手数料約10%（ジャンル別）',   'emoji': '🔴', 'area': '国内'},
    'BASE':              {'fee_rate': 0.03,   'fixed_fee': 40,  'note': '3%＋40円/件',                 'emoji': '🛒', 'area': '国内'},
    'STORES':            {'fee_rate': 0.05,   'fixed_fee': 0,   'note': '販売手数料5%',                'emoji': '🏬', 'area': '国内'},

    # ===== 専門フリマ =====
    'メルカリShops':      {'fee_rate': 0.10,   'fixed_fee': 0,   'note': '販売手数料10%（ショップ版）', 'emoji': '🏪', 'area': '国内'},
    'ZOZOTOWN':          {'fee_rate': 0.35,   'fixed_fee': 0,   'note': '手数料約35%（アパレル特化）', 'emoji': '👗', 'area': '国内'},
    'オタマート':         {'fee_rate': 0.10,   'fixed_fee': 0,   'note': '販売手数料10%（オタク向け）', 'emoji': '🎮', 'area': '国内'},
    '駿河屋':            {'fee_rate': 0.0,    'fixed_fee': 0,   'note': '買取依頼（買取価格が収入）',  'emoji': '🎲', 'area': '国内'},

    # ===== 海外 =====
    'eBay（輸出）':       {'fee_rate': 0.1325, 'fixed_fee': 45,  'note': '手数料13.25%＋$0.30固定費・世界190カ国', 'emoji': '🌏', 'area': '海外'},
    'Etsy（輸出）':       {'fee_rate': 0.065,  'fixed_fee': 28,  'note': '6.5%＋出品料約28円',         'emoji': '🎨', 'area': '海外'},
    'Amazon.com（米国）': {'fee_rate': 0.15,   'fixed_fee': 0,   'note': '手数料約15%・米国向け',      'emoji': '🇺🇸', 'area': '海外'},
    'Lazada':            {'fee_rate': 0.02,   'fixed_fee': 0,   'note': '手数料約2〜4%・東南アジア6カ国', 'emoji': '🛒', 'area': '海外'},
}


# ===== Amazon手数料計算 =====

def calculate_amazon_fees(
    selling_price: float,
    category: str,
    use_fba: bool = False,
    fba_size: str = '標準',
    fba_weight_g: float = 500,
) -> Dict:
    referral_rate = AMAZON_REFERRAL_FEES.get(category, 0.10)
    referral_fee = selling_price * referral_rate
    fba_fee = calculate_fba_fee(fba_size, fba_weight_g) if use_fba else 0
    total_fees = referral_fee + fba_fee

    return {
        'referral_fee': referral_fee,
        'referral_rate': referral_rate,
        'fba_fee': fba_fee,
        'total_fees': total_fees,
        'net_after_fees': selling_price - total_fees,
    }


# ===== 汎用プラットフォーム手数料計算 =====

def calculate_platform_fees(
    selling_price: float,
    platform: str,
    category: str = 'その他',
    use_fba: bool = False,
    fba_size: str = '標準',
    fba_weight_g: float = 500,
) -> Dict:
    if platform == 'Amazon':
        return calculate_amazon_fees(selling_price, category, use_fba, fba_size, fba_weight_g)

    info = SELLING_PLATFORMS.get(platform, SELLING_PLATFORMS['メルカリ'])
    fee_rate = info['fee_rate'] or 0.10
    fixed_fee = info['fixed_fee']
    platform_fee = selling_price * fee_rate + fixed_fee

    return {
        'referral_fee': platform_fee,
        'referral_rate': fee_rate,
        'fba_fee': 0,
        'total_fees': platform_fee,
        'net_after_fees': selling_price - platform_fee,
    }


# ===== カテゴリー別返品・破損リスク率 =====
# 実績ベースの概算値（販売価格に対する割合）

_RETURN_RISK = {
    'アパレル・ファッション':    0.08,   # 返品率高い
    '家電・カメラ':              0.04,
    'パソコン・周辺機器':        0.04,
    'スマートフォン・タブレット': 0.03,
    'おもちゃ・ゲーム':          0.03,
    'コレクター商品':            0.02,
    'その他':                    0.02,
}


def get_return_risk_rate(category: str) -> float:
    """カテゴリー別の返品・破損リスク率（販売価格比）"""
    return _RETURN_RISK.get(category, 0.02)


# ===== 利益計算（マルチプラットフォーム対応） =====

def calculate_profit(
    purchase_price: float,
    selling_price: float,
    category: str = 'その他',
    shipping_to_platform: float = 0,
    purchase_shipping: float = 0,
    use_fba: bool = False,
    fba_size: str = '標準',
    fba_weight_g: float = 500,
    selling_platform: str = 'Amazon',
    include_return_risk: bool = False,
) -> Dict:
    """
    純利益を計算する（複数の販売プラットフォーム対応）

    Args:
        include_return_risk: Trueのとき返品・破損リスクコストを含める
    """
    purchase_total = purchase_price + purchase_shipping
    fees = calculate_platform_fees(
        selling_price, selling_platform, category, use_fba, fba_size, fba_weight_g
    )

    return_risk_cost = 0.0
    if include_return_risk:
        risk_rate = get_return_risk_rate(category)
        return_risk_cost = selling_price * risk_rate

    gross_profit = (
        selling_price
        - purchase_total
        - fees['total_fees']
        - shipping_to_platform
        - return_risk_cost
    )
    profit_rate = (gross_profit / selling_price * 100) if selling_price > 0 else 0
    roi = (gross_profit / purchase_total * 100) if purchase_total > 0 else 0

    return {
        'purchase_total': purchase_total,
        'selling_price': selling_price,
        'platform_fees': fees['total_fees'],
        'amazon_fees': fees['total_fees'],      # 後方互換
        'shipping_cost': shipping_to_platform,
        'return_risk_cost': return_risk_cost,
        'gross_profit': gross_profit,
        'profit_rate': profit_rate,
        'roi': roi,
        'breakdown': fees,
        'selling_platform': selling_platform,
    }


def calculate_profit_all_platforms(
    purchase_price: float,
    purchase_shipping: float = 0,
    selling_prices: Optional[Dict[str, float]] = None,
    category: str = 'その他',
    shipping: float = 0,
) -> Dict[str, Dict]:
    """全プラットフォームの利益を一括計算する"""
    if selling_prices is None:
        return {}

    results = {}
    for platform, price in selling_prices.items():
        if price and price > 0:
            results[platform] = calculate_profit(
                purchase_price, price, category,
                shipping, purchase_shipping,
                selling_platform=platform,
            )
    return results


def find_breakeven_price(
    purchase_price: float,
    category: str = 'その他',
    purchase_shipping: float = 0,
    shipping_to_platform: float = 0,
    use_fba: bool = False,
    fba_weight_g: float = 500,
    selling_platform: str = 'Amazon',
) -> float:
    total_cost = purchase_price + purchase_shipping + shipping_to_platform

    if selling_platform == 'Amazon':
        referral_rate = AMAZON_REFERRAL_FEES.get(category, 0.10)
        fba_fee = calculate_fba_fee('標準', fba_weight_g) if use_fba else 0
        if referral_rate >= 1.0:
            return float('inf')
        return (total_cost + fba_fee) / (1 - referral_rate)
    else:
        info = SELLING_PLATFORMS.get(selling_platform, {'fee_rate': 0.10, 'fixed_fee': 0})
        rate = info.get('fee_rate') or 0.10
        fixed = info.get('fixed_fee', 0)
        if rate >= 1:
            return total_cost + fixed
        return (total_cost + fixed) / (1 - rate)


def max_purchase_price(
    selling_price: float,
    category: str = 'その他',
    target_profit_rate: float = 0.20,
    shipping_to_platform: float = 0,
    use_fba: bool = False,
    fba_weight_g: float = 500,
    selling_platform: str = 'Amazon',
) -> float:
    fees = calculate_platform_fees(selling_price, selling_platform, category, use_fba,
                                   fba_weight_g=fba_weight_g)
    result = selling_price * (1 - target_profit_rate) - fees['total_fees'] - shipping_to_platform
    return max(0, result)
