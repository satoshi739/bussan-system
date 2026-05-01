export type PlanKey = "FREE" | "STANDARD" | "PRO";

export interface PlanInfo {
  name: string;
  nameEn: string;
  price: number;
  priceId: string | null;
  features: string[];
  limits: {
    maxPurchases: number;
    scanner: boolean;
    search: boolean;
    watchlist: boolean;
    globalCalc: boolean;
    advancedReports: boolean;
  };
}

export const PLANS: Record<PlanKey, PlanInfo> = {
  FREE: {
    name: "フリー",
    nameEn: "Free",
    price: 0,
    priceId: null,
    features: [
      "仕入れ管理（30件まで）",
      "利益計算",
      "ダッシュボード",
    ],
    limits: {
      maxPurchases: 30,
      scanner: false,
      search: false,
      watchlist: false,
      globalCalc: false,
      advancedReports: false,
    },
  },
  STANDARD: {
    name: "Standard",
    nameEn: "Standard",
    price: 9800,
    priceId: null,
    features: [
      "仕入れ管理（無制限）",
      "利益計算",
      "スキャナー（商品検索）",
      "価格検索",
      "ウォッチリスト",
      "グローバル計算",
      "レポート",
    ],
    limits: {
      maxPurchases: Infinity,
      scanner: true,
      search: true,
      watchlist: true,
      globalCalc: true,
      advancedReports: false,
    },
  },
  PRO: {
    name: "Pro",
    nameEn: "Pro",
    price: 19800,
    priceId: null,
    features: [
      "Standardの全機能",
      "高度な分析レポート",
      "CSVエクスポート",
      "優先サポート",
    ],
    limits: {
      maxPurchases: Infinity,
      scanner: true,
      search: true,
      watchlist: true,
      globalCalc: true,
      advancedReports: true,
    },
  },
};

export function getPlanLimits(plan: PlanKey) {
  return PLANS[plan].limits;
}
