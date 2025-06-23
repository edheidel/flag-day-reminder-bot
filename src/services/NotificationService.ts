import { Telegraf } from 'telegraf';
import { DateTime } from 'luxon';
import { INotificationService, IFlagDayService, ISubscriberService } from '../types/types';
import { DateFormatter } from '../utils/DateFormatter';

export class NotificationService implements INotificationService {
  private readonly logger = console;

  constructor(
    private readonly bot: Telegraf,
    private readonly flagDayService: IFlagDayService,
    private readonly subscriberService: ISubscriberService
  ) {}

  private buildReminderMessage(flagDayInfo: any, today: DateTime): string {
    // Use Latvian date format
    const dateStr = DateFormatter.formatLatvianDate(today.day, today.month);
    const baseMessage = `Šodien, ${dateStr} - ${flagDayInfo.description}.`;

    return flagDayInfo.type === 'normal'
      ? `${baseMessage} Izkarat Latvijas valsts karogu!`
      : `${baseMessage} Izkarat Latvijas valsts karogu ar melnu sēru lenti!`;
  }

  async sendReminders(): Promise<void> {
    const startTime = Date.now();
    this.logger.info('Starting flag day reminder check...');

    try {
      const [flagDayInfo, subscribers] = await Promise.all([
        this.flagDayService.getFlagDayToday(),
        this.subscriberService.getAllSubscribers()
      ]);

      if (!flagDayInfo) {
        this.logger.info('No flag day today');
        return;
      }

      if (subscribers.length === 0) {
        this.logger.info('No subscribers to notify');
        return;
      }

      const today = DateTime.local({ zone: 'Europe/Riga' });
      const reminderMessage = this.buildReminderMessage(flagDayInfo, today);

      this.logger.info(`Sending reminders to ${subscribers.length} subscribers for: ${flagDayInfo.description}`);

      // Batch processing for better performance with many subscribers
      const batchSize = 50; // Telegram rate limiting consideration
      const batches: number[][] = [];

      for (let i = 0; i < subscribers.length; i += batchSize) {
        batches.push(subscribers.slice(i, i + batchSize));
      }

      let successCount = 0;
      let errorCount = 0;

      for (const batch of batches) {
        const batchPromises = batch.map(async (chatId) => {
          try {
            await this.bot.telegram.sendMessage(chatId, reminderMessage);
            successCount++;
            return { success: true, chatId };
          } catch (error: any) {
            errorCount++;
            if (error.response?.error_code === 403) {
              this.logger.warn(`Bot blocked by user ${chatId}, removing subscriber`);
              await this.subscriberService.removeSubscriber(chatId);
            } else {
              this.logger.error(`Failed to send reminder to ${chatId}: ${error.message}`);
            }
            return { success: false, chatId, error };
          }
        });

        await Promise.allSettled(batchPromises);

        // Rate limiting: small delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const duration = Date.now() - startTime;
      this.logger.info(`Reminder sending completed in ${duration}ms. Success: ${successCount}, Errors: ${errorCount}`);

    } catch (error) {
      this.logger.error('Error during reminder sending:', error);
    }
  }
}