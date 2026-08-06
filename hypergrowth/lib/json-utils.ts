export function extractJsonObject(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON object found.");
    }

    return JSON.parse(text.slice(start, end + 1));
  }
}
