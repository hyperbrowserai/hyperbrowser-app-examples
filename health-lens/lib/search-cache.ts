import { SearchResult } from "./hyperbrowser";

export interface CachedSearch {
  query: string;
  terms: string[];
  results: SearchResult[];
  timestamp: number;
  expiresAt: number;
}

const CACHE_KEY = "health-search-cache";
const MAX_ENTRIES = 20;
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Simple hash function for cache keys
function hashTerms(terms: string[]): string {
  return terms.sort().join("|").toLowerCase();
}

// Get cache from localStorage
function getCache(): Map<string, CachedSearch> {
  if (typeof window === "undefined") return new Map();
  
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return new Map();
    
    const entries = JSON.parse(stored);
    return new Map(Object.entries(entries));
  } catch (error) {
    console.error("Error reading cache:", error);
    return new Map();
  }
}

// Save cache to localStorage
function saveCache(cache: Map<string, CachedSearch>): void {
  if (typeof window === "undefined") return;
  
  try {
    const entries = Object.fromEntries(cache);
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("Error saving cache:", error);
  }
}

// LRU eviction: remove oldest entries when limit is reached
function evictOldest(cache: Map<string, CachedSearch>): void {
  if (cache.size <= MAX_ENTRIES) return;
  
  // Sort by timestamp and remove oldest
  const sorted = Array.from(cache.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp);
  
  const toRemove = sorted.slice(0, cache.size - MAX_ENTRIES);
  toRemove.forEach(([key]) => cache.delete(key));
}

// Get cached search results
export function getCachedSearch(terms: string[]): SearchResult[] | null {
  const cache = getCache();
  const key = hashTerms(terms);
  const entry = cache.get(key);
  
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    saveCache(cache);
    return null;
  }
  
  return entry.results;
}

// Cache search results
export function cacheSearch(
  terms: string[],
  results: SearchResult[],
  ttl: number = DEFAULT_TTL
): void {
  const cache = getCache();
  const key = hashTerms(terms);
  
  const entry: CachedSearch = {
    query: terms.join(" "),
    terms,
    results,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  };
  
  cache.set(key, entry);
  evictOldest(cache);
  saveCache(cache);
}

// Clear expired entries
export function clearExpiredCache(): void {
  const cache = getCache();
  const now = Date.now();
  let hasChanges = false;
  
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    saveCache(cache);
  }
}

// Clear all cache
export function clearAllCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}

// Get cache stats
export function getCacheStats(): {
  entries: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
} {
  const cache = getCache();
  
  if (cache.size === 0) {
    return { entries: 0, oldestTimestamp: null, newestTimestamp: null };
  }
  
  const timestamps = Array.from(cache.values()).map(e => e.timestamp);
  
  return {
    entries: cache.size,
    oldestTimestamp: Math.min(...timestamps),
    newestTimestamp: Math.max(...timestamps),
  };
}

