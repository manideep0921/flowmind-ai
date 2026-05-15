"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import {
  LayoutDashboard, GitBranch, AlertTriangle,
  BarChart3, Settings, LogOut, Zap, MessageSquare, ChevronDown,
} from "lucide-react";

const NAV = [
  { href: "/dashboard",           label: "Overview",   icon: LayoutDashboard },
  { href: "/dashboard/workflows", label: "Workflows",  icon: GitBranch },
  { href: "/dashboard/alerts",    label: "Alerts",     icon: AlertTriangle },
  { href: "/dashboard/analytics", label: "Analytics",  icon: BarChart3 },
  { href: "/dashboard/copilot",   label: "AI Copilot", icon: MessageSquare },
  { href: "/dashboard/settings",  label: "Settings",   icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, organization, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--color-canvas-default)" }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        background: "var(--color-surface-1)",
        borderRight: "1px solid var(--color-border-default)",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Logo / org */}
        <div style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          borderBottom: "1px solid var(--color-border-muted)",
          gap: 8,
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: "var(--color-accent-emphasis)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Zap size={13} color="#fff" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-default)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {organization?.name || "FlowMind AI"}
          </span>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "8px 6px", overflowY: "auto" }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 6,
                marginBottom: 1,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--color-fg-default)" : "var(--color-fg-muted)",
                background: active ? "var(--color-neutral-muted)" : "transparent",
                textDecoration: "none",
                transition: "background 80ms, color 80ms",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--color-neutral-subtle)"; e.currentTarget.style.color = "var(--color-fg-default)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = active ? "var(--color-neutral-muted)" : "transparent"; e.currentTarget.style.color = active ? "var(--color-fg-default)" : "var(--color-fg-muted)"; }}
              >
                <Icon size={15} style={{ color: active ? "var(--color-accent-fg)" : "var(--color-fg-muted)", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div style={{ padding: "6px", borderTop: "1px solid var(--color-border-muted)", position: "relative" }}>
          {menuOpen && (
            <div style={{
              position: "absolute", bottom: "100%", left: 6, right: 6, marginBottom: 4,
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border-default)",
              borderRadius: 6,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(1,4,9,0.6)",
              zIndex: 50,
            }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-border-muted)" }}>
                <p style={{ fontSize: 11, color: "var(--color-fg-subtle)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</p>
              </div>
              <button
                onClick={() => { logout(); router.push("/login"); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", background: "none", border: "none", cursor: "pointer",
                  fontSize: 12, color: "var(--color-danger-fg)", textAlign: "left",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-danger-subtle)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                <LogOut size={13} /> Sign out
              </button>
            </div>
          )}

          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "6px 8px", borderRadius: 6, background: "none", border: "none",
              cursor: "pointer", transition: "background 80ms",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-neutral-muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "var(--color-accent-muted)",
              border: "1px solid rgba(56,139,253,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontSize: 10, fontWeight: 700,
              color: "var(--color-accent-fg)",
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, textAlign: "left", overflow: "hidden" }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-fg-default)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</p>
              <p style={{ fontSize: 10, color: "var(--color-fg-subtle)", textTransform: "capitalize" }}>{user?.role?.toLowerCase()}</p>
            </div>
            <ChevronDown size={12} style={{ color: "var(--color-fg-subtle)", transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 120ms" }} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", background: "var(--color-canvas-default)" }}>
        {children}
      </main>
    </div>
  );
}
