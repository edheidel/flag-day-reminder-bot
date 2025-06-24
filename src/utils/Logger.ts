export class Logger {
  static info(message: string, meta?: Record<string, unknown>): void {
    console.log(`[INFO] ${message}`, meta ? meta : '');
  }

  static warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, meta ? meta : '');
  }

  static error(message: string, error?: Error | unknown): void {
    console.error(`[ERROR] ${message}`, error instanceof Error ? error.stack : error);
  }
}
