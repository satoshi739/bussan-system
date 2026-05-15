"""利益計算系エンドポイント。api.py から段階的に分離（パイロット）。"""

from fastapi import APIRouter
from pydantic import BaseModel

from calculators import (
    calculate_profit,
    max_purchase_price,
    SELLING_PLATFORMS,
    CATEGORIES,
    estimate_domestic_shipping,
)

router = APIRouter()


class ProfitCalcRequest(BaseModel):
    purchase_price: float
    selling_price: float
    category: str = "その他"
    purchase_shipping: float = 0
    shipping_to_platform: float = 0
    use_fba: bool = False
    selling_platform: str = "Amazon"


class MaxPurchaseRequest(BaseModel):
    selling_price: float
    target_profit_rate: float = 0.20
    selling_platform: str = "メルカリ"
    category: str = "その他"
    shipping_to_platform: float = 0


class AllPlatformsRequest(BaseModel):
    purchase_price: float
    purchase_shipping: float = 0
    selling_price: float


@router.post("/api/calc/profit")
def calc_profit(body: ProfitCalcRequest):
    result = calculate_profit(
        purchase_price=body.purchase_price,
        selling_price=body.selling_price,
        category=body.category,
        purchase_shipping=body.purchase_shipping,
        shipping_to_platform=body.shipping_to_platform,
        use_fba=body.use_fba,
        selling_platform=body.selling_platform,
    )
    return result


@router.get("/api/calc/shipping-estimate")
def calc_shipping_estimate(weight_g: float, size_cm: float, carrier: str = "yamato"):
    return estimate_domestic_shipping(weight_g, size_cm, carrier)


@router.get("/api/calc/platforms")
def get_platforms():
    return SELLING_PLATFORMS


@router.get("/api/calc/categories")
def get_categories():
    return list(CATEGORIES.keys())


@router.post("/api/calc/max-purchase")
def calc_max_purchase(body: MaxPurchaseRequest):
    max_price = max_purchase_price(
        selling_price=body.selling_price,
        category=body.category,
        target_profit_rate=body.target_profit_rate / 100 if body.target_profit_rate > 1 else body.target_profit_rate,
        shipping_to_platform=body.shipping_to_platform,
        selling_platform=body.selling_platform,
    )
    return {"max_purchase_price": max_price}


@router.post("/api/calc/all-platforms")
def calc_all_platforms(body: AllPlatformsRequest):
    results = {}
    for platform in SELLING_PLATFORMS:
        r = calculate_profit(
            purchase_price=body.purchase_price,
            selling_price=body.selling_price,
            purchase_shipping=body.purchase_shipping,
            selling_platform=platform,
        )
        results[platform] = {
            "gross_profit": r["gross_profit"],
            "profit_rate": r["profit_rate"],
            "platform_fees": r["platform_fees"],
            "emoji": SELLING_PLATFORMS[platform]["emoji"],
            "area": SELLING_PLATFORMS[platform]["area"],
        }
    return results
