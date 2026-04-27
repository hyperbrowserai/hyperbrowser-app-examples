/** In-memory cancel flags for Auto Mode (single-instance / dev). */

const cancelFlags = new Map<string, boolean>();

export function requestAutoModeCancel(runId: string): void {
  cancelFlags.set(runId, true);
}

export function isAutoModeCancelRequested(runId: string): boolean {
  return cancelFlags.get(runId) === true;
}

export function clearAutoModeCancel(runId: string): void {
  cancelFlags.delete(runId);
}
