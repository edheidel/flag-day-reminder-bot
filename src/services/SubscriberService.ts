import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { ISubscriberService } from '../types/types';
import { Logger } from '../utils/Logger';

export class SubscriberService implements ISubscriberService {
  private subscribers: Set<number> = new Set();
  private readonly storagePath: string;
  private actualStoragePath: string;
  private initialized = false;
  private fileWatcher: fsSync.FSWatcher | null = null;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
    this.actualStoragePath = storagePath;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.resolveStoragePath();
      await this.ensureDirectoryExists();
      await this.loadSubscribers();
      this.setupFileWatcher();
      this.initialized = true;
    } catch (error) {
      Logger.error('Failed to initialize subscriber service', error);
      throw error;
    }
  }

  private setupFileWatcher(): void {
    try {
      if (this.fileWatcher) {
        this.fileWatcher.close();
      }

      this.fileWatcher = fsSync.watch(this.actualStoragePath, (eventType) => {
        if (eventType === 'change') {
          Logger.info('Subscribers file changed externally, reloading data');
          void this.loadSubscribers().catch((err) =>
            Logger.error('Failed to reload subscribers after file change', err));
        }
      });

      Logger.info(`File watcher set up for ${this.actualStoragePath}`);
    } catch (error) {
      Logger.error('Failed to set up file watcher', error);
    }
  }

  private async resolveStoragePath(): Promise<void> {
    try {
      const stats = await fs.stat(this.storagePath);

      if (stats.isDirectory()) {
        Logger.warn(`Storage path ${this.storagePath} is a directory, using default file name`);
        this.actualStoragePath = path.join(this.storagePath, 'subscribers.json');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        Logger.warn(`Error checking storage path: ${(error as Error).message}`);
      }
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    const directory = path.dirname(this.actualStoragePath);

    await fs.mkdir(directory, { recursive: true });
  }

  private async loadSubscribers(): Promise<void> {
    try {
      const data = await fs.readFile(this.actualStoragePath, 'utf-8');
      const subscribersArray: number[] = JSON.parse(data);

      this.subscribers = new Set(subscribersArray);
      Logger.info(`Loaded ${this.subscribers.size} subscribers from ${this.actualStoragePath}`);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code !== 'ENOENT') {
        Logger.error(`Error reading subscribers file: ${nodeError.message}`, nodeError);
        throw error;
      }

      // File doesn't exist yet, create it
      Logger.info(`Subscribers file not found at ${this.actualStoragePath}, creating empty file`);
      await this.saveSubscribers();
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async saveSubscribers(): Promise<void> {
    const subscribersArray = Array.from(this.subscribers);

    try {
      await fs.writeFile(
        this.actualStoragePath,
        JSON.stringify(subscribersArray, null, 2),
        'utf-8',
      );
      Logger.info(`Saved ${subscribersArray.length} subscribers to ${this.actualStoragePath}`);
    } catch (error) {
      Logger.error(`Failed to save subscribers to ${this.actualStoragePath}`, error);
      throw error;
    }
  }

  async addSubscriber(chatId: number): Promise<boolean> {
    await this.ensureInitialized();
    if (this.subscribers.has(chatId)) {
      return false;
    }

    this.subscribers.add(chatId);
    await this.saveSubscribers();

    return true;
  }

  async removeSubscriber(chatId: number): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.subscribers.has(chatId)) {
      return false;
    }

    this.subscribers.delete(chatId);
    await this.saveSubscribers();

    return true;
  }

  async isSubscribed(chatId: number): Promise<boolean> {
    await this.ensureInitialized();

    return this.subscribers.has(chatId);
  }

  async getAllSubscribers(): Promise<number[]> {
    await this.ensureInitialized();

    return Array.from(this.subscribers);
  }

  async getSubscriberCount(): Promise<number> {
    await this.ensureInitialized();

    return this.subscribers.size;
  }

  stop(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
      Logger.info('File watcher closed');
    }
  }
}
