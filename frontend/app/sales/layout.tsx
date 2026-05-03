import type { Metadata } from "next";
export const metadata: Metadata = { title: "売上管理" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
