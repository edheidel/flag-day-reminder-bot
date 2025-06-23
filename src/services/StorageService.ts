import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/Logger';

export class StorageService {
  private readonly subscribersPath: string;
  private readonly storagePath: string;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
    this.subscribersPath = path.join(storagePath, 'subscribers.json');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure storage directory exists
      await fs.mkdir(this.storagePath, { recursive: true });

      // Check if subscribers file exists, if not create it with empty array
      try {
        await fs.access(this.subscribersPath);
      } catch {
        await this.writeSubscribers([]);
      }

      Logger.info('Storage service initialized', {
        storagePath: this.storagePath,
        subscribersPath: this.subscribersPath,
      });
    } catch (error) {
      Logger.error('Failed to initialize storage', error);
      throw error;
    }
  }

  async readSubscribers(): Promise<number[]> {
    try {
      const data: string = await fs.readFile(this.subscribersPath, 'utf-8');

      return JSON.parse(data);
    } catch (error) {
      Logger.error('Failed to read subscribers', error);
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async writeSubscribers(subscribers: number[]): Promise<void> {
    try {
      // Atomic write to prevent data corruption
      const tempPath = `${this.subscribersPath}.tmp`;

      await fs.writeFile(tempPath, JSON.stringify(subscribers, null, 2));
      await fs.rename(tempPath, this.subscribersPath);
    } catch (error) {
      Logger.error('Failed to write subscribers', error);
      throw error;
    }
  }
}
