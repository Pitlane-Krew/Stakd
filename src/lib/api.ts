/**
 * API utilities — Zod validation, rate limiting, CRON auth.
 * Use in all API route handlers.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

// ── Validated JSON body ──────────────────────────────────────
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const raw = await request.json();
    const result = schema.safeParse(raw);
    if (!result.success) {
      return {
        error: NextResponse.json(
          { error: "Validation failed", details: result.error.flatten() },
          { status: 422 }
        ),
      };
    }
    return { data: result.data };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }
}

// ── CRON secret check ────────────────────────────────────────
export function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}

export function cronUnauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// ── Standard error responses ─────────────────────────────────
export const apiError = {
  unauthorized: (msg = "Unauthorized") =>
    NextResponse.json({ error: msg }, { status: 401 }),
  forbidden: (msg = "Forbidden") =>
    NextResponse.json({ error: msg }, { status: 403 }),
  notFound: (msg = "Not found") =>
    NextResponse.json({ error: msg }, { status: 404 }),
  badRequest: (msg = "Bad request") =>
    NextResponse.json({ error: msg }, { status: 400 }),
  tooManyRequests: (msg = "Too many requests") =>
    NextResponse.json({ error: msg }, { status: 429 }),
  serverError: (msg = "Internal server error") =>
    NextResponse.json({ error: msg }, { status: 500 }),
};

// ── In-memory rate limiter (Edge-compatible) ─────────────────
// For production use Vercel KV or Upstash Redis.
// This simple version tracks per-IP per-endpoint in memory.
const rateLimitStore = new Map<string, { count: number; reset: number }>();

interface RateLimitConfig {
  /** Max requests allowed */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

const RATE_PRESETS: Record<string, RateLimitConfig> = {
  default:   { limit: 60,  windowSeconds: 60 },
  auth:      { limit: 10,  windowSeconds: 60 },   // login/signup
  ai:        { limit: 20,  windowSeconds: 60 },   // grading, translate
  upload:    { limit: 10,  windowSeconds: 60 },   // image uploads
  admin:     { limit: 120, windowSeconds: 60 },   // admin reads
  valuation: { limit: 30,  windowSeconds: 60 },
};

export function rateLimit(
  request: NextRequest,
  preset: keyof typeof RATE_PRESETS = "default"
): { allowed: boolean; remaining: number } {
  const config = RATE_PRESETS[preset];
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const key = `${ip}:${preset}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.reset) {
    rateLimitStore.set(key, {
      count: 1,
      reset: now + config.windowSeconds * 1000,
    });
    return { allowed: true, remaining: config.limit - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, config.limit - entry.count);

  if (entry.count > config.limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining };
}

// ── Input sanitization ───────────────────────────────────────
export function sanitizeText(input: string, maxLength = 1000): string {
  return input
    .trim()
    .slice(0, maxLength)
    // Remove null bytes
    .replace(/\x00/g, "")
    // Normalize whitespace (no consecutive newlines > 2)
    .replace(/\n{3,}/g, "\n\n");
}

// ── Common Zod schemas ───────────────────────────────────────
export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
