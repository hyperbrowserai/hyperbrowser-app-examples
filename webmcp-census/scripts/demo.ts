import { config } from "dotenv";
import { promises as fs } from "fs";
import path from "path";
import { parseArgs } from "util";
import { chromium, type Browser } from "playwright-core";
import type { WebMCPInvocation } from "@hyperbrowser/sdk/types";
import { getHyperbrowser } from "../lib/census";

config({ path: [".env.local", ".env"], quiet: true });

// The cloud browser cannot reach localhost, so the demo page is served from
// this process through Playwright request interception on a reserved .test
// host. Only tools whose source is this page are ever invoked.
const DEMO_ORIGIN = "https://webmcp-census-demo.test";
const DEMO_URL = `${DEMO_ORIGIN}/`;

const { values } = parseArgs({
  options: {
    wait: { type: "string", default: "300" },
    "auto-submit": { type: "boolean", default: false },
  },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!process.env.HYPERBROWSER_API_KEY) {
    console.error("HYPERBROWSER_API_KEY is not set. Add it to .env.local.");
    process.exit(1);
  }
  const waitSeconds = Number(values.wait);
  const html = await fs.readFile(path.join(process.cwd(), "demo", "demo-page.html"), "utf8");
  const client = getHyperbrowser();

  const session = await client.sessions.create({
    enableWebMcp: true,
    timeoutMinutes: Math.ceil(waitSeconds / 60) + 5,
  });
  console.log(`Session ${session.id}`);
  let browser: Browser | undefined;
  try {
    browser = await chromium.connectOverCDP(session.wsEndpoint);
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = context.pages()[0] ?? (await context.newPage());
    await context.route(`${DEMO_ORIGIN}/**`, (route) =>
      route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html })
    );
    await page.goto(DEMO_URL, { waitUntil: "load" });

    const discovery = await client.sessions.webmcp.listTools(session.id);
    const ours = discovery.tools.filter(
      (t) => t.source.pageUrl.startsWith(DEMO_ORIGIN) && t.source.frame.isMainFrame
    );
    console.log(`Discovered ${ours.length} tool(s) on the demo page:`);
    for (const t of ours) {
      console.log(`  - ${t.name} (${t.declarative ? "declarative" : "imperative"})`);
    }

    const fact = ours.find((t) => t.name === "get_census_fact");
    const form = ours.find((t) => t.name === "request_census_badge");
    if (!fact || !form) throw new Error("Demo tools were not registered");

    console.log("\n1) Blocking call: get_census_fact");
    const result = await client.sessions.webmcp.invoke(session.id, {
      toolRef: fact.toolRef,
      input: {},
      timeoutSeconds: 30,
    });
    console.log(`   status=${result.status} durationMs=${result.durationMs}`);
    if (result.status === "error") console.log(`   errorText=${result.errorText}`);
    else console.log(`   output=${JSON.stringify(result.output)}`);

    console.log("\n2) Human hand-off: request_census_badge (declarative form)");
    let invocation: WebMCPInvocation = await client.sessions.webmcp.start(session.id, {
      toolRef: form.toolRef,
      input: { site: "example.com", contact: "Census demo" },
      timeoutSeconds: Math.min(3600, waitSeconds + 30),
    });
    console.log(`   invocationId=${invocation.invocationId} status=${invocation.status}`);

    const deadline = Date.now() + waitSeconds * 1000;
    let announced = false;
    while (["running", "awaiting_submission"].includes(invocation.status)) {
      if (invocation.status === "awaiting_submission" && !announced) {
        announced = true;
        console.log("   The form is filled in and waiting for a human to submit it.");
        if (values["auto-submit"]) {
          console.log("   --auto-submit: clicking Submit from the script instead of Live View.");
          await sleep(1_000);
          await page.click("#badge-form button[type=submit]");
        } else {
          console.log(`   Open Live View and press Submit:\n\n   ${session.liveUrl}\n`);
          console.log(`   Waiting up to ${waitSeconds}s...`);
        }
      }
      if (Date.now() > deadline) {
        console.log("   No submission in time; requesting cancellation.");
        invocation = await client.sessions.webmcp.cancel(session.id, invocation.invocationId);
        break;
      }
      invocation = await client.sessions.webmcp.getResult(session.id, invocation.invocationId, {
        waitSeconds: 10,
      });
    }
    console.log(`   final status=${invocation.status}`);
    if (invocation.result) console.log(`   output=${JSON.stringify(invocation.result.output)}`);
    if (invocation.error) console.log(`   error=${invocation.error.code}: ${invocation.error.message}`);
  } finally {
    await browser?.close().catch(() => undefined);
    await client.sessions.stop(session.id).catch(() => undefined);
    console.log("\nSession stopped.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
