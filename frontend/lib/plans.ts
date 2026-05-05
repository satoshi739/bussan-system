export type PlanKey = "FREE" | "LITE" | "STANDARD" | "PRO";

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
      "月10スキャン",
      "基本利益計算（送料・手数料込み）",
      "履歴保存（3件）",
      "AIアドバイス（一部表示）",
    ],
    limits: {
      maxPurchases: 10,
      scanner: true,
      search: false,
      watchlist: false,
      globalCalc: false,
      advancedReports: false,
    },
  },
  LITE: {
    name: "Lite",
    nameEn: "Lite",
    price: 4980,
    priceId: null,
    features: [
      "月100スキャン",
      "買い／注意／見送り 赤字判定",
      "利益計算（メルカリ／Amazon）",
      "履歴保存（50件）",
      "基本AIアドバイス",
    ],
    limits: {
      maxPurchases: 50,
      scanner: true,
      search: true,
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
      "月500スキャン（買い／注意／見送り判定）",
      "赤字仕入れ防止AIアドバイス（全項目）",
      "利益計算（メルカリ／Amazon／eBay）",
      "相場検索 無制限",
      "ウォッチリスト 無制限",
      "仕入れ・出品・売上管理 無制限",
      "CSVエクスポート",
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
