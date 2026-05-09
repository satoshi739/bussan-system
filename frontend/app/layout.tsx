import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/Toast";
import Providers from "@/components/Providers";
import ClientShell from "@/components/ClientShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "物販チェッカー | 赤字仕入れを防ぐ利益スキャナー",
    template: "%s | 物販チェッカー",
  },
  description: "eBay・メルカリ・Amazonの仕入れ候補を3秒でスキャン。赤字判定AIが買い/注意/見送りを即判断。物販せどり向けワンストップSaaSツール。7日間無料トライアル。",
  keywords: ["物販", "せどり", "仕入れ", "利益計算", "eBay", "メルカリ", "Amazon", "利益スキャナー", "物販チェッカー", "副業", "バーコードスキャン"],
  metadataBase: new URL("https://app.upjapan.co.jp"),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://app.upjapan.co.jp",
    siteName: "物販チェッカー",
    title: "物販チェッカー | 赤字仕入れを防ぐ利益スキャナー",
    description: "eBay・メルカリ・Amazonの仕入れ候補を3秒でスキャン。赤字判定AIが買い/注意/見送りを即判断。7日間無料トライアル。",
  },
  twitter: {
    card: "summary",
    title: "物販チェッカー | 赤字仕入れを防ぐ利益スキャナー",
    description: "eBay・メルカリ・Amazonの仕入れ候補を3秒でスキャン。赤字判定AIが買い/注意/見送りを即判断。7日間無料トライアル。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Providers>
            <ClientShell>{children}</ClientShell>
          </Providers>
          <ToastContainer />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
