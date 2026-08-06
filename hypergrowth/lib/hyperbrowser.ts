import { Hyperbrowser } from "@hyperbrowser/sdk";

const defaultHyperbrowserTimeoutMs = 60_000;
const defaultSessionRetryDelaysMs = [1_500, 3_000, 6_000, 12_000];
type HyperbrowserStealthMode = "none" | "auto" | "ultra";
type FetchOutputLabel =
  | "markdown"
  | "links"
  | "screenshot:webp"
  | "json:page-summary"
  | "branding";
type WebSearchResultItem = {
  title: string;
  url: string;
  description: string;
};

export type HyperbrowserPageSummary = {
  pageType?: string;
  mainTopic?: string;
  audience?: string;
  evidenceValue?: string;
  painSignals?: string[];
};

export type HyperbrowserBrandingSummary = {
  colorScheme?: string;
  primaryColor?: string;
  accentColor?: string;
  logo?: string;
  favicon?: string;
  tone?: string;
  confidence?: number;
};

export type HyperbrowserPageArtifacts = {
  markdown: string;
  links: unknown[];
  metadata?: Record<string, unknown>;
  screenshot?: string;
  json?: HyperbrowserPageSummary;
  branding?: HyperbrowserBrandingSummary;
  outputFormats: FetchOutputLabel[];
  richFetchStatus: "used" | "fallback" | "basic";
  richFetchError?: string;
};

export function getHyperbrowserClient(): Hyperbrowser {
  const apiKey = process.env.HYPERBROWSER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing HYPERBROWSER_API_KEY");
  }

  return new Hyperbrowser({
    apiKey,
    timeout: getHyperbrowserTimeoutMs(),
  });
}

export async function fetchMarkdown(
  client: Hyperbrowser,
  url: string,
  options: { stealth?: HyperbrowserStealthMode } = {}
): Promise<{ markdown: string; links: unknown[] }> {
  const artifacts = await fetchPageArtifacts(client, url, {
    ...options,
    richArtifacts: false,
  });

  return {
    markdown: artifacts.markdown,
    links: artifacts.links,
  };
}

