export async function searchDocs(topic: string): Promise<string[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY is not set");

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: `${topic} knowledge framework principles theory guide`,
      num: 20,
    }),
  });

  if (!res.ok) {
    throw new Error(`Serper search failed: ${res.status}`);
  }

  const data = await res.json();
  const blocked = [
    "youtube.com",
    "twitter.com",
    "x.com",
    "reddit.com",
    ".pdf",
  ];

  const urls: string[] = (data.organic ?? [])
    .map((r: { link: string }) => r.link)
    .filter(
      (url: string) => !blocked.some((b) => url.toLowerCase().includes(b))
    )
    .slice(0, 8);

  return urls;
}

/** Serper search tuned for expanding one concept within a topic (2–3 pages scraped). */
export async function searchExpansionDocs(
  topic: string,
  nodeName: string
): Promise<string[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY is not set");

  const q = `${topic} ${nodeName} documentation deep dive`;
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q,
      num: 12,
    }),
  });

  if (!res.ok) {
    throw new Error(`Serper search failed: ${res.status}`);
  }

  const data = await res.json();
  const blocked = [
    "youtube.com",
    "twitter.com",
    "x.com",
    "reddit.com",
    ".pdf",
  ];

  const urls: string[] = (data.organic ?? [])
    .map((r: { link: string }) => r.link)
    .filter(
      (url: string) => !blocked.some((b) => url.toLowerCase().includes(b))
    )
    .slice(0, 3);

  return urls;
}
