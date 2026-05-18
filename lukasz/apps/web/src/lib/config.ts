import { z } from 'zod';

// Schema validates the raw `import.meta.env` shape. Fail-fast on bad config:
// throwing at module load makes misconfiguration impossible to miss.
const envSchema = z.object({
  VITE_API_BASE_URL: z.url().default('http://localhost:5173'),
  VITE_USE_MSW: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  VITE_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // Surface every field error so misconfigs are obvious in dev console / CI logs.
  const issues = parsed.error.issues
    .map((i) => `  ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`[config] Invalid environment variables:\n${issues}`);
}

export const config = Object.freeze({
  API_BASE_URL: parsed.data.VITE_API_BASE_URL,
  USE_MSW: parsed.data.VITE_USE_MSW,
  LOG_LEVEL: parsed.data.VITE_LOG_LEVEL,
} as const);

export type Config = typeof config;
