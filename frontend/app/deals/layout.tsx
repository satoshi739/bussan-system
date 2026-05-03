import type { Metadata } from "next";
export const metadata: Metadata = { title: "お得な案件" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
