import * as path from 'path';
import { Logger } from '../utils/Logger';

export type Environment = 'development' | 'production' | 'test';

export class Config {
  static readonly ENV: Environment = (process.env.NODE_ENV as Environment) || 'development';
  static readonly BOT_TOKEN = this.requireEnv('BOT_TOKEN');
  static readonly STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../../data');
  static readonly NOTIFICATION_TIME = this.parseNotificationTime();
  static readonly TIMEZONE = 'Europe/Riga';
  static readonly HTTP_PORT = parseInt(process.env.HTTP_PORT || '3000', 10);
  static readonly SHUTDOWN_TIMEOUT = 5000; // ms

  static validate(): void {
    try {
      this.validateNotificationTime();
      this.validateTimezone();
      this.validatePort();

      Logger.info('Configuration validated successfully', {
        env: this.ENV,
        storagePath: this.STORAGE_PATH,
        notificationTime: this.NOTIFICATION_TIME,
        timezone: this.TIMEZONE,
        httpPort: this.HTTP_PORT,
      });
    } catch (error) {
      Logger.error('Configuration validation failed', error as Error);
      process.exit(1);
    }
  }

  private static requireEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
  }

  public static parseNotificationTime(): number {
    const time = parseInt(process.env.NOTIFICATION_TIME || '7', 10);

    if (isNaN(time) || time < 0 || time > 23) {
      throw new Error('NOTIFICATION_TIME must be between 0 and 23');
    }

    return time;
  }

  private static validateNotificationTime(): void {
    if (this.NOTIFICATION_TIME < 0 || this.NOTIFICATION_TIME > 23) {
      throw new Error('NOTIFICATION_TIME must be between 0 and 23');
    }
  }

  private static validateTimezone(): void {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: this.TIMEZONE });
    } catch {
      throw new Error(`Invalid timezone: ${this.TIMEZONE}`);
    }
  }

  private static validatePort(): void {
    if (this.HTTP_PORT < 1 || this.HTTP_PORT > 65535) {
      throw new Error(`Invalid HTTP_PORT: ${this.HTTP_PORT}`);
    }
  }
}
