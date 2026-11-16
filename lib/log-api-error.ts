export function logApiError(service: string, error: unknown) {
  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    message = (errObj.message as string) || JSON.stringify(error);
  } else {
    message = String(error);
  }
  console.error(`\n[API ERROR: ${service}] ${message}\n`);
}
