import { ISubscriberService } from '../types/types';

export class SubscriberService implements ISubscriberService {
  private readonly subscribers = new Set<number>();
  private readonly logger = console;

  async addSubscriber(chatId: number): Promise<boolean> {
    if (!this.subscribers.has(chatId)) {
      this.subscribers.add(chatId);
      this.logger.info(`Subscriber added: ${chatId}`);
      return true;
    }
    return false;
  }

  async removeSubscriber(chatId: number): Promise<boolean> {
    if (this.subscribers.delete(chatId)) {
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