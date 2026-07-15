import "server-only"

type Level = "info" | "warn" | "error"
type Meta = Record<string, unknown>

/**
 * One JSON line per log call (level, message, ISO timestamp, arbitrary meta).
 * Written to stdout/stderr, which is what container runtimes and `kubectl logs`
 * capture — no shipping/agent config needed to get greppable, parseable logs.
 */
function log(level: Level, message: string, meta?: Meta): void {
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...meta })
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (message: string, meta?: Meta) => log("info", message, meta),
  warn: (message: string, meta?: Meta) => log("warn", message, meta),
  error: (message: string, meta?: Meta) => log("error", message, meta),
}
