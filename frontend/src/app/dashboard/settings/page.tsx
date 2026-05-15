"use client";
import { useEffect, useState } from "react";
import { apiKeys as apiKeysApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Plus, Trash2, Copy, Check, Key, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const { user, organization } = useAuthStore();
  const [keys, setKeys]           = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState("");
  const [creating, setCreating]   = useState(false);
  const [copied, setCopied]       = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    apiKeysApi.list().then(setKeys).catch(console.error);
  }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const key = await apiKeysApi.create(newKeyName.trim());
      setCreatedKey(key.key);
      setNewKeyName("");
      setKeys((prev) => [key, ...prev]);
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this API key? Any integrations using it will stop working.")) return;
    setDeletingId(id);
    try {
      await apiKeysApi.delete(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } finally { setDeletingId(null); }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const apiBase = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:4000")
    : "http://localhost:4000";

  return (
    <div className="p-6 max-w-[680px] space-y-6">
      <div>
        <h1 className="text-base font-semibold text-fg">Settings</h1>
        <p className="text-sm text-fg-muted mt-0.5">Manage your account and API integrations</p>
      </div>

      {/* Account */}
      <Section title="Account" description="Your profile and organization details">
        <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-border border border-border rounded-md overflow-hidden">
          {[
            { label: "Name",         value: user?.name },
            { label: "Email",        value: user?.email },
            { label: "Role",         value: user?.role },
            { label: "Plan",         value: organization?.plan },
            { label: "Organization", value: organization?.name },
            { label: "Org slug",     value: organization?.slug },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-3 bg-canvas">
              <p className="text-2xs text-fg-subtle uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-sm text-fg font-medium">{value || "—"}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* API Keys */}
      <Section title="API keys" description="Authenticate ingest webhooks from Zapier, Make, n8n, or your own systems.">
        {/* Create */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Key name — e.g. Production Zapier"
            className="input flex-1"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newKeyName.trim()}
            className="btn-primary btn-md flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {creating ? "Creating…" : "Create"}
          </button>
        </div>

        {/* Reveal newly created key */}
        {createdKey && (
          <div className="bg-success/5 border border-success/25 rounded-md p-3 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
              <p className="text-xs font-semibold text-success">Key created — copy it now, it won't be shown again</p>
            </div>
            <div className="flex items-center gap-2 bg-canvas border border-border rounded-md px-3 py-2">
              <code className="text-xs text-success font-mono flex-1 truncate">{createdKey}</code>
              <button onClick={() => copy(createdKey)} className="text-fg-muted hover:text-fg transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {keys.length === 0 ? (
          <div className="card-inset px-4 py-6 text-center">
            <Key className="w-6 h-6 text-fg-subtle mx-auto mb-2" />
            <p className="text-sm text-fg-muted">No API keys yet</p>
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-border">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors">
                <Key className="w-4 h-4 text-fg-subtle flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg">{key.name}</p>
                  <p className="text-xs text-fg-subtle">
                    {key.lastUsedAt
                      ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : "Never used"
                    }{" · "}
                    Created {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(key.id)}
                  disabled={deletingId === key.id}
                  className="btn-ghost p-1.5 text-fg-subtle hover:text-danger"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Ingest endpoints */}
      <Section title="Ingest endpoints" description={<>Send execution data with your API key in the <code className="text-accent-light bg-accent/10 px-1 py-0.5 rounded text-2xs font-mono">x-api-key</code> header.</>}>
        <div className="card overflow-hidden divide-y divide-border">
          {["zapier", "make", "n8n", "internal", "generic"].map((src) => {
            const url = `${apiBase}/api/v1/ingest/${src}`;
            return (
              <div key={src} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors">
                <span className="text-xs font-medium text-fg-muted w-16 capitalize">{src}</span>
                <code className="text-xs text-accent-light font-mono flex-1 truncate">{url}</code>
                <button onClick={() => copy(url)} className="btn-ghost p-1.5 text-fg-subtle">
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, description, children }: {
  title: string; description: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        <p className="text-xs text-fg-muted mt-0.5">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
