import type { Metadata } from "next";
export const metadata: Metadata = { title: "バーコードスキャン | 物販チェッカー" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
