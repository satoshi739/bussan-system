import type { Metadata } from "next";
export const metadata: Metadata = { title: "相場検索" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
