import type { Metadata } from "next";
export const metadata: Metadata = { title: "プラン・料金" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
