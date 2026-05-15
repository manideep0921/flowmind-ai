"use client";
import { useEffect, useState } from "react";
import { analytics } from "@/lib/api";
import { format, parseISO } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  AUTH_ERROR:       "#f85149",
  RATE_LIMIT:       "#d29922",
  SCHEMA_CHANGE:    "#a371f7",
  NETWORK_ERROR:    "#39c5cf",
  TIMEOUT:          "#db6d28",
  DATA_VALIDATION:  "#3fb950",
  CONFIGURATION:    "#388bfd",
  THIRD_PARTY_OUTAGE: "#f778ba",
  UNKNOWN:          "#6e7681",
};

const TOOLTIP = {
  contentStyle: { backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: 6, fontSize: 12 },
  labelStyle:   { color: "#8b949e" },
  itemStyle:    { color: "#e6edf3" },
};

export default function AnalyticsPage() {
  const [days, setDays]             = useState(7);
  const [overview, setOverview]     = useState<any>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([analytics.overview(days), analytics.timeseries(days)])
      .then(([ov, ts]) => { setOverview(ov); setTimeseries(ts.timeseries || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  const pieData = overview?.topFailureCategories?.map((f: any) => ({
    name: f.category.replace(/_/g, " "),
    value: f.count,
    color: CATEGORY_COLORS[f.category] || "#6e7681",
  })) || [];

  const sr = overview?.successRate ?? 0;

  return (
    <div className="p-6 max-w-[1200px] space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-fg">Analytics</h1>
          <p className="text-sm text-fg-muted mt-0.5">Execution trends and failure intelligence</p>
        </div>
        <div className="flex items-center gap-0 bg-surface border border-border rounded-md overflow-hidden">
          {[7, 14, 30].map((d, i) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-3 h-7 transition-colors ${
                days === d ? "bg-accent text-white" : "text-fg-muted hover:text-fg hover:bg-surface-hover"
              } ${i > 0 ? "border-l border-border" : ""}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-surface-hover" />)}
          </div>
          <div className="card h-56 animate-pulse bg-surface-hover" />
          <div className="grid grid-cols-2 gap-4">
            <div className="card h-52 animate-pulse bg-surface-hover" />
            <div className="card h-52 animate-pulse bg-surface-hover" />
          </div>
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Total executions", value: overview?.totalExecutions ?? 0 },
              { label: "Succeeded",        value: overview?.succeededExecutions ?? 0, cls: "text-success" },
              { label: "Failed",           value: overview?.failedExecutions ?? 0,    cls: (overview?.failedExecutions ?? 0) > 0 ? "text-danger" : "text-fg" },
              { label: "Success rate",     value: `${sr}%`, cls: sr >= 90 ? "text-success" : sr >= 70 ? "text-warning" : "text-danger" },
              { label: "Avg duration",     value: `${((overview?.avgDurationMs ?? 0) / 1000).toFixed(1)}s` },
            ].map((kpi) => (
              <div key={kpi.label} className="card p-4 text-center">
                <p className={`text-2xl font-bold tabular-nums ${kpi.cls || "text-fg"}`}>{kpi.value}</p>
                <p className="text-xs text-fg-muted mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Execution trend */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-fg">Execution trend</h2>
              <div className="flex items-center gap-4 text-xs text-fg-muted">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-success rounded" />Success</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-danger rounded" />Failed</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeseries} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  {(["success", "failed"] as const).map((k) => (
                    <linearGradient key={k} id={`ag-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={k === "success" ? "#3fb950" : "#f85149"} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={k === "success" ? "#3fb950" : "#f85149"} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#6e7681", fontSize: 10 }} tickFormatter={(d) => format(parseISO(d), "MMM d")} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6e7681", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP} labelFormatter={(d) => format(parseISO(d as string), "MMM d, yyyy")} />
                <Area type="monotone" dataKey="success" name="Success" stroke="#3fb950" fill="url(#ag-success)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="failed"  name="Failed"  stroke="#f85149" fill="url(#ag-failed)"  strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bar + Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-fg mb-4">Daily failures</h2>
              <ResponsiveContainer width="100%" height={196}>
                <BarChart data={timeseries} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#6e7681", fontSize: 10 }} tickFormatter={(d) => format(parseISO(d), "d")} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6e7681", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP} labelFormatter={(d) => format(parseISO(d as string), "MMM d")} />
                  <Bar dataKey="failed" name="Failures" fill="#f85149" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-4">
              <h2 className="text-sm font-semibold text-fg mb-4">Failure categories</h2>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={196}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={76} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP} />
                    <Legend iconType="circle" iconSize={7}
                      formatter={(v) => <span style={{ color: "#8b949e", fontSize: 11 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center">
                  <p className="text-xs text-fg-muted">No failures in this period</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
