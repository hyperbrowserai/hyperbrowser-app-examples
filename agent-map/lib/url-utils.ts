export function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.searchParams.sort();

    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return value;
  }
}

export function resolveUrl(value: string, baseUrl: string): string | null {
  try {
    return normalizeUrl(new URL(value, baseUrl).toString());
  } catch {
    return null;
  }
}

export function getHostname(value: string): string | null {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isInternalUrl(value: string, rootUrl: string): boolean {
  return getHostname(value) === getHostname(rootUrl);
}

export function compactUrl(value: string): string {
  try {
    const url = new URL(value);
    const path = `${url.pathname}${url.search}`;
    return `${url.hostname}${path === "/" ? "" : path}`;
  } catch {
    return value;
  }
}
