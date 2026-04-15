import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/Toast";
import Providers from "@/components/Providers";
import ClientShell from "@/components/ClientShell";

export const metadata: Metadata = {
  title: "物販チェッカー",
  description: "物販管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <Providers>
          <ClientShell>{children}</ClientShell>
        </Providers>
        <ToastContainer />
      </body>
    </html>
  );
}
