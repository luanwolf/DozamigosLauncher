const DEV_NAME_RE = /^\[VIRTUAL\](?:\d+\s*x\s*)?(.+?)\s+for\s+\d+/i;

export function parseDevNameLabel(devName: string): string | null {
  const match = devName.match(DEV_NAME_RE);
  return match?.[1]?.trim() ?? null;
}
