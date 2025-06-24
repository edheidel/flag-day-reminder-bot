import * as dotenv from 'dotenv';
import * as path from 'path';
import { DateTime } from 'luxon';

dotenv.config();

export class Config {
  static readonly BOT_TOKEN = process.env.BOT_TOKEN || '';
  static readonly ENV = process.env.NODE_ENV || 'development';
  static readonly HTTP_PORT = parseInt(process.env.PORT || '3000', 10);
  static readonly NOTIFICATION_TIME = Config.parseNotificationTime();
  static readonly SHUTDOWN_TIMEOUT = 5000;
  static readonly STORAGE_PATH = this.resolveStoragePath();
  static readonly TIMEZONE = 'Europe/Riga';

  static validate(): void {
    if (!Config.BOT_TOKEN) {
      throw new Error('BOT_TOKEN environment variable is required');
    }

    // Validate timezone
    if (!DateTime.local().setZone(Config.TIMEZONE).isValid) {
      throw new Error(`Invalid timezone: ${Config.TIMEZONE}`);
    }
  }

  private static resolveStoragePath(): string {
    const storagePath = process.env.STORAGE_PATH || './data/subscribers.json';

    // Ensure the path has a filename and extension
    if (storagePath.endsWith('/') || !path.extname(storagePath)) {
      return path.join(storagePath, 'subscribers.json');
    }

    return storagePath;
  }

  private static parseNotificationTime(): number {
    const time = parseInt(process.env.NOTIFICATION_TIME || '7', 10);

    if (isNaN(time) || time < 0 || time > 23) {
      throw new Error('NOTIFICATION_TIME must be between 0 and 23');
    }

    return time;
  }
}
