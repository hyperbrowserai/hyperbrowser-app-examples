import { SearchResult } from "./hyperbrowser";

const RESEARCH_CACHE_KEY = "healthlens_research_cache";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedResearch {
  fileId: string;
  queries: string[];
  results: SearchResult[];
  timestamp: number;
  status: "pending" | "completed" | "failed";
}

interface ResearchCacheStore {
  [fileId: string]: CachedResearch;
}

/**
 * Get all cached research from localStorage
 */
function getStore(): ResearchCacheStore {
  if (typeof window === "undefined") return {};
  
  try {
    const stored = localStorage.getItem(RESEARCH_CACHE_KEY);
    if (!stored) return {};
    
    const cache: ResearchCacheStore = JSON.parse(stored);
    
    // Clean up expired entries
    const now = Date.now();
    Object.keys(cache).forEach(fileId => {
      if (now - cache[fileId].timestamp > CACHE_EXPIRY_MS) {
        delete cache[fileId];
      }
    });
    
    return cache;
  } catch (error) {
    console.error("Error reading research cache:", error);
    return {};
  }
}

/**
 * Save research cache to localStorage
 */
function saveStore(store: ResearchCacheStore): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(RESEARCH_CACHE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Error saving research cache:", error);
  }
}

/**
 * Mark research as pending for a file
 */
export function markResearchPending(fileId: string, queries: string[]): void {
  const store = getStore();
  store[fileId] = {
    fileId,
    queries,
    results: [],
    timestamp: Date.now(),
    status: "pending",
  };
  saveStore(store);
}

/**
 * Cache research results for a file
 */
export function cacheResearchForFile(
  fileId: string,
  queries: string[],
  results: SearchResult[]
): void {
  const store = getStore();
  store[fileId] = {
    fileId,
    queries,
    results,
    timestamp: Date.now(),
    status: "completed",
  };
  saveStore(store);
}

/**
 * Mark research as failed for a file
 */
export function markResearchFailed(fileId: string, queries: string[]): void {
  const store = getStore();
  store[fileId] = {
    fileId,
    queries,
    results: [],
    timestamp: Date.now(),
    status: "failed",
  };
  saveStore(store);
}

/**
 * Get cached research for a specific file
 */
export function getCachedResearchForFile(fileId: string): CachedResearch | null {
  const store = getStore();
  return store[fileId] || null;
}

/**
 * Get all cached research for multiple files
 */
export function getCachedResearchForFiles(fileIds: string[]): SearchResult[] {
  const store = getStore();
  const allResults: SearchResult[] = [];
  
  fileIds.forEach(fileId => {
    const cached = store[fileId];
    if (cached && cached.status === "completed" && cached.results.length > 0) {
      allResults.push(...cached.results);
    }
  });
  
  // Deduplicate by source
  const uniqueResults = allResults.reduce((acc, result) => {
    if (!acc.find(r => r.source === result.source)) {
      acc.push(result);
    }
    return acc;
  }, [] as SearchResult[]);
  
  return uniqueResults;
}

/**
 * Check if any files have pending research
 */
export function hasPendingResearch(fileIds: string[]): boolean {
  const store = getStore();
  return fileIds.some(fileId => {
    const cached = store[fileId];
    return cached && cached.status === "pending";
  });
}

/**
 * Clear cached research for a specific file (e.g., when file is deleted)
 */
export function clearResearchForFile(fileId: string): void {
  const store = getStore();
  delete store[fileId];
  saveStore(store);
}

/**
 * Clear all cached research
 */
export function clearAllResearch(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RESEARCH_CACHE_KEY);
}
