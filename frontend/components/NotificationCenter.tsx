"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ShoppingBag, MessageSquare, AlertCircle, TrendingUp, Sparkles, Check } from "lucide-react";

type NotificationType = "sale" | "message" | "alert" | "milestone" | "discovery";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  time: string;
  read: boolean;
};

const TYPE_META: Record<NotificationType, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  sale:      { icon: ShoppingBag,    color: "#1E9C3C", bg: "rgba(30,156,60,0.10)",  label: "売却" },
  message:   { icon: MessageSquare,  color: "#006FE6", bg: "rgba(0,111,230,0.10)",  label: "メッセージ" },
  alert:     { icon: AlertCircle,    color: "#E88500", bg: "rgba(232,133,0,0.10)",  label: "アラート" },
  milestone: { icon: TrendingUp,     color: "#C9A96B", bg: "rgba(201,169,107,0.10)", label: "達成" },
  discovery: { icon: Sparkles,       color: "#40AADF", bg: "rgba(64,170,223,0.10)",  label: "発見" },
};

const SAMPLE_NOTIFICATIONS: Notification[] = [
  { id: "1", type: "sale",      title: "売れました！",            body: "セイコー 5 SNXS79 自動巻き / +¥7,800", href: "/sales",         time: "3分前",  read: false },
  { id: "2", type: "message",   title: "新規メッセージ",         body: "高橋様: 「明日発送できますか？」",      href: "/sales",         time: "12分前", read: false },
  { id: "3", type: "discovery", title: "高利益商品14件発見",     body: "ROI 50%以上の腕時計が見つかりました",   href: "/discover",      time: "1時間前", read: false },
  { id: "4", type: "milestone", title: "10件売却バッジ獲得",     body: "Silver ティアのバッジが解放されました",  href: "/achievements",  time: "今朝",   read: true },
  { id: "5", type: "alert",     title: "在庫滞留アラート",       body: "3週間動いていない在庫が2点あります",     href: "/inventory",     time: "昨日",   read: true },
  { id: "6", type: "sale",      title: "売れました！",           body: "レゴ テクニック 42083 / +¥9,200",       href: "/sales",         time: "2日前", read: true },
];

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(SAMPLE_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter(i => !i.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = () => setItems(items.map(i => ({ ...i, read: true })));

  return (
    <div ref={ref} style={{ position: "fixed", top: 20, right: 24, zIndex: 100 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="通知"
        style={{
          width: 40, height: 40, borderRadius: "50%",
          background: open ? "var(--nav-active)" : "var(--surface)",
          border: "1px solid var(--border)",
          color: open ? "var(--blue)" : "var(--text-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", position: "relative",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 4, right: 4,
            minWidth: 16, height: 16, padding: "0 4px",
            background: "#FF3B30", color: "#fff",
            borderRadius: 999, fontSize: 9, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #fff",
            lineHeight: 1,
          }}>{unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 50, right: 0,
          width: 380, maxWidth: "calc(100vw - 32px)",
          background: "var(--surface)",
          borderRadius: 18,
          boxShadow: "0 16px 48px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.06)",
          overflow: "hidden",
          animation: "nc-slide-down 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          {/* Header */}
          <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>通知</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{unread > 0 ? `${unread}件の未読` : "すべて既読"}</div>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background: "transparent", border: "none", color: "var(--blue)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={12} /> すべて既読
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 440, overflowY: "auto" }}>
            {items.length === 0 ? (
              <div style={{ padding: "40px 18px", textAlign: "center", color: "rgba(8,13,28,0.45)", fontSize: 13 }}>通知はありません</div>
            ) : (
              items.map(n => {
                const meta = TYPE_META[n.type];
                const Icon = meta.icon;
                const Inner = (
                  <div style={{
                    display: "flex", gap: 12,
                    padding: "12px 18px",
                    background: n.read ? "transparent" : "rgba(0,111,230,0.025)",
                    borderBottom: "1px solid rgba(0,0,0,0.04)",
                    cursor: n.href ? "pointer" : "default",
                    transition: "background 0.12s",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: meta.bg,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Icon size={16} color={meta.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#080D1C", letterSpacing: "-0.01em" }}>{n.title}</div>
                        {!n.read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#006FE6" }} />}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(8,13,28,0.65)", lineHeight: 1.4, marginBottom: 4 }}>{n.body}</div>
                      <div style={{ fontSize: 10, color: "rgba(8,13,28,0.45)", fontWeight: 500 }}>{n.time}</div>
                    </div>
                  </div>
                );
                return n.href ? (
                  <Link key={n.id} href={n.href} style={{ textDecoration: "none", color: "inherit" }} onClick={() => { setItems(items.map(i => i.id === n.id ? { ...i, read: true } : i)); setOpen(false); }}>{Inner}</Link>
                ) : (
                  <div key={n.id}>{Inner}</div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(0,0,0,0.06)", textAlign: "center" }}>
            <span style={{ fontSize: 11, color: "rgba(8,13,28,0.55)" }}>すべての通知は7日間保持されます</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes nc-slide-down { from { opacity: 0; transform: translateY(-8px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @media (max-width: 768px) { div[role="presentation"] { right: 16px } }
      `}</style>
    </div>
  );
}
