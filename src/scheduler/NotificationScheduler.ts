import * as cron from 'node-cron';
import { DateTime } from 'luxon';
import { INotificationService, IService } from '../types/types';
import { Config } from '../config/Config';
import { Logger } from '../utils/Logger';

export class NotificationScheduler implements IService {
  private cronJob: cron.ScheduledTask | null = null;

  constructor(private readonly notificationService: INotificationService) {}

  public start(): Promise<void> {
    const notificationHour = Config.NOTIFICATION_TIME;
    const cronExpression = `0 ${notificationHour} * * *`;

    Logger.info(`Setting up notification scheduler for ${notificationHour}:00 (${Config.TIMEZONE})`);
    this.cronJob = cron.schedule(cronExpression, async () => {
      Logger.info(`Running scheduled notification at ${DateTime.now().setZone(Config.TIMEZONE).toISO()}`);
      await this.notificationService.sendReminders();
    }, { timezone: Config.TIMEZONE });

    Logger.info('Notification scheduler initialized');

    return Promise.resolve();
  }

  public stop(): Promise<void> {
    if (this.cronJob) {
      void this.cronJob.stop();
      Logger.info('Notification scheduler stopped');
    }

    return Promise.resolve();
  }
}
