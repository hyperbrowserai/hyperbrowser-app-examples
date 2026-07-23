import { CONFIG } from "@/lib/config";
import { preflightK3 } from "@/lib/moonshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Startup health check the UI calls on load: confirms the Hyperbrowser key is
 * present and does a real 1-token K3 call so a bad model string / capacity
 * issue surfaces honestly before a run.
 */
export async function GET() {
  const hyperbrowser = Boolean(process.env.HYPERBROWSER_API_KEY);
  const moonshot = await preflightK3();
  return Response.json({
    hyperbrowser,
    moonshot,
    model: CONFIG.moonshotModel,
    maxBrowsers: CONFIG.maxBrowsers,
    budgetTokens: CONFIG.contextBudgetTokens,
    hardLimit: CONFIG.contextHardLimit,
  });
}
