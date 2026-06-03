import { describe, expect, it } from "vitest";
import { isLLMTransportError } from "../llm/errors";

describe("isLLMTransportError", () => {
  it("detects request timeout and connection failures", () => {
    expect(isLLMTransportError(new Error("Request timed out."))).toBe(true);
    expect(isLLMTransportError(new Error("Connection error."))).toBe(true);
    expect(isLLMTransportError(new Error("connect EACCES 443"))).toBe(true);
  });

  it("does not classify validation failures as transport errors", () => {
    expect(isLLMTransportError(new Error("Invalid enum value"))).toBe(false);
    expect(isLLMTransportError(new Error("No JSON object found."))).toBe(false);
  });
});
