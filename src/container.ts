import { Telegraf } from 'telegraf';
import { FlagDayService } from './services/FlagDayService';
import { SubscriberService } from './services/SubscriberService';
import { DynamicDatesService } from './services/DynamicDatesService';
import { NotificationService } from './services/NotificationService';

export class Container {
  private readonly services = new Map<string, any>();

  constructor(bot: Telegraf) {
    this.initializeServices(bot);
  }

  private initializeServices(bot: Telegraf): void {
    const dynamicDatesService = new DynamicDatesService();
    const subscriberService = new SubscriberService();
    const flagDayService = new FlagDayService(dynamicDatesService);
    const notificationService = new NotificationService(bot, flagDayService, subscriberService);

    this.services.set('IDynamicDatesService', dynamicDatesService);
    this.services.set('ISubscriberService', subscriberService);
    this.services.set('IFlagDayService', flagDayService);
    this.services.set('INotificationService', notificationService);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service as T;
  }
}