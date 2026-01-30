import { SearchResult } from "@/types";

export async function searchWeb(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    throw new Error("SERPER_API_KEY is not configured");
  }

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.organic || data.organic.length === 0) {
      throw new Error("No search results found");
    }

    return data.organic.slice(0, 3).map((result: any) => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet || "",
    }));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search web: ${error.message}`);
    }
    throw new Error("Failed to search web: Unknown error");
  }
}
