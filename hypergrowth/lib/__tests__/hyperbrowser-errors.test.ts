import { describe, expect, it } from "vitest";
import { formatHyperbrowserError } from "../hyperbrowser-errors";

describe("formatHyperbrowserError", () => {
  it("turns Hyperbrowser API EACCES failures into actionable runtime guidance", () => {
    const error = new Error(
      "[Hyperbrowser]: request to https://api.hyperbrowser.ai/api/web/fetch failed, reason: connect EACCES 34.8.253.164:443"
    );

    expect(formatHyperbrowserError(error)).toBe(
      "Hyperbrowser API egress is blocked in this runtime. Run the Next.js server outside the network sandbox or allow outbound HTTPS to api.hyperbrowser.ai. Cause: connect EACCES 34.8.253.164:443"
    );
  });

  it("keeps non-egress errors unchanged", () => {
    expect(formatHyperbrowserError(new Error("Reddit returned 403"))).toBe(
      "Reddit returned 403"
    );
  });
});
