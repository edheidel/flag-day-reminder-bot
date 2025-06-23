import { Telegraf } from 'telegraf';
import { IService } from './types/types';
import { DynamicDatesService } from './services/DynamicDatesService';
import { SubscriberService } from './services/SubscriberService';
import { FlagDayService } from './services/FlagDayService';
import { NotificationService } from './services/NotificationService';
import { HttpServerService } from './services/HttpServerService';
import { Config } from './config/Config';
import { Logger } from './utils/Logger';

export class ServicesInitializer implements IService {
  private readonly services = new Map<string, any>();
  private readonly bot: Telegraf;

  constructor(bot: Telegraf) {
    this.bot = bot;
  }

  async start(): Promise<void> {
    try {
      // Services that don't depend on others
      const dynamicDatesService = new DynamicDatesService();
      const subscriberService = new SubscriberService(Config.STORAGE_PATH);

      await subscriberService.initialize();

      // Services that depend on others
      const flagDayService = new FlagDayService(dynamicDatesService);
      const notificationService = new NotificationService(
        this.bot,
        flagDayService,
        subscriberService,
      );

      // HTTP Server service
      const httpServerService = new HttpServerService(Config.HTTP_PORT, subscriberService);

      // Register services
      this.services.set('IDynamicDatesService', dynamicDatesService);
      this.services.set('ISubscriberService', subscriberService);
      this.services.set('IFlagDayService', flagDayService);
      this.services.set('INotificationService', notificationService);
      this.services.set('HttpServerService', httpServerService);

      // Start services that implement IService
      for (const [name, service] of this.services) {
        if (this.isServiceType(service)) {
          await service.start();
          Logger.info('Service started', { name });
        }
      }
    } catch (error) {
      Logger.error('Failed to start services', error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    const serviceStops: Promise<void>[] = [];

    for (const [name, service] of this.services) {
      if (this.isServiceType(service)) {
        serviceStops.push(
          service.stop()
            .then(() => Logger.info('Service stopped', { name }))
            .catch((error) => Logger.error('Failed to stop service', { name, error })),
        );
      }
    }

    await Promise.all(serviceStops);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);

    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    return service as T;
  }

  private isServiceType(service: any): service is IService {
    return typeof service.start === 'function'
      && typeof service.stop === 'function';
  }
}
