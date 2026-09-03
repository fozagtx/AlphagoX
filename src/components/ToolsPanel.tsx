"use client";

import { useState } from "react";
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
  const [open, setOpen] = useState(false);
  const registeredCount = tools.filter((tool) => tool.status === "registered").length;

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isRegistered ? "bg-emerald-400" : isSupported ? "bg-amber-400" : "bg-white/20"
          }`}
        />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex flex-1 items-baseline gap-2 text-left"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
            WebMCP tools
          </span>
          <span className="font-mono text-[10px] text-white/30">
            {registeredCount}/{tools.length} active
          </span>
        </button>
        <button
          type="button"
          onClick={isRegistered ? onUnregister : onRegister}
          className="rounded-lg border border-white/5 px-2.5 py-1 text-[11px] text-white/55 transition hover:border-white/10 hover:text-white/85"
        >
          {isRegistered ? "unregister" : "register"}
        </button>
      </div>

      {!isSupported && (
        <p className="border-t border-white/5 px-4 py-2.5 text-[10px] leading-relaxed text-amber-200/70">
          WebMCP is unavailable in this browser — enable{" "}
          <code className="font-mono">chrome://flags/#enable-webmcp-testing</code>. The sidebar agent
          works regardless.
        </p>
      )}

      {open && (
        <ul className="border-t border-white/5">
          {tools.map((tool) => (
            <li key={tool.name} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-white/[0.03]">
              <span
                className={`h-1 w-1 shrink-0 rounded-full ${
                  tool.status === "registered"
                    ? "bg-emerald-400"
                    : tool.status === "error"
                      ? "bg-rose-400"
                      : "bg-white/20"
                }`}
              />
              <code className="font-mono text-[11px] text-white/65">{tool.name}</code>
              <span className="truncate text-[10px] text-white/30">{tool.error ?? tool.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
