"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Play, Mic, MicOff, PhoneOff, Globe } from "lucide-react";
import { streamSSE } from "@/lib/sse";

interface CallEvent {
  idx?: number;
  type: string;
  payload?: unknown;
}

interface Lane {
  number: string;
  status: "idle" | "starting" | "live" | "ended" | "error";
  callId?: string;
  events: { kind: string; text: string; ts: number }[];
}

interface BrowserEvent {
  role: string;
  text: string;
  ts: number;
}

const DEFAULT_TASK = `You are calling an Airbnb host. You're a potential guest interested in a 3-night stay (June 16-18) in San Francisco. Your job: negotiate the lowest possible price. Be warm, friendly, persistent. Mention direct booking saves the ~15% Airbnb fee. End the call once you have a final number.`;

function makeLane(number: string): Lane {
  return { number, status: "idle", events: [] };
}

export default function TestCallPage() {
  const [mode, setMode] = useState<"pstn" | "browser">("browser");
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <a
          href="/"
          className="text-sm font-semibold tracking-tight text-zinc-300 hover:text-zinc-100"
        >
          ychack<span className="text-emerald-400">.booker</span>
        </a>
        <span className="text-xs text-zinc-500">side: AgentPhone test</span>
      </header>

      <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
        AgentPhone smoke test
      </h1>

      <div className="inline-flex w-fit rounded-full border border-zinc-800 bg-zinc-900/60 p-1 text-xs">
        <button
          onClick={() => setMode("browser")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
            mode === "browser"
              ? "bg-emerald-500 text-black font-bold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Globe className="size-3.5" /> browser (WebRTC)
        </button>
        <button
          onClick={() => setMode("pstn")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
            mode === "pstn"
              ? "bg-emerald-500 text-black font-bold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Phone className="size-3.5" /> phone (US/CA only)
        </button>
      </div>

      {mode === "browser" ? <BrowserMode /> : <PstnMode />}
    </div>
  );
}

function BrowserMode() {
  const [status, setStatus] = useState<
    "idle" | "fetching" | "connecting" | "live" | "ended" | "error"
  >("idle");
  const [muted, setMuted] = useState(false);
  const [events, setEvents] = useState<BrowserEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<unknown>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    return () => {
      const c = clientRef.current as { stopCall?: () => void } | null;
      try {
        c?.stopCall?.();
      } catch {}
    };
  }, []);

  const start = async () => {
    setError(null);
    setEvents([]);
    setStatus("fetching");
    endedRef.current = false;
    try {
      const res = await fetch("/api/web-call", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "failed to get token");
        setStatus("error");
        return;
      }
      const accessToken: string | undefined =
        data.accessToken ?? data.access_token ?? data.token;
      if (!accessToken) {
        setError("no accessToken in response: " + JSON.stringify(data));
        setStatus("error");
        return;
      }

      setStatus("connecting");
      const mod = await import("agentphone-web-sdk");
      const client = new mod.AgentPhoneWebClient();
      clientRef.current = client;

      client.on("call_started", () => setStatus("live"));
      client.on("call_ready", () => setStatus("live"));
      client.on("call_ended", () => {
        if (endedRef.current) return;
        endedRef.current = true;
        setStatus("ended");
      });
      client.on("error", (e: unknown) => {
        setError(String(e));
        setStatus("error");
        try {
          client.stopCall();
        } catch {}
      });
      client.on("update", (u: unknown) => {
        // Retell-style transcript update: { transcript: [{role, content}], ... }
        const obj = u as {
          transcript?: { role: string; content: string }[];
          role?: string;
          content?: string;
          text?: string;
        };
        if (Array.isArray(obj.transcript)) {
          setEvents(
            obj.transcript.map((t) => ({
              role: t.role,
              text: t.content,
              ts: Date.now(),
            })),
          );
        } else if (obj.role && (obj.content || obj.text)) {
          setEvents((prev) => [
            ...prev,
            {
              role: obj.role!,
              text: (obj.content ?? obj.text) as string,
              ts: Date.now(),
            },
          ]);
        }
      });
      client.on("agent_start_talking", () => {
        // optional: visual indicator
      });

      await client.startCall({ accessToken });
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  };

  const stop = () => {
    const c = clientRef.current as { stopCall?: () => void } | null;
    try {
      c?.stopCall?.();
    } catch {}
    setStatus("ended");
  };

  const toggleMute = () => {
    const c = clientRef.current as
      | { mute?: () => void; unmute?: () => void }
      | null;
    if (!c) return;
    if (muted) {
      c.unmute?.();
      setMuted(false);
    } else {
      c.mute?.();
      setMuted(true);
    }
  };

  const live = status === "live" || status === "connecting";

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-zinc-400">
        Browser-to-agent WebRTC. No phone number needed — uses your mic + speaker.
        Works anywhere. The agent uses whatever system prompt is configured for{" "}
        <code className="rounded bg-zinc-800/60 px-1 text-zinc-300">
          AGENTPHONE_AGENT_ID
        </code>{" "}
        in the dashboard.
      </p>

      <div className="flex items-center gap-3">
        {!live && status !== "ended" && (
          <button
            onClick={start}
            disabled={status === "fetching"}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
          >
            <Play className="size-4" />
            {status === "fetching" ? "fetching token…" : "start call"}
          </button>
        )}
        {live && (
          <>
            <button
              onClick={stop}
              className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-black hover:bg-red-400"
            >
              <PhoneOff className="size-4" /> end
            </button>
            <button
              onClick={toggleMute}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500"
            >
              {muted ? (
                <>
                  <MicOff className="size-4" /> unmute
                </>
              ) : (
                <>
                  <Mic className="size-4" /> mute
                </>
              )}
            </button>
          </>
        )}
        {status === "ended" && (
          <button
            onClick={start}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500"
          >
            call again
          </button>
        )}
        <StatusPill status={status} />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
          live transcript
        </div>
        <div className="max-h-[420px] space-y-1.5 overflow-y-auto text-xs">
          <AnimatePresence initial={false}>
            {events.map((e, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={
                  e.role === "agent" || e.role === "assistant"
                    ? "text-emerald-300"
                    : e.role === "user" || e.role === "caller"
                      ? "text-zinc-100"
                      : "text-zinc-500"
                }
              >
                <span className="opacity-60">{e.role}:</span> {e.text}
              </motion.div>
            ))}
          </AnimatePresence>
          {events.length === 0 && (
            <div className="text-zinc-600">
              {status === "idle"
                ? "click start, then speak — you'll see the transcript here"
                : "waiting for first turn…"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "live"
      ? "border-emerald-400/60 text-emerald-300"
      : status === "ended"
        ? "border-zinc-700 text-zinc-400"
        : status === "error"
          ? "border-red-500/60 text-red-300"
          : "border-zinc-700 text-zinc-500";
  return (
    <span
      className={`rounded-full border bg-zinc-900/50 px-2 py-0.5 text-[10px] uppercase tracking-widest ${cls}`}
    >
      {status}
    </span>
  );
}

function PstnMode() {
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [task, setTask] = useState(DEFAULT_TASK);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [running, setRunning] = useState(false);

  const start = async () => {
    const numbers = [n1, n2].filter((x) => x.trim().length > 0);
    if (numbers.length === 0) return;
    setLanes(numbers.map(makeLane));
    setRunning(true);
    try {
      for await (const evt of streamSSE<CallEvent>("/api/test-call", {
        numbers,
        task,
      })) {
        if (evt.type === "all-done") {
          setRunning(false);
          continue;
        }
        const i = evt.idx ?? 0;
        setLanes((prev) => {
          const next = [...prev];
          if (!next[i]) next[i] = makeLane(numbers[i] ?? "");
          const lane = { ...next[i], events: [...next[i].events] };
          if (evt.type === "started") {
            lane.status = "live";
            const p = evt.payload as Record<string, unknown> | undefined;
            lane.callId = (p?.id ?? p?.callId ?? p?.call_id) as
              | string
              | undefined;
            lane.events.push({
              kind: "started",
              text: `call_id ${lane.callId ?? "?"}`,
              ts: Date.now(),
            });
          } else if (evt.type === "error") {
            lane.status = "error";
            lane.events.push({
              kind: "error",
              text: String(evt.payload),
              ts: Date.now(),
            });
          } else if (evt.type === "ended") {
            lane.status = "ended";
            lane.events.push({
              kind: "ended",
              text:
                typeof evt.payload === "string"
                  ? evt.payload
                  : JSON.stringify(evt.payload),
              ts: Date.now(),
            });
          } else {
            const p = evt.payload as Record<string, unknown> | string;
            const text =
              typeof p === "string"
                ? p
                : ((p?.text ?? p?.transcript ?? JSON.stringify(p)) as string);
            const role =
              typeof p === "object" && p
                ? ((p.role ?? p.speaker ?? evt.type) as string)
                : evt.type;
            lane.events.push({ kind: role, text, ts: Date.now() });
          }
          next[i] = lane;
          return next;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-400">
        PSTN outbound. Note: AgentPhone supports US/CA destinations only — PL
        (+48) numbers will accept the request but fail to ring (we tested).
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={n1}
          onChange={(e) => setN1(e.target.value)}
          placeholder="+1XXXXXXXXXX"
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none"
        />
        <input
          value={n2}
          onChange={(e) => setN2(e.target.value)}
          placeholder="+1XXXXXXXXXX"
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none"
        />
      </div>
      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        rows={5}
        className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-200 focus:border-emerald-500/60 focus:outline-none"
      />
      <div>
        <button
          onClick={start}
          disabled={running || (!n1 && !n2)}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
        >
          {running ? (
            <>
              <Phone className="size-4 animate-pulse" /> calling…
            </>
          ) : (
            <>
              <Play className="size-4" /> start calls
            </>
          )}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {lanes.map((lane, i) => (
          <LaneView key={i} lane={lane} />
        ))}
      </div>
    </div>
  );
}

function LaneView({ lane }: { lane: Lane }) {
  const dot =
    lane.status === "live"
      ? "bg-emerald-400 animate-pulse"
      : lane.status === "ended"
        ? "bg-zinc-500"
        : lane.status === "error"
          ? "bg-red-500"
          : "bg-zinc-700";
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${dot}`} />
          <span className="font-mono text-sm text-zinc-200">{lane.number}</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">
          {lane.status}
        </span>
      </div>
      <div className="max-h-[420px] overflow-y-auto space-y-1.5 text-xs">
        <AnimatePresence initial={false}>
          {lane.events.map((e, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={
                e.kind === "agent" || e.kind === "assistant"
                  ? "text-emerald-300"
                  : e.kind === "user" || e.kind === "caller"
                    ? "text-zinc-100"
                    : e.kind === "error"
                      ? "text-red-300"
                      : "text-zinc-500"
              }
            >
              <span className="opacity-60">{e.kind}:</span> {e.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {lane.events.length === 0 && (
          <div className="text-zinc-600">waiting…</div>
        )}
      </div>
    </div>
  );
}
