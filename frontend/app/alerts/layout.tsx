import type { Metadata } from "next";
export const metadata: Metadata = { title: "価格アラート" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
