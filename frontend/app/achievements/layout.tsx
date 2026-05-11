import type { Metadata } from "next";
export const metadata: Metadata = { title: "達成バッジ" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
