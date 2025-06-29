import * as dotenv from 'dotenv';

dotenv.config();

export class Config {
  static readonly BOT_TOKEN = process.env.BOT_TOKEN!;
  static readonly ENV = process.env.NODE_ENV || 'development';
  static readonly STORAGE_PATH = process.env.STORAGE_PATH || './data';
  static readonly NOTIFICATION_TIME = process.env.NOTIFICATION_TIME || '7';
  static readonly TIMEZONE = process.env.TIMEZONE || 'Europe/Riga';

  static validate(): void {
    if (!this.BOT_TOKEN) {
      throw new Error('BOT_TOKEN environment variable is required');
    }
  }
}