export async function fetchPageArtifacts(
  client: Hyperbrowser,
  url: string,
  options: {
    stealth?: HyperbrowserStealthMode;
    richArtifacts?: boolean;
  } = {}
): Promise<HyperbrowserPageArtifacts> {
  const richArtifacts = options.richArtifacts ?? true;

  if (richArtifacts) {
    try {
      return parseFetchResponse(
        await withHyperbrowserSessionRetry(() =>
          client.web.fetch({
            url,
            stealth: options.stealth,
            browser: {
              screen: { width: 1280, height: 720 },
            },
            navigation: {
              waitUntil: "domcontentloaded",
              timeoutMs: getHyperbrowserTimeoutMs(),
            },
            outputs: {
              formats: [
                "markdown",
                "links",
                {
                  type: "screenshot",
                  fullPage: false,
                  format: "webp",
                },
                {
                  type: "json",
                  prompt:
                    "Summarize this page for B2B growth research. Focus on developer pain, concrete demand signals, page type, audience, and whether it is useful evidence.",
                  schema: {
                    type: "object",
                    properties: {
                      pageType: { type: "string" },
                      mainTopic: { type: "string" },
                      audience: { type: "string" },
                      evidenceValue: { type: "string" },
                      painSignals: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: [
                      "pageType",
                      "mainTopic",
                      "evidenceValue",
                      "painSignals",
                    ],
                    additionalProperties: false,
                  },
                },
                "branding",
              ],
            },
          })
        ),
        {
          outputFormats: [
            "markdown",
            "links",
            "screenshot:webp",
            "json:page-summary",
            "branding",
          ],
          richFetchStatus: "used",
        }
      );
    } catch (error) {
      // If the rich fetch failed (e.g. timeout), the server might still be spinning down the session.
      // We must wait a moment before immediately firing the fallback fetch to avoid slamming the active session limit.
      await sleep(2000);
      const fallback = await fetchBasicPageArtifacts(client, url, options);
      return {
        ...fallback,
        richFetchStatus: "fallback",
        richFetchError:
          error instanceof Error ? error.message : "Rich fetch failed.",
      };
    }
  }

  return fetchBasicPageArtifacts(client, url, options);
}

async function fetchBasicPageArtifacts(
  client: Hyperbrowser,
  url: string,
  options: { stealth?: HyperbrowserStealthMode } = {}
): Promise<HyperbrowserPageArtifacts> {
  const response = await withHyperbrowserSessionRetry(() =>
    client.web.fetch({
      url,
      stealth: options.stealth,
      navigation: {
        waitUntil: "domcontentloaded",
        timeoutMs: getHyperbrowserTimeoutMs(),
      },
      outputs: {
        formats: ["markdown", "links"],
      },
    })
  );

  return parseFetchResponse(response, {
    outputFormats: ["markdown", "links"],
    richFetchStatus: "basic",
  });
}

function parseFetchResponse(
  response: unknown,
  request: {
    outputFormats: FetchOutputLabel[];
    richFetchStatus: HyperbrowserPageArtifacts["richFetchStatus"];
  }
): HyperbrowserPageArtifacts {
  if (
    typeof response === "object" &&
    response !== null &&
    "status" in response &&
    (response as { status?: unknown }).status === "failed"
  ) {
    const error = (response as { error?: unknown }).error;
    throw new Error(typeof error === "string" ? error : "Hyperbrowser Fetch failed.");
  }

  const data =
    typeof response === "object" && response !== null && "data" in response
      ? (response as { data?: unknown }).data
      : response;

  if (typeof data !== "object" || data === null) {
    return {
      markdown: "",
      links: [],
      outputFormats: request.outputFormats,
      richFetchStatus: request.richFetchStatus,
    };
  }

  const record = data as Record<string, unknown>;

  return {
    markdown:
      typeof record.markdown === "string"
        ? record.markdown
        : typeof record.content === "string"
          ? record.content
          : "",
    links: Array.isArray(record.links) ? record.links : [],
    metadata: readRecord(record.metadata),
    screenshot:
      typeof record.screenshot === "string" ? record.screenshot : undefined,
    json: readPageSummary(record.json),
    branding: readBrandingSummary(record.branding),
    outputFormats: request.outputFormats,
    richFetchStatus: request.richFetchStatus,
  };
}

export async function searchWeb(
  client: Hyperbrowser,
  query: string
): Promise<WebSearchResultItem[]> {
  const response = await withHyperbrowserSessionRetry(() =>
    client.web.search({ query })
  );

  if (response.status !== "completed" && response.error) {
    throw new Error(response.error);
  }

  return response.data?.results ?? [];
}

function getHyperbrowserTimeoutMs(): number {
  const configured = Number.parseInt(
    process.env.HYPERBROWSER_TIMEOUT_MS ?? "",
    10
  );

  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return defaultHyperbrowserTimeoutMs;
}

async function withHyperbrowserSessionRetry<T>(
  operation: () => Promise<T>
): Promise<T> {
  const delays = getSessionRetryDelaysMs();
  let lastError: unknown;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isActiveSessionLimitError(error) || attempt >= delays.length) {
        throw error;
      }

      await sleep(delays[attempt] ?? 0);
    }
  }

  throw lastError;
}

function getSessionRetryDelaysMs(): number[] {
  const configured = process.env.HYPERBROWSER_SESSION_RETRY_DELAYS_MS;
  if (!configured) return defaultSessionRetryDelaysMs;

  const delays = configured
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value) && value >= 0);

  return delays.length ? delays : defaultSessionRetryDelaysMs;
}

function isActiveSessionLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  return (
    normalized.includes("maximum number of active sessions") ||
    normalized.includes("active sessions") && normalized.includes("reached")
  );
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function readPageSummary(value: unknown): HyperbrowserPageSummary | undefined {
  const record = readRecord(value);
  if (!record) return undefined;

  return {
    pageType: readString(record.pageType),
    mainTopic: readString(record.mainTopic),
    audience: readString(record.audience),
    evidenceValue: readString(record.evidenceValue),
    painSignals: Array.isArray(record.painSignals)
      ? record.painSignals.filter(
          (item): item is string => typeof item === "string"
        )
      : undefined,
  };
}

function readBrandingSummary(
  value: unknown
): HyperbrowserBrandingSummary | undefined {
  const record = readRecord(value);
  if (!record) return undefined;

  const colors = readRecord(record.colors);
  const images = readRecord(record.images);
  const personality = readRecord(record.personality);
  const confidence = readRecord(record.confidence);

  return {
    colorScheme: readString(record.colorScheme),
    primaryColor: readString(colors?.primary),
    accentColor: readString(colors?.accent),
    logo: readString(images?.logo),
    favicon: readString(images?.favicon),
    tone: readString(personality?.tone),
    confidence:
      typeof confidence?.overall === "number" ? confidence.overall : undefined,
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
