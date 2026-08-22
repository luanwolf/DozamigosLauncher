const SECRET_RE =
  /(authorization|bearer\s+[a-z0-9._~+/=-]+|eg1~[a-z0-9._-]+|device[_-]?auth|x-api-key\s*[:=]\s*\S+|api[_-]?key\s*[:=]\s*\S+|exchange[_-]?code\s*[:=]\s*\S+|authorization[_-]?code\s*[:=]\s*\S+|access[_-]?token\s*[:=]\s*\S+|refresh[_-]?token\s*[:=]\s*\S+|external_auth_token\s*[:=]\s*\S+)/gi;

const CLI_SECRET_FLAGS = new Set(['--token', '--session', '--code', '--secret']);

export function redactSecrets(text: string): string {
  return text.replace(SECRET_RE, '[REDACTED]');
}

/** Hide `--token <secret>` style CLI args before logging. */
export function redactCliArgs(args: readonly string[]): string[] {
  const out = [...args];
  for (let i = 0; i < out.length - 1; i++) {
    if (CLI_SECRET_FLAGS.has(out[i]!)) out[i + 1] = '[REDACTED]';
  }
  return out;
}

/** Safe shape for logs — never dump ky Request headers / raw Epic bodies. */
export function loggableError(error: unknown): { name?: string; message: string; errorCode?: string } {
  if (error && typeof error === 'object' && 'errorCode' in error && 'errorMessage' in error) {
    return {
      name: error instanceof Error ? error.name : 'EpicAPIError',
      message: redactSecrets(String((error as { errorMessage: unknown }).errorMessage)),
      errorCode: String((error as { errorCode: unknown }).errorCode)
    };
  }
  if (error instanceof Error) {
    return { name: error.name, message: redactSecrets(error.message) };
  }
  return { message: redactSecrets(String(error)) };
}
