"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import OnboardingModal, { useOnboarding } from "@/components/OnboardingModal";

const PUBLIC_PATHS = ["/login", "/pricing", "/deals"];

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const showSidebar = !isPublic;

  const { show: showOnboarding, complete: completeOnboarding } = useOnboarding();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {showSidebar && <Sidebar />}
      <main
        style={{
          flex: 1,
          padding: showSidebar ? "32px 28px" : "0",
          overflowY: "auto",
          minWidth: 0,
        }}
        className={showSidebar ? "main-with-sidebar" : ""}
      >
        {children}
      </main>
      {showSidebar && (
        <style>{`
          @media (max-width: 768px) {
            .main-with-sidebar { padding: 24px 16px 80px !important; }
          }
        `}</style>
      )}

      {/* オンボーディングモーダル（初回ログイン時のみ） */}
      {showSidebar && session?.user && showOnboarding && (
        <OnboardingModal onComplete={completeOnboarding} />
      )}
    </div>
  );
}
