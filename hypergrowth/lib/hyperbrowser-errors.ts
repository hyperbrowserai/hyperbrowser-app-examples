export function formatHyperbrowserError(error: unknown): string {
  const message = stringifyError(error);

  if (isHyperbrowserApiEgressError(message)) {
    return [
      "Hyperbrowser API egress is blocked in this runtime.",
      "Run the Next.js server outside the network sandbox or allow outbound HTTPS to api.hyperbrowser.ai.",
      `Cause: ${extractConnectCause(message)}`,
    ].join(" ");
  }

  return message;
}

function isHyperbrowserApiEgressError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("api.hyperbrowser.ai") &&
    normalized.includes("connect eacces")
  );
}

function extractConnectCause(message: string): string {
  const match = message.match(/connect EACCES [^\s]+:\d+/i);
  return match?.[0] ?? "connect EACCES";
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
