import { config } from './config';

// Pino-style structured logger. Object-form signature survives a future swap
// to a real structured backend without re-writing call sites.
//
// Hard rules (spec §17):
// - Object-form: log.error('msg', { err, offerId, runId })
// - Redact PII (emails, phones, payment details) — even in dev, screenshots leak.
// - Levels honour config.LOG_LEVEL; `info` additionally requires DEV.

type LogContext = Record<string, unknown>;
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const PII_KEY_PATTERN = /email|phone|card|cvv|secret|token/i;

function redact(ctx: LogContext): LogContext {
  const out: LogContext = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (PII_KEY_PATTERN.test(k)) out[k] = '<redacted>';
    else out[k] = v;
  }
  return out;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[config.LOG_LEVEL];
}

export const log = {
  debug: (msg: string, ctx: LogContext = {}) => {
    if (!shouldLog('debug')) return;
    console.debug(`[CMA] ${msg}`, redact(ctx));
  },
  info: (msg: string, ctx: LogContext = {}) => {
    // `info` is dev-only noise; never ship to prod console.
    if (!import.meta.env.DEV) return;
    if (!shouldLog('info')) return;
    console.info(`[CMA] ${msg}`, redact(ctx));
  },
  warn: (msg: string, ctx: LogContext = {}) => {
    if (!shouldLog('warn')) return;
    console.warn(`[CMA] ${msg}`, redact(ctx));
  },
  error: (msg: string, ctx: { err?: unknown } & LogContext = {}) => {
    if (!shouldLog('error')) return;
    console.error(`[CMA] ${msg}`, redact(ctx));
  },
};
