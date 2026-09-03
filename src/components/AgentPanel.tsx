"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEveAgent } from "eve/react";
import type { EveMessage, EveMessagePart } from "eve/react";
import { parseAgentAction, type AgentAction, type GameContext } from "@/lib/agent-actions";
import type { AgentToolInfo } from "@/lib/game-tools";

interface AgentCatalog {
  model: string;
  provider: string;
  configured: boolean;
  tools: AgentToolInfo[];
}

interface AgentPanelProps {
  gameContext: GameContext;
  onAgentAction: (action: AgentAction) => void;
}

const QUICK_PROMPTS = [
  "What is my best move?",
  "Play my best move",
  "Why is the engine winning?",
  "Reset and set difficulty to hard",
];

export default function AgentPanel({ gameContext, onAgentAction }: AgentPanelProps) {
  const [catalog, setCatalog] = useState<AgentCatalog | null>(null);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [draft, setDraft] = useState("");

  const contextRef = useRef(gameContext);

  useEffect(() => {
    contextRef.current = gameContext;
  }, [gameContext]);

  const appliedCalls = useRef(new Set<string>());
  const transcriptRef = useRef<HTMLDivElement>(null);

  const agent = useEveAgent({
    prepareSend: (input) => ({ ...input, clientContext: contextRef.current }),
  });

  const { data, status, error, send, cancel } = agent;
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/agent/tools")
      .then((response) => response.json() as Promise<AgentCatalog>)
      .then((payload) => {
        if (!cancelled) setCatalog(payload);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // The agent runs on the server, so board changes arrive as tool results and
  // are applied here exactly once per tool call.
  useEffect(() => {
    for (const message of data.messages) {
      for (const part of message.parts) {
        if (part.type !== "dynamic-tool" || part.state !== "output-available" || part.partial) continue;
        if (appliedCalls.current.has(part.toolCallId)) continue;
        const action = parseAgentAction(part.output);
        if (!action) continue;
        appliedCalls.current.add(part.toolCallId);
        onAgentAction(action);
      }
    }
  }, [data.messages, onAgentAction]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
  }, [data.messages]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || status === "resuming") return;
    setDraft("");
    void send(trimmed, isBusy ? { turnPolicy: "steer" } : undefined);
  };

  const toolCount = catalog?.tools.length ?? 0;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">Agent</h2>
          <StatusDot status={status} />
        </div>
        <span className="truncate font-mono text-[10px] text-white/30">{catalog?.model ?? "…"}</span>
      </header>

      {catalog && !catalog.configured && (
        <p className="mx-4 mb-3 rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-[11px] leading-relaxed text-amber-200/80">
          Set <code className="font-mono">OPENROUTER_API_KEY</code> in <code className="font-mono">.env.local</code>{" "}
          to let the agent answer.
        </p>
      )}

      <div className="px-4">
        <button
          type="button"
          onClick={() => setToolsOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-white/60 transition hover:border-white/10 hover:text-white/80"
        >
          <span>Tools discovered</span>
          <span className="font-mono text-white/40">
            {toolCount} {toolsOpen ? "−" : "+"}
          </span>
        </button>

        {toolsOpen && (
          <ul className="mt-1.5 space-y-1">
            {catalog?.tools.map((tool) => (
              <li key={tool.name} className="flex items-start gap-2 rounded-lg px-3 py-1.5 hover:bg-white/[0.03]">
                <span
                  className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
                    tool.kind === "act" ? "bg-violet-400" : "bg-emerald-400/70"
                  }`}
                />
                <span className="min-w-0">
                  <span className="block font-mono text-[11px] text-white/70">{tool.name}</span>
                  <span className="block text-[10px] leading-snug text-white/35">{tool.description}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div ref={transcriptRef} className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3">
        {data.messages.length === 0 ? (
          <p className="pt-6 text-center text-[11px] leading-relaxed text-white/25">
            Ask the agent about the position. It reads the live board and can play for you.
          </p>
        ) : (
          data.messages.map((message) => <MessageBlock key={message.id} message={message} />)
        )}
        {error && (
          <p className="rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-[11px] text-rose-200/80">
            {error.message}
          </p>
        )}
      </div>

      <div className="border-t border-white/5 p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => submit(prompt)}
              disabled={status === "resuming"}
              className="rounded-full border border-white/5 px-2.5 py-1 text-[10px] text-white/45 transition hover:border-violet-400/30 hover:text-white/80 disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(draft);
          }}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 focus-within:border-violet-400/40"
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask the agent…"
            disabled={status === "resuming"}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-white/85 placeholder:text-white/25 focus:outline-none"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={() => void cancel()}
              className="rounded-md px-2 py-1 text-[11px] text-white/50 transition hover:text-white/80"
            >
              stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              className="rounded-md bg-violet-500/90 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-violet-500 disabled:bg-white/5 disabled:text-white/30"
            >
              send
            </button>
          )}
        </form>
      </div>
    </section>
  );
}

function StatusDot({ status }: { status: string }) {
  const busy = status === "submitted" || status === "streaming";
  return (
    <span
      title={status}
      className={`h-1.5 w-1.5 rounded-full ${
        status === "error"
          ? "bg-rose-400"
          : busy
            ? "animate-pulse bg-violet-400"
            : "bg-emerald-400/70"
      }`}
    />
  );
}

function MessageBlock({ message }: { message: EveMessage }) {
  if (message.role === "user") {
    const text = message.parts
      .filter((part): part is Extract<EveMessagePart, { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join(" ");
    return (
      <p className="ml-6 rounded-xl rounded-br-sm bg-white/[0.06] px-3 py-2 text-[12px] leading-relaxed text-white/80">
        {text}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {message.parts.map((part, index) => (
        <PartBlock key={index} part={part} />
      ))}
    </div>
  );
}

function PartBlock({ part }: { part: EveMessagePart }) {
  if (part.type === "reasoning") {
    return <ThinkingBlock text={part.text} streaming={part.state === "streaming"} />;
  }

  if (part.type === "text") {
    return <p className="text-[12px] leading-relaxed text-white/80">{part.text}</p>;
  }

  if (part.type === "dynamic-tool") {
    return <ToolCallBlock part={part} />;
  }

  return null;
}

function ThinkingBlock({ text, streaming }: { text: string; streaming: boolean }) {
  const [open, setOpen] = useState(false);
  if (!text.trim()) return null;

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white/35 transition hover:text-white/60"
      >
        <span className={`h-1 w-1 rounded-full bg-violet-400 ${streaming ? "animate-pulse" : ""}`} />
        thinking
        <span className="ml-auto font-mono normal-case tracking-normal">{open ? "hide" : "show"}</span>
      </button>
      <p
        className={`whitespace-pre-wrap px-3 pb-2 font-mono text-[10px] leading-relaxed text-white/40 ${
          open ? "" : "line-clamp-2"
        }`}
      >
        {text}
      </p>
    </div>
  );
}

function ToolCallBlock({ part }: { part: Extract<EveMessagePart, { type: "dynamic-tool" }> }) {
  const summary = useMemo(() => summarizeValue(part.state === "output-available" ? part.output : part.input), [part]);
  const failed = part.state === "output-error";
  const settled = part.state === "output-available" || failed;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-1.5 ${
        failed ? "border-rose-400/20 bg-rose-400/5" : "border-white/5 bg-white/[0.02]"
      }`}
    >
      <span
        className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
          failed ? "bg-rose-400" : settled ? "bg-emerald-400/70" : "animate-pulse bg-violet-400"
        }`}
      />
      <span className="min-w-0">
        <span className="block font-mono text-[11px] text-white/70">{part.toolName}</span>
        <span className="block truncate font-mono text-[10px] text-white/35">
          {failed ? part.errorText : summary}
        </span>
      </span>
    </div>
  );
}

function summarizeValue(value: unknown): string {
  if (value === undefined || value === null) return "…";
  const json = JSON.stringify(value);
  return json.length > 120 ? `${json.slice(0, 120)}…` : json;
}
