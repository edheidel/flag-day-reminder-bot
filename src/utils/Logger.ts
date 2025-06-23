import { DateTime } from 'luxon';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
type ErrorLike = Error | unknown;

const Colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
} as const;

const LevelColors: Record<LogLevel, string> = {
  DEBUG: Colors.blue,
  INFO: Colors.green,
  ERROR: Colors.red,
  WARN: Colors.yellow,
};

export class Logger {
  static debug(message: string, meta: object = {}): void {
    this.log('DEBUG', message, meta);
  }

  static info(message: string, meta: object = {}): void {
    this.log('INFO', message, meta);
  }

  static warn(message: string, meta: object = {}): void {
    this.log('WARN', message, meta);
  }

  static error(message: string, errorOrMeta?: ErrorLike | object, meta: object = {}): void {
    if (!errorOrMeta || errorOrMeta instanceof Error) {
      const error = errorOrMeta as Error | null;

      this.log('ERROR', message, {
        ...meta,
        error: error && {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    } else {
      this.log('ERROR', message, errorOrMeta as object);
    }
  }

  private static log(level: LogLevel, message: string, meta: object): void {
    const timestamp = DateTime.now().setZone('Europe/Riga').toFormat('yyyy-MM-dd HH:mm:ss');
    const color = LevelColors[level];

    const parts = [
      Colors.dim + timestamp + Colors.reset,
      color + level.padEnd(5) + Colors.reset,
      message,
    ];

    if (Object.keys(meta).length > 0) {
      const metaParts = Object.entries(meta).map(([key, value]) => `${key}=${formatValue(value)}`);

      parts.push(Colors.dim + metaParts.join(' | ') + Colors.reset);
    }

    console.log(parts.join(' | '));
  }
}

function formatValue(value: unknown): string {
  if (value === null) {return 'null';}
  if (value === undefined) {return 'undefined';}
  if (typeof value === 'object') {return JSON.stringify(value);}

  return String(value);
}
