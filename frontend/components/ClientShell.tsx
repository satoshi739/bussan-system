"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import OnboardingModal, { useOnboarding } from "@/components/OnboardingModal";

const PUBLIC_PATHS = ["/login", "/pricing", "/deals", "/legal"];

const CHECKLIST_KEY = "bussan_checklist";
const PAGE_CHECKLIST_MAP: Record<string, string> = {
  "/settings":  "settings",
  "/scanner":   "scan",
  "/barcode":   "barcode",
  "/purchases": "register",
};

function useAutoChecklist(pathname: string) {
  useEffect(() => {
    const itemId = PAGE_CHECKLIST_MAP[pathname];
    if (!itemId) return;
    try {
      const raw = localStorage.getItem(CHECKLIST_KEY);
      if (!raw) return;
      const items = JSON.parse(raw) as { id: string; done: boolean }[];
      const item = items.find((i) => i.id === itemId);
      if (item && !item.done) {
        const updated = items.map((i) => i.id === itemId ? { ...i, done: true } : i);
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(updated));
        window.dispatchEvent(new StorageEvent("storage", { key: CHECKLIST_KEY, newValue: JSON.stringify(updated) }));
      }
    } catch { /* ignore */ }
  }, [pathname]);
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const showSidebar = !isPublic;

  const { show: showOnboarding, complete: completeOnboarding } = useOnboarding();
  useAutoChecklist(pathname);

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
