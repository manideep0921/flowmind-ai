"use client";
import { useEffect, useState } from "react";
import { workflows as workflowsApi } from "@/lib/api";
import Link from "next/link";
import { GitBranch, Plus, ChevronRight } from "lucide-react";

const SOURCE_BADGE: Record<string, string> = {
  ZAPIER:   "bg-orange-500/10 text-orange-400 border-orange-500/20",
  MAKE:     "bg-purple-500/10 text-purple-400 border-purple-500/20",
  N8N:      "bg-red-500/10    text-red-400    border-red-500/20",
  INTERNAL: "bg-blue-500/10  text-blue-400   border-blue-500/20",
  GENERIC:  "bg-surface-hover text-fg-muted  border-border",
};

export default function WorkflowsPage() {
  const [wfs, setWfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workflowsApi.list().then(setWfs).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-[1200px] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-fg">Workflows</h1>
          <p className="text-sm text-fg-muted mt-0.5">{wfs.length} connected workflows</p>
        </div>
        <Link href="/dashboard/workflows/new" className="btn-primary btn-md">
          <Plus className="w-3.5 h-3.5" /> New workflow
        </Link>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card divide-y divide-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-surface-hover animate-pulse" />
              <div className="h-3 w-48 bg-surface-hover rounded animate-pulse" />
              <div className="ml-auto h-3 w-16 bg-surface-hover rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : wfs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-2 bg-surface border-b border-border">
            <span className="w-2" />
            <p className="section-label">Workflow</p>
            <p className="section-label w-20 text-right">Executions</p>
            <p className="section-label w-24 text-right">Success rate</p>
            <p className="section-label w-16 text-right">Failures</p>
            <p className="section-label w-4" />
          </div>

          <div className="divide-y divide-border">
            {wfs.map((wf) => {
              const risk = wf.stats?.riskScore;
              const sr   = wf.stats?.successRate ?? 0;
              const isRisky   = risk > 0.7 || sr < 70;
              const isWarning = !isRisky && (risk > 0.4 || sr < 90);
              return (
                <Link
                  key={wf.id}
                  href={`/dashboard/workflows/${wf.id}`}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3 hover:bg-surface-hover transition-colors group"
                >
                  <span className={`dot ${isRisky ? "dot-failed" : isWarning ? "dot-warning" : "dot-success"}`} />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-fg group-hover:text-accent transition-colors truncate">
                        {wf.name}
                      </p>
                      <span className={`badge text-2xs border ${SOURCE_BADGE[wf.source] || SOURCE_BADGE.GENERIC}`}>
                        {wf.source}
                      </span>
                      {wf.status !== "ACTIVE" && (
                        <span className="badge-neutral text-2xs">{wf.status}</span>
                      )}
                    </div>
                    {wf.description && (
                      <p className="text-xs text-fg-subtle mt-0.5 truncate">{wf.description}</p>
                    )}
                  </div>

                  <p className="text-sm tabular-nums text-fg-muted text-right w-20">
                    {(wf.stats?.totalExecutions ?? 0).toLocaleString()}
                  </p>

                  <div className="w-24 text-right">
                    <p className={`text-sm font-medium tabular-nums ${sr >= 90 ? "text-success" : sr >= 70 ? "text-warning" : "text-danger"}`}>
                      {sr}%
                    </p>
                    <div className="mt-1 h-1 bg-surface-hover rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${sr >= 90 ? "bg-success" : sr >= 70 ? "bg-warning" : "bg-danger"}`}
                        style={{ width: `${sr}%` }}
                      />
                    </div>
                  </div>

                  <div className="w-16 text-right">
                    <p className={`text-sm tabular-nums ${(wf.stats?.failedExecutions ?? 0) > 0 ? "text-danger" : "text-fg-muted"}`}>
                      {wf.stats?.failedExecutions ?? 0}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-fg-subtle group-hover:text-fg-muted transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-12 text-center">
      <div className="w-10 h-10 bg-surface-hover rounded-xl flex items-center justify-center mx-auto mb-4">
        <GitBranch className="w-5 h-5 text-fg-muted" />
      </div>
      <h3 className="text-sm font-semibold text-fg mb-1">No workflows yet</h3>
      <p className="text-sm text-fg-muted mb-5 max-w-xs mx-auto">
        Connect your Zapier, Make, n8n, or custom workflows to start monitoring with AI.
      </p>
      <Link href="/dashboard/workflows/new" className="btn-primary btn-md inline-flex">
        <Plus className="w-3.5 h-3.5" /> Connect first workflow
      </Link>
    </div>
  );
}
