import * as cron from 'node-cron';
import { DateTime } from 'luxon';
import { Telegraf } from 'telegraf';
import { IFlagDayService, ISubscriberService, BotContext } from '../types/types';
import { MessageService } from './MessageService';
import { Logger } from '../utils/Logger';
import { Config } from '../config/config';

export class NotificationService {
  private cronJob: cron.ScheduledTask | null = null;

  constructor(
    private readonly bot: Telegraf<BotContext>,
    private readonly flagDayService: IFlagDayService,
    private readonly subscriberService: ISubscriberService,
  ) {}

  start(): void {
    this.cronJob = cron.schedule(
      `0 ${Config.NOTIFICATION_TIME} * * *`,
      () => void this.sendNotifications(),
      { timezone: Config.TIMEZONE },
    );

    Logger.info('Notification scheduler started', {
      time: Config.NOTIFICATION_TIME,
      timezone: Config.TIMEZONE,
    });
  }

  stop(): void {
    if (this.cronJob) {
      void this.cronJob.stop();
      this.cronJob = null;
      Logger.info('Notification scheduler stopped');
    }
  }

  async sendNotifications(): Promise<void> {
    const startTime = Date.now();

    Logger.info('Starting flag day reminder check...');

    try {
      const flagDayInfo = this.flagDayService.getFlagDayToday();

      if (!flagDayInfo) {
        Logger.info('No flag day today');

        return;
      }

      const subscribers = await this.subscriberService.getAllSubscribers();

      if (subscribers.length === 0) {
        Logger.info('No subscribers to notify');

        return;
      }

      const today = DateTime.local({ zone: Config.TIMEZONE });
      const reminderMessage = MessageService.buildReminderMessage(flagDayInfo, today);

      Logger.info(`Sending reminders to ${subscribers.length} subscribers for: ${flagDayInfo.description}`);

      const results = await Promise.allSettled(
        subscribers.map((chatId) => this.sendMessage(chatId, reminderMessage)),
      );

      const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
      const errorCount = results.filter((r) => r.status === 'rejected' || !r.value?.success).length;

      const duration = Date.now() - startTime;

      Logger.info(`Reminder sending completed in ${duration}ms. Success: ${successCount}, Errors: ${errorCount}`);
    } catch (error) {
      Logger.error('Error during reminder sending', error);
    }
  }

  private async sendMessage(chatId: number, message: string): Promise<{success: boolean, chatId: number}> {
    try {
      await this.bot.telegram.sendMessage(chatId, message);

      return { success: true, chatId };
    } catch (error) {
      const telegramError = error as { response?: { error_code: number } };

      if (telegramError.response?.error_code === 403) {
        Logger.warn(`Bot blocked by user ${chatId}, removing subscriber`);
        await this.subscriberService.removeSubscriber(chatId);
      } else {
        Logger.error(`Failed to send reminder to ${chatId}`, error);
      }

      return { success: false, chatId };
    }
  }
}
