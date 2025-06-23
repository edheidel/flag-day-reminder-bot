import { promises as fs } from 'fs';
import { join } from 'path';
import { ISubscriberService } from '../types/types';

export class SubscriberService implements ISubscriberService {
  private readonly subscribers = new Set<number>();
  private readonly logger = console;
  private readonly dataDir = process.env.NODE_ENV === 'production'
    ? '/app/data'  // Railway volume mount path
    : 'data';      // Local development path
  private readonly dataFile = join(this.dataDir, 'subscribers.json');

  constructor() {
    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadSubscribers();
    } catch (error) {
      this.logger.error('Failed to initialize storage:', error);
    }
  }

  private async loadSubscribers(): Promise<void> {
    try {
      const data = await fs.readFile(this.dataFile, 'utf-8');
      const subscriberArray = JSON.parse(data);
      subscriberArray.forEach((id: number) => this.subscribers.add(id));
      this.logger.info(`Loaded ${this.subscribers.size} subscribers from ${this.dataDir}`);
    } catch (error) {
      this.logger.info(`No existing subscribers file at ${this.dataFile}, starting fresh`);
    }
  }

  private async saveSubscribers(): Promise<void> {
    try {
      const subscriberArray = Array.from(this.subscribers);
      await fs.writeFile(this.dataFile, JSON.stringify(subscriberArray, null, 2));
      this.logger.info(`Saved ${subscriberArray.length} subscribers to ${this.dataFile}`);
    } catch (error) {
      this.logger.error('Failed to save subscribers:', error);
    }
  }

  async addSubscriber(chatId: number): Promise<boolean> {
    if (!this.subscribers.has(chatId)) {
      this.subscribers.add(chatId);
      await this.saveSubscribers();
      this.logger.info(`Subscriber added: ${chatId}`);
      return true;
    }
    return false;
  }

  async removeSubscriber(chatId: number): Promise<boolean> {
    if (this.subscribers.delete(chatId)) {
      await this.saveSubscribers();
      this.logger.info(`Subscriber removed: ${chatId}`);
      return true;
    }
    return false;
  }

  async getAllSubscribers(): Promise<number[]> {
    return Array.from(this.subscribers);
  }

  async isSubscribed(chatId: number): Promise<boolean> {
    return this.subscribers.has(chatId);
  }

  async getSubscriberCount(): Promise<number> {
    return this.subscribers.size;
  }
}