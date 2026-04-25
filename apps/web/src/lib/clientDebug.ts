/** Dev-only client diagnostics; no-op in production builds. */
export function debugClient(scope: string, detail?: unknown): void {
  if (import.meta.env.DEV) {
    console.debug(`[wegoagane:${scope}]`, detail);
  }
}
