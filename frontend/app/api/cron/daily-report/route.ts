import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "satoshi6667s@gmail.com";

async function sendEmail(subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "noreply@resend.dev",
      to: ADMIN_EMAIL,
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
}

export async function GET(req: NextRequest) {
  // Fail-Closed: シークレット未設定なら一律拒否（"Bearer undefined" 攻撃を防ぐ）
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/daily-report] CRON_SECRET is not set");
    return NextResponse.json({ error: "Cron secret is not configured" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // 規模拡大時のメール本文肥大・Resend制限対策で表示上限を50件に。
  // 合計件数は別途 count() で取って「他N件」表示に使う。
  const LIST_LIMIT = 50;
  const where = { createdAt: { gte: yesterday, lt: today } };
  const [
    purchases, sales, scans,
    purchaseTotal, saleTotal, scanTotal, calcTotal,
    newUsers, totalUsers,
  ] = await Promise.all([
    prisma.purchaseRecord.findMany({
      where, include: { user: { select: { email: true } } },
      orderBy: { roi: "desc" }, take: LIST_LIMIT,
    }),
    prisma.saleRecord.findMany({
      where, include: { user: { select: { email: true } } },
      orderBy: { profit: "desc" }, take: LIST_LIMIT,
    }),
    prisma.scanHistory.findMany({
      where, include: { user: { select: { email: true } } },
      orderBy: { topRoi: "desc" }, take: LIST_LIMIT,
    }),
    prisma.purchaseRecord.count({ where }),
    prisma.saleRecord.count({ where }),
    prisma.scanHistory.count({ where }),
    prisma.profitCalcHistory.count({ where }),
    prisma.user.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    prisma.user.count(),
  ]);

  // 合計利益はリストが切り詰められても全件分を出したいので集計クエリで取る
  const profitAgg = await prisma.saleRecord.aggregate({ where, _sum: { profit: true } });
  const totalProfit = profitAgg._sum.profit ?? 0;
  const topPurchase = purchases[0];
  const topSale = sales[0];
  const topScan = scans[0];
  const dateStr = yesterday.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><style>
body{font-family:sans-serif;background:#0a0a0b;color:#F5F0E8;padding:24px}
.card{background:#1a1a1d;border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:20px;margin-bottom:16px}
.title{color:#D4AF37;font-size:22px;font-weight:bold;margin-bottom:20px}
.label{color:#8A8278;font-size:12px;margin-bottom:4px}
.value{color:#F5F0E8;font-size:18px;font-weight:bold}
.hi{color:#D4AF37}
table{width:100%;border-collapse:collapse}
th{color:#8A8278;font-size:11px;text-align:left;padding:6px;border-bottom:1px solid rgba(212,175,55,0.15)}
td{color:#F5F0E8;font-size:13px;padding:6px;border-bottom:1px solid rgba(255,255,255,0.05)}
</style></head><body>
<div class="title">📊 物販チェッカー 日次レポート — ${dateStr}</div>

<div class="card"><div style="display:flex;gap:32px;flex-wrap:wrap">
  <div><div class="label">新規ユーザー</div><div class="value">${newUsers}人</div></div>
  <div><div class="label">累計ユーザー</div><div class="value">${totalUsers}人</div></div>
  <div><div class="label">仕入れ記録</div><div class="value">${purchaseTotal}件</div></div>
  <div><div class="label">販売記録</div><div class="value">${saleTotal}件</div></div>
  <div><div class="label">スキャン</div><div class="value">${scanTotal}件</div></div>
  <div><div class="label">利益計算</div><div class="value">${calcTotal}件</div></div>
  <div><div class="label">確定利益合計</div><div class="value hi">¥${totalProfit.toLocaleString()}</div></div>
</div></div>

${topPurchase ? `<div class="card">
  <div style="color:#D4AF37;font-weight:bold;margin-bottom:12px">🛒 トップ仕入れ（ROI順）</div>
  <div class="label">${topPurchase.user.email}</div>
  <div class="value">${topPurchase.itemName}</div>
  <div style="margin-top:8px;display:flex;gap:24px">
    <div><div class="label">仕入値</div><div>¥${topPurchase.buyPrice.toLocaleString()}</div></div>
    <div><div class="label">利益</div><div class="hi">¥${topPurchase.profit.toLocaleString()}</div></div>
    <div><div class="label">ROI</div><div class="hi">${topPurchase.roi.toFixed(1)}%</div></div>
    <div><div class="label">PF</div><div>${topPurchase.platform}</div></div>
  </div>
</div>` : ""}

${topSale ? `<div class="card">
  <div style="color:#D4AF37;font-weight:bold;margin-bottom:12px">💰 トップ販売（利益順）</div>
  <div class="label">${topSale.user.email}</div>
  <div class="value">${topSale.itemName}</div>
  <div style="margin-top:8px;display:flex;gap:24px">
    <div><div class="label">売値</div><div>¥${topSale.sellPrice.toLocaleString()}</div></div>
    <div><div class="label">利益</div><div class="hi">¥${topSale.profit.toLocaleString()}</div></div>
    <div><div class="label">ROI</div><div class="hi">${topSale.roi.toFixed(1)}%</div></div>
  </div>
</div>` : ""}

${topScan ? `<div class="card">
  <div style="color:#D4AF37;font-weight:bold;margin-bottom:12px">🔍 トップスキャン</div>
  <div class="label">${topScan.user.email}</div>
  <div class="value">「${topScan.keyword}」</div>
  <div style="margin-top:8px;display:flex;gap:24px">
    <div><div class="label">ヒット数</div><div>${topScan.resultsCount}件</div></div>
    <div><div class="label">最高ROI</div><div class="hi">${topScan.topRoi.toFixed(1)}%</div></div>
    <div><div class="label">最高利益</div><div class="hi">¥${topScan.topProfit.toLocaleString()}</div></div>
  </div>
</div>` : ""}

${purchases.length > 0 ? `<div class="card">
  <div style="color:#D4AF37;font-weight:bold;margin-bottom:12px">📋 仕入れ一覧（上位${purchases.length}件 / 全${purchaseTotal}件）</div>
  <table><tr><th>ユーザー</th><th>商品</th><th>PF</th><th>仕入値</th><th>利益</th><th>ROI</th></tr>
  ${purchases.map(p=>`<tr><td>${p.user.email}</td><td>${p.itemName}</td><td>${p.platform}</td><td>¥${p.buyPrice.toLocaleString()}</td><td>¥${p.profit.toLocaleString()}</td><td>${p.roi.toFixed(1)}%</td></tr>`).join("")}
  </table>${purchaseTotal > purchases.length ? `<div style="color:#8A8278;font-size:11px;margin-top:8px">他 ${purchaseTotal - purchases.length} 件省略</div>` : ""}</div>` : ""}

${sales.length > 0 ? `<div class="card">
  <div style="color:#D4AF37;font-weight:bold;margin-bottom:12px">💹 販売一覧（上位${sales.length}件 / 全${saleTotal}件）</div>
  <table><tr><th>ユーザー</th><th>商品</th><th>売値</th><th>利益</th><th>ROI</th></tr>
  ${sales.map(s=>`<tr><td>${s.user.email}</td><td>${s.itemName}</td><td>¥${s.sellPrice.toLocaleString()}</td><td>¥${s.profit.toLocaleString()}</td><td>${s.roi.toFixed(1)}%</td></tr>`).join("")}
  </table>${saleTotal > sales.length ? `<div style="color:#8A8278;font-size:11px;margin-top:8px">他 ${saleTotal - sales.length} 件省略</div>` : ""}</div>` : ""}

<div style="text-align:center;color:#8A8278;font-size:11px;margin-top:24px">物販チェッカー 自動レポート</div>
</body></html>`;

  try {
    await sendEmail(`📊 物販チェッカー 日次レポート — ${dateStr}`, html);
    return NextResponse.json({ ok: true, date: dateStr, purchases: purchaseTotal, sales: saleTotal, scans: scanTotal });
  } catch (error) {
    console.error("[daily-report] error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
