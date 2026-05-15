"use client";
import { useEffect, useState } from "react";
import { alerts as alertsApi } from "@/lib/api";
import { AlertTriangle, Bell, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_OPTS   = ["", "OPEN", "ACKNOWLEDGED", "RESOLVED"] as const;
const SEVERITY_OPTS = ["", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export default function AlertsPage() {
  const [alertList, setAlertList]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [status, setStatus]         = useState("OPEN");
  const [severity, setSeverity]     = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params: any = {};
    if (status)   params.status   = status;
    if (severity) params.severity = severity;
    alertsApi.list(params).then(setAlertList).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status, severity]);

  const doAction = async (fn: () => Promise<any>, id: string) => {
    setActioningId(id);
    try { await fn(); load(); } finally { setActioningId(null); }
  };

  return (
    <div className="p-6 max-w-[1000px] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-fg">Alerts</h1>
          <p className="text-sm text-fg-muted mt-0.5">{alertList.length} matching</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status */}
        <div className="flex items-center gap-0 bg-surface border border-border rounded-md overflow-hidden">
          {STATUS_OPTS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-xs px-3 h-7 transition-colors ${
                status === s ? "bg-accent text-white" : "text-fg-muted hover:text-fg hover:bg-surface-hover"
              } ${i > 0 ? "border-l border-border" : ""}`}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        {/* Severity */}
        <div className="flex items-center gap-0 bg-surface border border-border rounded-md overflow-hidden">
          {SEVERITY_OPTS.map((s, i) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`text-xs px-3 h-7 transition-colors ${
                severity === s ? "bg-accent text-white" : "text-fg-muted hover:text-fg hover:bg-surface-hover"
              } ${i > 0 ? "border-l border-border" : ""}`}
            >
              {s || "All severities"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="card divide-y divide-border">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="h-8 w-8 bg-surface-hover rounded-md animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-48 bg-surface-hover rounded animate-pulse" />
                <div className="h-3 w-80 bg-surface-hover rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : alertList.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-10 h-10 bg-surface-hover rounded-xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-5 h-5 text-fg-muted" />
          </div>
          <h3 className="text-sm font-semibold text-fg mb-1">No alerts</h3>
          <p className="text-sm text-fg-muted">Nothing matching your current filters.</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-border">
          {alertList.map((alert) => {
            const sevClass = alert.severity === "CRITICAL" ? "badge-critical" : alert.severity === "HIGH" ? "badge-high" : alert.severity === "MEDIUM" ? "badge-medium" : "badge-low";
            const iconColor = alert.severity === "CRITICAL" ? "text-danger" : alert.severity === "HIGH" ? "text-severe" : alert.severity === "MEDIUM" ? "text-warning" : "text-accent";
            const iconBg    = alert.severity === "CRITICAL" ? "bg-danger/10" : alert.severity === "HIGH" ? "bg-severe/10" : alert.severity === "MEDIUM" ? "bg-warning/10" : "bg-accent/10";

            return (
              <div key={alert.id} className="flex items-start gap-4 px-4 py-4 hover:bg-surface-hover transition-colors">
                {/* Icon */}
                <div className={`p-2 rounded-md flex-shrink-0 ${iconBg}`}>
                  <AlertTriangle className={`w-4 h-4 ${iconColor}`} />
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-medium text-fg">{alert.title}</p>
                    <span className={`badge text-2xs ${sevClass}`}>{alert.severity}</span>
                    <span className={`badge text-2xs ${
                      alert.type === "PREDICTION" ? "badge-accent" :
                      alert.type === "ANOMALY"    ? "bg-done/10 text-done border-done/25" :
                      "badge-neutral"
                    }`}>{alert.type}</span>
                    <span className={`badge text-2xs ${
                      alert.status === "OPEN"         ? "badge-critical" :
                      alert.status === "ACKNOWLEDGED" ? "badge-medium" :
                      "bg-success/10 text-success border-success/25"
                    }`}>{alert.status}</span>
                  </div>

                  <p className="text-sm text-fg-muted leading-relaxed">{alert.message}</p>

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-fg-subtle">
                    {alert.workflow?.name && <span>{alert.workflow.name}</span>}
                    <span>{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {alert.status === "OPEN" && (
                    <button
                      onClick={() => doAction(() => alertsApi.acknowledge(alert.id), alert.id)}
                      disabled={actioningId === alert.id}
                      className="btn-secondary btn-sm"
                    >
                      Acknowledge
                    </button>
                  )}
                  {alert.status !== "RESOLVED" && (
                    <button
                      onClick={() => doAction(() => alertsApi.resolve(alert.id), alert.id)}
                      disabled={actioningId === alert.id}
                      className="btn-sm btn bg-success/10 hover:bg-success/20 border border-success/25 text-success"
                    >
                      <CheckCircle className="w-3 h-3" /> Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
