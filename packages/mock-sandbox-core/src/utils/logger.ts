import type { Logger } from "../types.js";

export const defaultLogger: Logger = {
  level: "info",
  log: (level, msg, meta) => {
    const levels = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };
    const currentLevel = levels[defaultLogger.level || "info"];
    const msgLevel = levels[level];

    if (msgLevel <= currentLevel) {
      const timestamp = new Date().toISOString();
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${msg}${metaStr}`);
    }
  },
};

export function createLogger(config?: Partial<Logger>): Logger {
  return {
    level: config?.level || "info",
    log: config?.log || defaultLogger.log,
  };
}
