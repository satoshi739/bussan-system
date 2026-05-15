"""コア利益計算ロジックの回帰テスト。

ユーザーに見える金額・利益率・ROI を保護する。
失敗 = 本番ユーザーへの請求/表示が崩れる可能性。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from calculators import (
    AMAZON_REFERRAL_FEES,
    SELLING_PLATFORMS,
    calculate_profit,
    estimate_domestic_shipping,
    estimate_weight_by_category,
    find_breakeven_price,
    max_purchase_price,
)


class TestEstimateWeightByCategory:
    def test_known_category_returns_table_value(self):
        assert estimate_weight_by_category("家電・カメラ") == 800
        assert estimate_weight_by_category("本・音楽・DVD") == 300

    def test_unknown_category_falls_back_to_500g(self):
        assert estimate_weight_by_category("存在しないカテゴリ") == 500


class TestEstimateDomesticShipping:
    def test_clickpost_under_threshold_is_185_yen(self):
        result = estimate_domestic_shipping(500, 50, carrier="clickpost")
        assert result["fee"] == 185
        assert "クリックポスト" in result["carrier"]

    def test_yamato_size_60_returns_smallest_tier(self):
        result = estimate_domestic_shipping(1500, 55, carrier="yamato")
        assert result["fee"] == 1650

    def test_yamato_size_120_returns_correct_tier(self):
        result = estimate_domestic_shipping(10000, 115, carrier="yamato")
        assert result["fee"] == 2530

    def test_yupack_uses_yupack_table(self):
        result = estimate_domestic_shipping(2000, 70, carrier="yupacket")
        # 70cmはyupack 80サイズ枠
        assert result["fee"] == 1320


class TestCalculateProfitMercari:
    """メルカリで仕入1,000円→販売3,000円のシナリオ。
    本線フロー（ボタンひとつで出品）の中核なので絶対に壊さないこと。"""

    def test_basic_profit_breakdown(self):
        result = calculate_profit(
            purchase_price=1000,
            selling_price=3000,
            selling_platform="メルカリ",
            category="その他",
        )
        # メルカリ手数料率は10% = 300円
        assert result["platform_fees"] == pytest.approx(300, rel=0.01)
        # gross_profit = 3000 - 1000 - 300 = 1700
        assert result["gross_profit"] == pytest.approx(1700, abs=1)
        # profit_rate = 1700/3000 ≈ 56.67%
        assert result["profit_rate"] == pytest.approx(56.67, abs=0.5)
        # roi = 1700/1000 = 170%
        assert result["roi"] == pytest.approx(170, abs=1)

    def test_zero_selling_price_no_division_error(self):
        result = calculate_profit(
            purchase_price=1000,
            selling_price=0,
            selling_platform="メルカリ",
        )
        # profit_rate は分母0回避で0、ROIは仕入分損失で-100%
        assert result["profit_rate"] == 0
        assert result["roi"] == pytest.approx(-100, abs=1)

    def test_zero_purchase_price_no_division_error(self):
        result = calculate_profit(
            purchase_price=0,
            selling_price=3000,
            selling_platform="メルカリ",
        )
        assert result["roi"] == 0


class TestCalculateProfitAmazon:
    def test_amazon_uses_category_referral_fee(self):
        """家電・カメラは8%、アパレルは15%。料率がカテゴリで切り替わる。"""
        electronics = calculate_profit(
            purchase_price=1000,
            selling_price=3000,
            selling_platform="Amazon",
            category="家電・カメラ",
        )
        apparel = calculate_profit(
            purchase_price=1000,
            selling_price=3000,
            selling_platform="Amazon",
            category="アパレル・ファッション",
        )
        # 家電 8% < アパレル 15% → 家電の方が手取り利益が大きい
        assert electronics["gross_profit"] > apparel["gross_profit"]


class TestFindBreakevenPrice:
    def test_amazon_breakeven_above_cost(self):
        """損益分岐点は仕入総額より必ず大きい（手数料があるため）。"""
        breakeven = find_breakeven_price(
            purchase_price=1000,
            category="その他",
            selling_platform="Amazon",
        )
        assert breakeven > 1000

    def test_mercari_breakeven_matches_fee_math(self):
        """メルカリ手数料10% → 損益分岐は cost / 0.9"""
        breakeven = find_breakeven_price(
            purchase_price=900,
            selling_platform="メルカリ",
        )
        # 900 / (1 - 0.10) = 1000
        assert breakeven == pytest.approx(1000, abs=1)


class TestMaxPurchasePrice:
    def test_higher_target_rate_lowers_max_purchase(self):
        """目標利益率を上げると、許容仕入価格は下がる。"""
        low_target = max_purchase_price(
            selling_price=3000,
            target_profit_rate=0.10,
            selling_platform="メルカリ",
        )
        high_target = max_purchase_price(
            selling_price=3000,
            target_profit_rate=0.40,
            selling_platform="メルカリ",
        )
        assert low_target > high_target

    def test_never_returns_negative(self):
        """目標利益率が非現実的でも 0 円より下にしない。"""
        result = max_purchase_price(
            selling_price=1000,
            target_profit_rate=0.99,
            selling_platform="メルカリ",
        )
        assert result >= 0


class TestPlatformTablesAreSane:
    """テーブル定義の事故防止。手数料率が異常値になっていないか。"""

    def test_all_amazon_categories_have_reasonable_rates(self):
        for category, rate in AMAZON_REFERRAL_FEES.items():
            assert 0 < rate < 1, f"{category} has bad rate {rate}"

    def test_all_platforms_have_emoji_and_area(self):
        for name, info in SELLING_PLATFORMS.items():
            assert "emoji" in info, f"{name} missing emoji"
            assert "area" in info, f"{name} missing area"
