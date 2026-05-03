import type { Metadata } from "next";
export const metadata: Metadata = { title: "利益計算機" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
