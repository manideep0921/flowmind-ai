"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { workflows as workflowsApi } from "@/lib/api";
import { ArrowLeft, Zap, Globe, GitBranch, Cpu } from "lucide-react";
import Link from "next/link";

const SOURCES = [
  { id: "ZAPIER", label: "Zapier", icon: Zap, color: "text-orange-400", description: "Connect via Zapier webhook" },
  { id: "MAKE", label: "Make", icon: Globe, color: "text-purple-400", description: "Connect via Make HTTP module" },
  { id: "N8N", label: "n8n", icon: GitBranch, color: "text-red-400", description: "Connect via n8n webhook node" },
  { id: "INTERNAL", label: "Internal API", icon: Cpu, color: "text-blue-400", description: "Custom API integration" },
  { id: "GENERIC", label: "Generic", icon: Globe, color: "text-slate-400", description: "Universal webhook" },
];

export default function NewWorkflowPage() {
  const router = useRouter();
  const [source, setSource] = useState("GENERIC");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) { setError("Workflow name is required"); return; }
    setLoading(true);
    try {
      const wf = await workflowsApi.create({ name, description, source });
      router.push(`/dashboard/workflows/${wf.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create workflow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <Link href="/dashboard/workflows" className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <h1 className="text-2xl font-bold text-white mb-1">Add Workflow</h1>
      <p className="text-slate-400 text-sm mb-8">Connect a workflow to start monitoring it with AI</p>

      <div className="space-y-6">
        {/* Source selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Platform</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SOURCES.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setSource(s.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    source === s.id
                      ? "border-brand-500 bg-brand-600/10"
                      : "border-slate-700 hover:border-slate-600 bg-surface-800"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${s.color} mb-2`} />
                  <div className="text-sm font-medium text-white">{s.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Workflow Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lead Capture → CRM Sync"
            className="w-full bg-surface-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Description <span className="text-slate-500">(optional)</span></label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this workflow do?"
            rows={3}
            className="w-full bg-surface-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none"
          />
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Creating..." : "Create Workflow"}
        </button>

        {/* Ingest instructions */}
        {source && (
          <div className="bg-surface-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-2">After creating, send events to:</h3>
            <code className="text-xs text-brand-400 bg-surface-900 px-3 py-1.5 rounded-lg block font-mono">
              POST /api/v1/ingest/{source.toLowerCase()}
            </code>
            <p className="text-xs text-slate-400 mt-2">
              Include your API key in the <code className="text-brand-300">x-api-key</code> header. Go to Settings → API Keys to get your key.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
