import { afterEach, describe, expect, it } from "vitest";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import {
  getReasoningEffort,
  isReasoningEnabled,
  withReasoningEffort,
} from "../llm/provider";

const originalEnableReasoning = process.env.ENABLE_REASONING;
const originalReasoningLevel = process.env.REASONING_LEVEL;

function baseParams(): ChatCompletionCreateParamsNonStreaming {
  return {
    model: "test-model",
    messages: [],
  };
}

afterEach(() => {
  if (originalEnableReasoning === undefined) {
    delete process.env.ENABLE_REASONING;
  } else {
    process.env.ENABLE_REASONING = originalEnableReasoning;
  }

  if (originalReasoningLevel === undefined) {
    delete process.env.REASONING_LEVEL;
  } else {
    process.env.REASONING_LEVEL = originalReasoningLevel;
  }
});

describe("LLM provider reasoning effort", () => {
  it("leaves request params unchanged when reasoning is disabled", () => {
    delete process.env.ENABLE_REASONING;
    process.env.REASONING_LEVEL = "high";

    const params = baseParams();
    const result = withReasoningEffort(params);

    expect(isReasoningEnabled()).toBe(false);
    expect(result).toBe(params);
    expect(result).not.toHaveProperty("reasoning_effort");
  });

  it("treats true-like ENABLE_REASONING values as enabled", () => {
    for (const value of ["true", "1", "yes", "on"]) {
      process.env.ENABLE_REASONING = value;
      expect(isReasoningEnabled()).toBe(true);
    }
  });

  it("defaults enabled reasoning effort to medium when level is missing", () => {
    process.env.ENABLE_REASONING = "true";
    delete process.env.REASONING_LEVEL;

    expect(getReasoningEffort()).toBe("medium");
    expect(withReasoningEffort(baseParams())).toHaveProperty(
      "reasoning_effort",
      "medium"
    );
  });

  it("preserves valid low, medium, and high levels when enabled", () => {
    process.env.ENABLE_REASONING = "true";

    for (const level of ["low", "medium", "high"] as const) {
      process.env.REASONING_LEVEL = level;
      expect(getReasoningEffort()).toBe(level);
      expect(withReasoningEffort(baseParams())).toHaveProperty(
        "reasoning_effort",
        level
      );
    }
  });

  it("falls back to medium for invalid enabled reasoning levels", () => {
    process.env.ENABLE_REASONING = "true";
    process.env.REASONING_LEVEL = "xhigh";

    expect(getReasoningEffort()).toBe("medium");
    expect(withReasoningEffort(baseParams())).toHaveProperty(
      "reasoning_effort",
      "medium"
    );
  });
});
