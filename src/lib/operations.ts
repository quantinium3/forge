import type { Operation, OperationStatus } from "@electron/lib/kuznets";

const TERMINAL_STATUSES = new Set<OperationStatus>([
  "succeeded",
  "failed",
  "rolled_back",
]);

export function isTerminal(status: OperationStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * kuznets queues work and returns immediately, so the outcome only shows up by
 * polling. Resolves once the operation reaches a terminal state -- a terminal
 * `failed` resolves rather than throws, so callers can read `error`.
 */
export async function pollOperation(
  serverId: string,
  operationId: number,
  intervalMs = 1500,
): Promise<Operation> {
  for (;;) {
    const operation = await window.api.operation.get(serverId, operationId);
    if (isTerminal(operation.status)) return operation;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
