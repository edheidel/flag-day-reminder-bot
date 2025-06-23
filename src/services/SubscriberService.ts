import type { ISubscriberService } from '../types/types';
import { Logger } from '../utils/Logger';
import { StorageService } from './StorageService';

export class SubscriberService implements ISubscriberService {
  private subscribers: Set<number> = new Set();
  private readonly storage: StorageService;

  constructor(storagePath: string) {
    this.storage = new StorageService(storagePath);
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
    const savedSubscribers = await this.storage.readSubscribers();

    this.subscribers = new Set(savedSubscribers);
    Logger.info('Subscriber service initialized', { subscriberCount: this.subscribers.size });
  }

  async addSubscriber(chatId: number): Promise<boolean> {
    if (this.subscribers.has(chatId)) {
      Logger.debug('Subscription attempt for existing subscriber', { chatId });

      return false;
    }

    this.subscribers.add(chatId);
    await this.storage.writeSubscribers([...this.subscribers]);
    Logger.info('New subscriber added', { chatId, totalSubscribers: this.subscribers.size });

    return true;
  }

  async removeSubscriber(chatId: number): Promise<boolean> {
    if (!this.subscribers.has(chatId)) {
      Logger.debug('Unsubscribe attempt for non-existent subscriber', { chatId });

      return false;
    }

    this.subscribers.delete(chatId);
    await this.storage.writeSubscribers([...this.subscribers]);
    Logger.info('Subscriber removed', { chatId, totalSubscribers: this.subscribers.size });

    return true;
  }

  getAllSubscribers(): number[] {
    return [...this.subscribers];
  }

  isSubscribed(chatId: number): boolean {
    return this.subscribers.has(chatId);
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }
}
