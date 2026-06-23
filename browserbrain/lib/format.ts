export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (sec < 60) return sec <= 1 ? "just now" : `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return min === 1 ? "1 min ago" : `${min} mins ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return hr === 1 ? "1 hour ago" : `${hr} hours ago`;
  const day = Math.round(hr / 24);
  return day === 1 ? "1 day ago" : `${day} days ago`;
}

// milliseconds -> "8.4s" / "0.31s"
export function secs(ms: number): string {
  return `${(ms / 1000).toFixed(ms < 1000 ? 2 : 1)}s`;
}
