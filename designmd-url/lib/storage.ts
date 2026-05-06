const STORAGE_KEY = "hb_api_key";

export function hasApiKey(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem(STORAGE_KEY);
}

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setApiKey(apiKey: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, apiKey.trim());
}

export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
