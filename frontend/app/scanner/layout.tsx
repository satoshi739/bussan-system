import type { Metadata } from "next";
export const metadata: Metadata = { title: "利益スキャナー" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
