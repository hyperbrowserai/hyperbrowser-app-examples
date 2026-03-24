import { NextRequest, NextResponse } from "next/server";
import { generateSkillTree } from "@/lib/skill-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, extractedContent } = body as {
      topic: string;
      extractedContent: string;
    };

    if (!topic || !extractedContent) {
      return NextResponse.json(
        { error: "Both topic and extractedContent are required" },
        { status: 400 }
      );
    }

    const tree = await generateSkillTree(topic, extractedContent);

    return NextResponse.json({ tree });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
