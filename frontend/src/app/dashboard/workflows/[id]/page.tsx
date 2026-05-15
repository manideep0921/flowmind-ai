"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { workflows as workflowsApi, executions as executionsApi, aiApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle, CheckCircle, RefreshCw, Zap, Brain,
  Clock, ChevronDown, ChevronUp, ArrowLeft, TrendingUp,
  XCircle, Timer,
} from "lucide-react";
import Link from "next/link";

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [workflow, setWorkflow]       = useState<any>(null);
  const [execs, setExecs]             = useState<any[]>([]);
  const [prediction, setPrediction]   = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [healingId, setHealingId]     = useState<string | null>(null);
  const [expanded, setExpanded]       = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      workflowsApi.get(id),
      executionsApi.list({ workflowId: id, limit: 20 }),
    ]).then(([wf, ex]) => {
      setWorkflow(wf);
      setExecs(ex.executions || []);
    }).finally(() => setLoading(false));
    aiApi.predict(id).then(setPrediction).catch(() => {});
  }, [id]);

  const handleAnalyze = async (execId: string) => {
    setAnalyzingId(execId);
    try {
      const result = await aiApi.analyze(execId);
      setExecs((prev) => prev.map((e) => e.id === execId ? { ...e, analysis: result.analysis } : e));
      setExpanded(execId);
    } catch (err) { console.error(err); }
    finally { setAnalyzingId(null); }
  };

  const handleHeal = async (execId: string) => {
    setHealingId(execId);
    try {
      const result = await aiApi.autoHeal(execId);
      alert(result.success ? `Auto-heal succeeded:\n${result.log}` : `Auto-heal: ${result.log}`);
    } catch (err) { console.error(err); }
    finally { setHealingId(null); }
  };

  if (loading) return (
    <div className="p-6 space-y-4 max-w-[1100px]">
      <div className="h-4 w-28 bg-surface rounded animate-pulse" />
      <div className="h-6 w-64 bg-surface rounded animate-pulse" />
      <div className="card h-80 animate-pulse bg-surface-hover" />
    </div>
  );

  if (!workflow) return (
    <div className="p-6">
      <p className="text-sm text-danger">Workflow not found.</p>
    </div>
  );

  const sr = workflow.executions?.length
    ? Math.round((workflow.executions.filter((e: any) => e.status === "SUCCESS").length / workflow.executions.length) * 100)
    : null;

  return (
    <div className="p-6 max-w-[1100px] space-y-5">
      {/* Breadcrumb */}
      <Link href="/dashboard/workflows"
        className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Workflows
      </Link>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-fg truncate">{workflow.name}</h1>
          <p className="text-sm text-fg-muted mt-0.5">
            {workflow.source}
            {workflow.description && ` · ${workflow.description}`}
          </p>
        </div>
        <span className={`badge flex-shrink-0 ${workflow.status === "ACTIVE" ? "bg-success/10 text-success border-success/25" : "badge-neutral"}`}>
          {workflow.status}
        </span>
      </div>

      {/* Prediction banner */}
      {prediction && prediction.risk_score > 0.5 && (
        <div className={`flex items-start gap-3 p-4 rounded-md border animate-slide-up ${
          prediction.risk_score > 0.75
            ? "bg-danger/10 border-danger/25"
            : "bg-warning/10 border-warning/25"
        }`}>
          <TrendingUp className={`w-4 h-4 mt-0.5 flex-shrink-0 ${prediction.risk_score > 0.75 ? "text-danger" : "text-warning"}`} />
          <div>
            <p className={`text-sm font-semibold ${prediction.risk_score > 0.75 ? "text-danger" : "text-warning"}`}>
              Predictive alert — {Math.round(prediction.risk_score * 100)}% failure risk detected
            </p>
            <p className="text-sm text-fg-muted mt-0.5">{prediction.explanation}</p>
            {prediction.predicted_failure_window && (
              <p className="text-xs text-fg-subtle mt-1">Predicted window: {prediction.predicted_failure_window}</p>
            )}
          </div>
        </div>
      )}

      {/* Executions table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-fg">Recent executions</h2>
          <span className="text-xs text-fg-subtle">{execs.length} records</span>
        </div>

        {execs.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-fg-muted">No executions recorded yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {execs.map((exec) => (
              <div key={exec.id}>
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-surface-hover transition-colors group"
                  onClick={() => setExpanded(expanded === exec.id ? null : exec.id)}
                >
                  <StatusIcon status={exec.status} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-fg">{exec.status}</span>
                      {exec.analysis && (
                        <span className="badge badge-accent text-2xs">
                          <Brain className="w-2.5 h-2.5" /> AI analyzed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-fg-subtle">
                        {formatDistanceToNow(new Date(exec.startedAt), { addSuffix: true })}
                      </span>
                      {exec.durationMs && (
                        <span className="flex items-center gap-1 text-xs text-fg-subtle">
                          <Timer className="w-3 h-3" />
                          {(exec.durationMs / 1000).toFixed(1)}s
                        </span>
                      )}
                      {exec.errorMessage && (
                        <span className="text-xs text-danger truncate max-w-xs hidden sm:block">
                          {exec.errorMessage}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {exec.status === "FAILED" && !exec.analysis && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAnalyze(exec.id); }}
                        disabled={analyzingId === exec.id}
                        className="btn-secondary btn-sm"
                      >
                        <Brain className="w-3 h-3" />
                        {analyzingId === exec.id ? "Analyzing…" : "Analyze"}
                      </button>
                    )}
                    {exec.analysis && !exec.analysis.autoHealAttempted && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleHeal(exec.id); }}
                        disabled={healingId === exec.id}
                        className="btn-sm btn bg-success/10 hover:bg-success/20 border border-success/25 text-success"
                      >
                        <Zap className="w-3 h-3" />
                        {healingId === exec.id ? "Healing…" : "Auto-heal"}
                      </button>
                    )}
                    {expanded === exec.id
                      ? <ChevronUp className="w-4 h-4 text-fg-subtle" />
                      : <ChevronDown className="w-4 h-4 text-fg-subtle" />
                    }
                  </div>
                </div>

                {expanded === exec.id && (
                  <div className="px-4 pb-4 animate-fade-in">
                    {exec.analysis ? (
                      <AnalysisPanel analysis={exec.analysis} />
                    ) : exec.errorMessage ? (
                      <pre className="code-block text-danger/90 max-h-40 mt-2 whitespace-pre-wrap">
                        {exec.errorMessage}
                      </pre>
                    ) : (
                      <p className="text-xs text-fg-subtle mt-2 px-1">No details available.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const cls = "w-4 h-4 flex-shrink-0";
  switch (status) {
    case "SUCCESS": return <CheckCircle className={`${cls} text-success`} />;
    case "FAILED":  return <XCircle className={`${cls} text-danger`} />;
    case "RUNNING": return <RefreshCw className={`${cls} text-accent animate-spin`} />;
    case "TIMEOUT": return <Clock className={`${cls} text-warning`} />;
    default:        return <Clock className={`${cls} text-fg-subtle`} />;
  }
}

function AnalysisPanel({ analysis }: { analysis: any }) {
  const sev = analysis.severity;
  const sevClass = sev === "CRITICAL" ? "badge-critical" : sev === "HIGH" ? "badge-high" : sev === "MEDIUM" ? "badge-medium" : "badge-low";

  return (
    <div className="mt-2 card-inset overflow-hidden animate-slide-up">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-semibold text-fg">AI Root Cause Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge text-2xs ${sevClass}`}>{sev}</span>
          <span className="badge-neutral text-2xs">{analysis.category?.replace(/_/g, " ")}</span>
          <span className="text-2xs text-fg-subtle">{Math.round(analysis.confidenceScore * 100)}% confidence</span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className="section-label mb-2">What happened</p>
          <p className="text-sm text-fg-muted leading-relaxed">{analysis.explanation}</p>
        </div>
        <div>
          <p className="section-label mb-2">Technical details</p>
          <pre className="code-block text-2xs max-h-28 whitespace-pre-wrap">{analysis.technicalDetails}</pre>
        </div>

        {analysis.businessImpact && (
          <div className="lg:col-span-2">
            <p className="section-label mb-2">Business impact</p>
            <div className="bg-danger/5 border border-danger/20 rounded-md p-3">
              <p className="text-sm text-fg-muted">{analysis.businessImpact.description}</p>
              {analysis.businessImpact.estimatedRevenueLoss && (
                <p className="text-xs text-danger mt-1 font-medium">
                  Estimated revenue impact: ${analysis.businessImpact.estimatedRevenueLoss.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {analysis.suggestedFixes?.length > 0 && (
          <div className="lg:col-span-2">
            <p className="section-label mb-2">Suggested fixes</p>
            <div className="space-y-2">
              {analysis.suggestedFixes.map((fix: any, i: number) => (
                <div key={i} className="flex items-start gap-3 bg-surface rounded-md border border-border px-3 py-2.5">
                  <span className="text-xs font-bold text-accent mt-0.5 w-5 flex-shrink-0">#{fix.priority}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">{fix.title}</p>
                    <p className="text-xs text-fg-muted mt-0.5">{fix.description}</p>
                  </div>
                  {fix.automated && (
                    <span className="badge badge-accent text-2xs flex-shrink-0">Auto</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
