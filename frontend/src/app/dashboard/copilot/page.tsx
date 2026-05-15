"use client";
import { useState, useRef, useEffect } from "react";
import { aiApi } from "@/lib/api";
import { Send, Brain, User, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const STARTERS = [
  "Why did my workflow fail this morning?",
  "What's the most common failure in my automations?",
  "How do I prevent OAuth token expiration issues?",
  "Explain rate limit errors vs. timeout errors",
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const result  = await aiApi.chat(text, null, history);
      setMessages((prev) => [...prev, { role: "assistant", content: result.response, sources: result.sources }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I ran into an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface flex-shrink-0">
        <div className="w-7 h-7 bg-accent/15 border border-accent/30 rounded-md flex items-center justify-center">
          <Brain className="w-4 h-4 text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold text-fg">AI Copilot</p>
          <p className="text-xs text-fg-subtle">GPT-4o + RAG over your workflow history</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="ml-auto btn-ghost btn-sm text-fg-subtle"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center min-h-[300px]">
            <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-fg mb-1">How can I help?</h2>
            <p className="text-xs text-fg-muted max-w-xs mb-6">
              Ask about workflow failures, debugging strategies, or error patterns across your automations.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left px-3 py-2.5 card hover:border-accent/40 hover:bg-surface-hover text-xs text-fg-muted hover:text-fg transition-all rounded-md"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 bg-accent/15 border border-accent/25 rounded-md flex items-center justify-center flex-shrink-0 mt-1">
                <Brain className="w-3.5 h-3.5 text-accent" />
              </div>
            )}
            <div className={`max-w-[72%] ${msg.role === "user" ? "order-1" : ""}`}>
              <div className={`px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap rounded-xl ${
                msg.role === "user"
                  ? "bg-accent text-white rounded-tr-sm"
                  : "bg-surface border border-border text-fg-muted rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <p className="text-2xs text-fg-subtle mt-1 px-1">
                  Context from {msg.sources.length} similar past failure{msg.sources.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 bg-accent/20 border border-accent/30 rounded-md flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-3.5 h-3.5 text-accent-light" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-6 h-6 bg-accent/15 border border-accent/25 rounded-md flex items-center justify-center flex-shrink-0 mt-1">
              <Brain className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="bg-surface border border-border rounded-xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-fg-subtle animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-border bg-surface">
        <div className="flex items-end gap-2.5 bg-canvas border border-border focus-within:border-accent rounded-lg px-3 py-2 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about a failure, error code, or workflow issue…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-fg placeholder-fg-subtle resize-none focus:outline-none leading-relaxed"
            style={{ minHeight: "22px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-7 h-7 bg-accent hover:bg-accent-hover disabled:opacity-30 rounded-md flex items-center justify-center transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <p className="text-2xs text-fg-subtle mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
