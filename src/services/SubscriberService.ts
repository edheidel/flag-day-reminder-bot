import * as fs from 'fs/promises';
import * as path from 'path';

import { Config } from '../config/config';
import { ISubscriberService } from '../types/types';
import { Logger } from '../utils/Logger';

export class SubscriberService implements ISubscriberService {
  private subscribers: Set<number> = new Set();
  private readonly storagePath: string;
  private initialized = false;

  constructor() {
    // Ensure we always work with a file path
    this.storagePath = path.join(Config.STORAGE_PATH, 'subscribers.json');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      await this.loadSubscribers();
      this.initialized = true;
      Logger.info(`SubscriberService initialized with ${this.subscribers.size} subscribers`, {
        storagePath: this.storagePath,
      });
    } catch (error) {
      Logger.error('Failed to initialize subscriber service', error);
      throw error;
    }
  }

  private async loadSubscribers(): Promise<void> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      const subscribersArray: number[] = JSON.parse(data);
      this.subscribers = new Set(subscribersArray);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, start with empty set
        await this.saveSubscribers();
      } else {
        throw error;
      }
    }
  }

  private async saveSubscribers(): Promise<void> {
    const subscribersArray = Array.from(this.subscribers);
    await fs.writeFile(this.storagePath, JSON.stringify(subscribersArray, null, 2), 'utf-8');
  }

  async addSubscriber(chatId: number): Promise<boolean> {
    if (this.subscribers.has(chatId)) return false;

    this.subscribers.add(chatId);
    await this.saveSubscribers();
    Logger.info(`Subscriber added: ${chatId} (total: ${this.subscribers.size})`);

    return true;
  }

  async removeSubscriber(chatId: number): Promise<boolean> {
    if (!this.subscribers.has(chatId)) {
      return false;
    }

    this.subscribers.delete(chatId);
    await this.saveSubscribers();
    Logger.info(`Subscriber removed: ${chatId} (total: ${this.subscribers.size})`);

    return true;
  }

  public async isSubscribed(chatId: number): Promise<boolean> {
    try {
      const subscribers = await this.getAllSubscribers();

      return subscribers.includes(chatId);
    } catch (error) {
      Logger.error('Error checking subscription status', error);

      return false;
    }
  }

  async getAllSubscribers(): Promise<number[]> {
    return Array.from(this.subscribers);
  }

  async getSubscriberCount(): Promise<number> {
    return this.subscribers.size;
  }

  getStoragePath(): string {
    return this.storagePath;
  }

  stop(): void {
    Logger.info('SubscriberService stopped');
  }
}
