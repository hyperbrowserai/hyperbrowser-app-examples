import type {
  ExecutedSearch,
  QueryPlan,
  SignalSource,
  SourceBudgetPolicy,
} from "./types";

export const defaultSourceBudgetPolicy: SourceBudgetPolicy = {
  maxSourceSearchesPerRun: 8,
  maxQueriesPerSource: 3,
  maxRawSignalsPerSearch: 8,
  maxRawSignalsTotal: 60,
  requestTimeoutMs: 12_000,
};

export function planExecutedSearches({
  queryPlan,
  selectedSources,
  policy = defaultSourceBudgetPolicy,
}: {
  queryPlan: QueryPlan;
  selectedSources: SignalSource[];
  policy?: SourceBudgetPolicy;
}): ExecutedSearch[] {
  const searches: ExecutedSearch[] = selectedSources.map((source) => ({
    source,
    query: queryPlan.originalQuery,
    reason: "original",
  }));
  const counts = new Map<SignalSource, number>(
    selectedSources.map((source) => [source, 1])
  );
  const queues = new Map<SignalSource, string[]>(
    selectedSources.map((source) => [
      source,
      queryPlan.sourceQueries[source].filter(
        (query) =>
          query.toLowerCase() !== queryPlan.originalQuery.toLowerCase()
      ),
    ])
  );

  while (searches.length < policy.maxSourceSearchesPerRun) {
    let added = false;

    for (const source of selectedSources) {
      if (searches.length >= policy.maxSourceSearchesPerRun) break;
      if ((counts.get(source) ?? 0) >= policy.maxQueriesPerSource) continue;

      const next = queues.get(source)?.shift();
      if (!next) continue;

      searches.push({ source, query: next, reason: "expanded" });
      counts.set(source, (counts.get(source) ?? 0) + 1);
      added = true;
    }

    if (!added) break;
  }

  return limitSingleSessionSources(searches);
}

function limitSingleSessionSources(searches: ExecutedSearch[]): ExecutedSearch[] {
  const seenReddit = new Set<string>();

  return searches.filter((search) => {
    if (search.source !== "reddit") return true;
    if (seenReddit.has(search.source)) return false;

    seenReddit.add(search.source);
    return true;
  });
}

export function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]).finally(() =>
    clearTimeout(timeout)
  );
}
