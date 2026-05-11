import type { Metadata } from "next";
export const metadata: Metadata = { title: "今週の振り返り" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
