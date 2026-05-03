import type { Metadata } from "next";
export const metadata: Metadata = { title: "外注・発送管理" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
