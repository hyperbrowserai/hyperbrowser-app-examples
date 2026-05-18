import { fetchTweetMarkdown } from "@/lib/hyperbrowser";
import { extractTweetText, scoreTweet } from "@/lib/anthropic";
import { createSseStream } from "@/lib/sse";

export const runtime = "nodejs";
export const maxDuration = 300;

function isTweetUrl(input: string): boolean {
  return /^https:\/\/(x|twitter)\.com\//i.test(input.trim());
}

export async function POST(req: Request) {
  let body: { input?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = body.input?.trim();
  if (!input) {
    return Response.json({ error: "Input is required" }, { status: 400 });
  }

  const fromUrl = isTweetUrl(input);

  return createSseStream(async (send) => {
    let tweetText = input;

    if (fromUrl) {
      send({ step: 1, message: "Fetching tweet from X..." });
      const pageMarkdown = await fetchTweetMarkdown(input);
      send({ step: 2, message: "Extracting tweet text..." });
      tweetText = await extractTweetText(pageMarkdown);
    } else {
      send({ step: 1, message: "Analyzing tweet..." });
    }

    send({ step: 3, message: "Running algorithm weights..." });
    const result = await scoreTweet(tweetText, fromUrl);

    send({ step: 4, message: "Done", result });
  });
}
