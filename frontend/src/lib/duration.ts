export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(safe / 3600);
  const mm = Math.floor((safe % 3600) / 60);
  const ss = safe % 60;
  if (hh > 0) {
    return `${hh}:${pad2(mm)}:${pad2(ss)}`;
  }
  return `${pad2(mm)}:${pad2(ss)}`;
}

export function diffSeconds(start: string, end: string | null = null): number {
  const startMs = Date.parse(start);
  if (!Number.isFinite(startMs)) return 0;
  const endMs = end ? Date.parse(end) : Date.now();
  return Math.max(0, Math.round((endMs - startMs) / 1000));
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}
