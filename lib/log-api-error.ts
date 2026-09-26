export function logApiError(service: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n[API ERROR: ${service}] ${message}\n`);
}
