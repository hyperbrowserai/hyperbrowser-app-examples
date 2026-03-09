import { NextResponse } from "next/server";
import { checkRateLimit } from "./rate-limit";

export function getRateLimitResponse(
  req: Request,
  maxRequests: number,
  windowMs: number
): NextResponse | null {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "anonymous";
  const url = new URL(req.url);
  const key = `${ip}:${url.pathname}`;

  const result = checkRateLimit(key, maxRequests, windowMs);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}
