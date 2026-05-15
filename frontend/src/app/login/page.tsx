"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Zap, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const login  = useAuthStore((s) => s.login);
  const [mode, setMode]       = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState({ name: "", email: "", password: "", orgName: "" });

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = mode === "login"
        ? await auth.login(form.email, form.password)
        : await auth.register(form);
      login(data.token, data.user, data.organization);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-canvas-default)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "var(--color-accent-subtle)",
          border: "1px solid rgba(56,139,253,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
        }}>
          <Zap size={22} style={{ color: "var(--color-accent-fg)" }} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 300, color: "var(--color-fg-default)", marginBottom: 4 }}>
          Sign in to <strong style={{ fontWeight: 600 }}>FlowMind AI</strong>
        </h1>
      </div>

      {/* Mode tabs */}
      <div style={{
        display: "flex",
        background: "var(--color-surface-1)",
        border: "1px solid var(--color-border-default)",
        borderRadius: 6,
        overflow: "hidden",
        marginBottom: 12,
      }}>
        {(["login", "register"] as const).map((m, i) => (
          <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
            padding: "6px 20px",
            fontSize: 13,
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
            background: mode === m ? "var(--color-accent-emphasis)" : "transparent",
            color: mode === m ? "#fff" : "var(--color-fg-muted)",
            borderLeft: i > 0 ? "1px solid var(--color-border-default)" : "none",
            transition: "background 80ms",
          }}>
            {m === "login" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      {/* Form card */}
      <div className="card" style={{ width: "100%", maxWidth: 340, padding: 20 }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "register" && (
            <>
              <Field label="Full name"     value={form.name}    onChange={set("name")}    placeholder="Jane Smith" />
              <Field label="Organization"  value={form.orgName} onChange={set("orgName")} placeholder="Acme Corp" />
            </>
          )}
          <Field label="Email address" type="email"    value={form.email}    onChange={set("email")}    placeholder="you@company.com" />
          <Field label="Password"      type="password" value={form.password} onChange={set("password")} placeholder="••••••••" />

          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              background: "var(--color-danger-subtle)",
              border: "1px solid rgba(248,81,73,0.25)",
              color: "var(--color-danger-fg)",
              borderRadius: 6, padding: "10px 12px", fontSize: 12,
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary btn-lg" style={{ width: "100%", marginTop: 4 }}>
            {loading
              ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
                  Loading…
                </span>
              : mode === "login" ? "Sign in" : "Create account"
            }
          </button>
        </form>

        {mode === "login" && (
          <div style={{ borderTop: "1px solid var(--color-border-muted)", marginTop: 14, paddingTop: 14, textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "var(--color-fg-subtle)" }}>
              Demo:{" "}
              <code style={{ fontFamily: "monospace", color: "var(--color-fg-muted)", background: "var(--color-canvas-inset)", padding: "1px 4px", borderRadius: 3 }}>demo@flowmind.ai</code>
              {" / "}
              <code style={{ fontFamily: "monospace", color: "var(--color-fg-muted)", background: "var(--color-canvas-inset)", padding: "1px 4px", borderRadius: 3 }}>demo1234</code>
            </p>
          </div>
        )}
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: "var(--color-fg-subtle)" }}>
        {mode === "login" ? "New to FlowMind? " : "Already have an account? "}
        <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent-fg)", fontSize: 12, padding: 0 }}>
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-fg-muted)", marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="input"
      />
    </div>
  );
}
