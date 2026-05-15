"use client";
import { useEffect, useState } from "react";
import { analytics, workflows as workflowsApi, alerts as alertsApi } from "@/lib/api";
import { Activity, CheckCircle, AlertTriangle, Zap, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, parseISO } from "date-fns";
import Link from "next/link";

const TT = {
  contentStyle: { background: "#1c2128", border: "1px solid #30363d", borderRadius: 6, fontSize: 12, color: "#e6edf3" },
  labelStyle:   { color: "#8b949e" },
  itemStyle:    { color: "#e6edf3" },
};

export default function DashboardPage() {
  const [overview, setOverview]         = useState<any>(null);
  const [timeseries, setTimeseries]     = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [workflows, setWorkflows]       = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([analytics.overview(7), analytics.timeseries(7), alertsApi.list({ status: "OPEN" }), workflowsApi.list()])
      .then(([ov, ts, al, wf]) => {
        setOverview(ov);
        setTimeseries(ts.timeseries || []);
        setRecentAlerts((al || []).slice(0, 5));
        setWorkflows((wf || []).slice(0, 6));
      }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;

  const sr = overview?.successRate ?? 0;

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-fg-default)", margin: 0 }}>Overview</h1>
          <p style={{ fontSize: 12, color: "var(--color-fg-muted)", margin: "4px 0 0" }}>Last 7 days · real-time monitoring</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--color-success-fg)", background: "var(--color-success-subtle)", border: "1px solid rgba(63,185,80,0.25)", borderRadius: 20, padding: "3px 10px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-success-fg)", animation: "pulse 2s infinite" }} />
          Live
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <KpiCard label="Total executions" value={overview?.totalExecutions ?? 0}
          icon={<Activity size={15} style={{ color: "var(--color-accent-fg)" }} />} sub="past 7 days" />
        <KpiCard label="Success rate" value={`${sr}%`}
          icon={sr >= 90 ? <TrendingUp size={15} style={{ color: "var(--color-success-fg)" }} /> : <TrendingDown size={15} style={{ color: "var(--color-danger-fg)" }} />}
          valueColor={sr >= 90 ? "var(--color-success-fg)" : sr >= 70 ? "var(--color-warning-fg)" : "var(--color-danger-fg)"}
          sub={sr >= 90 ? "healthy" : "needs attention"} />
        <KpiCard label="Failed executions" value={overview?.failedExecutions ?? 0}
          icon={<AlertTriangle size={15} style={{ color: "var(--color-danger-fg)" }} />}
          valueColor={(overview?.failedExecutions ?? 0) > 0 ? "var(--color-danger-fg)" : "var(--color-fg-default)"}
          sub="past 7 days" />
        <KpiCard label="Open alerts" value={overview?.openAlerts ?? 0}
          icon={<Zap size={15} style={{ color: "var(--color-warning-fg)" }} />}
          valueColor={(overview?.openAlerts ?? 0) > 0 ? "var(--color-warning-fg)" : "var(--color-fg-default)"}
          sub="require action" />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-default)" }}>Execution volume</span>
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--color-fg-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 2, background: "var(--color-success-fg)", borderRadius: 2, display: "inline-block" }} />Success</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 2, background: "var(--color-danger-fg)", borderRadius: 2, display: "inline-block" }} />Failed</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={176}>
            <AreaChart data={timeseries} margin={{ top: 2, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3fb950" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f85149" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f85149" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#6e7681", fontSize: 10 }} tickFormatter={(d) => format(parseISO(d), "MMM d")} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6e7681", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} labelFormatter={(d) => format(parseISO(d as string), "MMM d, yyyy")} />
              <Area type="monotone" dataKey="success" name="Success" stroke="#3fb950" fill="url(#gs)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="failed"  name="Failed"  stroke="#f85149" fill="url(#gf)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-default)", marginBottom: 16 }}>Top failure categories</p>
          {(overview?.topFailureCategories?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={overview.topFailureCategories} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#6e7681", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" tick={{ fill: "#8b949e", fontSize: 9 }} axisLine={false} tickLine={false} width={84}
                  tickFormatter={(c: string) => c.replace(/_/g, " ")} />
                <Tooltip {...TT} />
                <Bar dataKey="count" fill="var(--color-accent-fg)" radius={[0, 3, 3, 0]} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 176, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={24} style={{ color: "var(--color-success-fg)", opacity: 0.5, marginBottom: 8 }} />
              <p style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>No failures this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Workflow health */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--color-border-muted)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-default)" }}>Workflow health</span>
            <Link href="/dashboard/workflows" style={{ fontSize: 11, color: "var(--color-accent-fg)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {workflows.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>No workflows yet.</p>
            </div>
          ) : workflows.map((wf: any) => {
            const risk = wf.stats?.riskScore;
            const s    = wf.stats?.successRate ?? 0;
            const dotColor = risk > 0.7 || s < 70 ? "var(--color-danger-fg)" : risk > 0.4 || s < 90 ? "var(--color-warning-fg)" : "var(--color-success-fg)";
            return (
              <Link key={wf.id} href={`/dashboard/workflows/${wf.id}`} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderBottom: "1px solid var(--color-border-muted)", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-fg-default)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{wf.name}</p>
                    <p style={{ fontSize: 10, color: "var(--color-fg-subtle)", margin: 0 }}>{wf.source}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: s >= 90 ? "var(--color-success-fg)" : s >= 70 ? "var(--color-warning-fg)" : "var(--color-danger-fg)", margin: 0 }}>{s}%</p>
                    <p style={{ fontSize: 10, color: "var(--color-fg-subtle)", margin: 0 }}>success</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent alerts */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--color-border-muted)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-default)" }}>Recent alerts</span>
            <Link href="/dashboard/alerts" style={{ fontSize: 11, color: "var(--color-accent-fg)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {recentAlerts.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <CheckCircle size={22} style={{ color: "var(--color-success-fg)", opacity: 0.4, display: "block", margin: "0 auto 8px" }} />
              <p style={{ fontSize: 12, color: "var(--color-fg-muted)", margin: 0 }}>No open alerts</p>
            </div>
          ) : recentAlerts.map((alert: any) => {
            const dotColor = alert.severity === "CRITICAL" || alert.severity === "HIGH" ? "var(--color-danger-fg)" : alert.severity === "MEDIUM" ? "var(--color-warning-fg)" : "var(--color-accent-fg)";
            return (
              <div key={alert.id} style={{ display: "flex", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--color-border-muted)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0, marginTop: 4 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-fg-default)", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alert.title}</p>
                  <p style={{ fontSize: 11, color: "var(--color-fg-muted)", margin: 0, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{alert.message}</p>
                  {alert.workflow?.name && <p style={{ fontSize: 10, color: "var(--color-fg-subtle)", margin: "2px 0 0" }}>{alert.workflow.name}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, valueColor = "var(--color-fg-default)", sub }: {
  label: string; value: string | number; icon: React.ReactNode; valueColor?: string; sub?: string;
}) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: "var(--color-fg-muted)", margin: 0, fontWeight: 500 }}>{label}</p>
        <div style={{ padding: 6, borderRadius: 6, background: "var(--color-neutral-subtle)" }}>{icon}</div>
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, color: valueColor, margin: "0 0 2px", fontVariantNumeric: "tabular-nums" }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "var(--color-fg-subtle)", margin: 0 }}>{sub}</p>}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <div style={{ height: 16, width: 80, background: "var(--color-surface-2)", borderRadius: 4, marginBottom: 20 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {[...Array(4)].map((_, i) => <div key={i} className="card" style={{ height: 96, background: "var(--color-surface-2)" }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ height: 220, background: "var(--color-surface-2)" }} />
        <div className="card" style={{ height: 220, background: "var(--color-surface-2)" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="card" style={{ height: 200, background: "var(--color-surface-2)" }} />
        <div className="card" style={{ height: 200, background: "var(--color-surface-2)" }} />
      </div>
    </div>
  );
}
