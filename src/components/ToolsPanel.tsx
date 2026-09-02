"use client";

import type { ToolRegistration } from "@/lib/webmcp-tools";

interface ToolsPanelProps {
  tools: ToolRegistration[];
  isSupported: boolean;
  isRegistered: boolean;
  onRegister: () => void;
  onUnregister: () => void;
}

export default function ToolsPanel({
  tools,
  isSupported,
  isRegistered,
  onRegister,
  onUnregister,
}: ToolsPanelProps) {
  const registeredCount = tools.filter((t) => t.status === "registered").length;
  const errorCount = tools.filter((t) => t.status === "error").length;

  return (
    <div className="w-full rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isRegistered
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                  : isSupported
                    ? "bg-amber-400"
                    : "bg-zinc-600"
              }`}
            />
            <h3 className="text-sm font-semibold text-zinc-200">WebMCP Tools</h3>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {registeredCount}/{tools.length} active
          </span>
        </div>
        <div className="flex gap-2">
          {!isRegistered ? (
            <button
              onClick={onRegister}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors"
            >
              Register Tools
            </button>
          ) : (
            <button
              onClick={onUnregister}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
            >
              Unregister
            </button>
          )}
        </div>
      </div>

      {/* Support status */}
      {!isSupported && (
        <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-300">
          WebMCP is not available in this browser. Enable it at{" "}
          <code className="font-mono bg-amber-500/10 px-1 rounded">chrome://flags/#enable-webmcp-testing</code>{" "}
          or use Chrome 149+ origin trial. Tools are shown but won&apos;t be callable by agents.
        </div>
      )}

      {/* Tool list */}
      <div className="divide-y divide-zinc-800/50">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/30 transition-colors"
          >
            <div
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                tool.status === "registered"
                  ? "bg-emerald-400"
                  : tool.status === "error"
                    ? "bg-red-400"
                    : "bg-zinc-600"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-zinc-300">{tool.name}</code>
                <span className="text-[10px] text-zinc-600">·</span>
                <span className="text-[10px] text-zinc-500 truncate">{tool.description}</span>
              </div>
              {tool.error && (
                <div className="text-[10px] text-red-400/70 mt-0.5">{tool.error}</div>
              )}
            </div>
            {tool.status === "registered" && (
              <div className="text-[10px] font-mono text-zinc-600">ready</div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/50">
        <div className="text-[10px] text-zinc-600 leading-relaxed">
          Tools are registered via{" "}
          <code className="font-mono text-zinc-500">document.modelContext.registerTool()</code>.
          Any browser AI agent (ChatGPT, Gemini, Claude) can discover and call these tools
          while this page is open.
        </div>
      </div>
    </div>
  );
}
