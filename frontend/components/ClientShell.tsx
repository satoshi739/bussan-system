"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

const PUBLIC_PATHS = ["/login", "/pricing"];

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const showSidebar = !isPublic && !!session;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {showSidebar && <Sidebar />}
      <main
        style={{
          flex: 1,
          padding: showSidebar ? "32px 28px" : "0",
          overflowY: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
