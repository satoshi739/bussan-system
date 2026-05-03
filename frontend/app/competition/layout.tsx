import type { Metadata } from "next";
export const metadata: Metadata = { title: "競合分析" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
