import { DateTime } from 'luxon';

import { DynamicDate, FlagDay, type IFlagDayService, type ISubscriberService } from '../types/types';
import { DateFormatter } from '../utils/DateFormatter';
import { WikipediaLinkBuilder } from '../utils/WikipediaLinkBuilder';

export class MessageService {
  static buildFlagDaysMessage(flagDays: (FlagDay | DynamicDate)[], year: number): string {
    if (flagDays.length === 0) {
      return 'Nav atrasta neviena karoga diena.';
    }

    const sortedDays = [...flagDays].sort((a, b) => {
      if (a.month !== b.month) {
        return a.month - b.month;
      }

      return a.day - b.day;
    });

    let message = `*Latvijas valsts karoga izkāršanas dienas ${year}. gadā:*\n\n`;

    for (const flagDay of sortedDays) {
      const dateStr = DateFormatter.formatLatvianDate(flagDay.day, flagDay.month);
      const descriptionWithLink = WikipediaLinkBuilder.createMarkdownLink(flagDay.description);
      message += `${flagDay.type === 'mourning' ? '🏴' : '🇱🇻'} *${dateStr}* - ${descriptionWithLink}\n`;
    }

    return message;
  }

  static buildReminderMessage(
    flagDayInfo: FlagDay | DynamicDate,
    today: DateTime,
    flagDayService: IFlagDayService,
  ): string {
    const dateStr = DateFormatter.formatLatvianDate(today.day, today.month);
    const descriptionWithLink = WikipediaLinkBuilder.createMarkdownLink(flagDayInfo.description);
    const baseMessage = `Šodien, *${dateStr}* - ${descriptionWithLink}.`;

    let reminderMessage = flagDayInfo.type === 'normal'
      ? `🇱🇻 ${baseMessage}\n🫡 Izkarat Latvijas valsts karogu!`
      : `🏴 ${baseMessage}\n🫡 Izkarat Latvijas valsts karogu ar melnu sēru lenti!`;

    // Add next flag day information
    const nextFlagDay = flagDayService.getNextFlagDay();
    if (nextFlagDay) {
      const nextDateStr = DateFormatter.formatLatvianDate(
        nextFlagDay.flagDay.day,
        nextFlagDay.flagDay.month,
      );
      const nextDescriptionWithLink = WikipediaLinkBuilder.createMarkdownLink(nextFlagDay.flagDay.description);
      reminderMessage += `\n\n⏭️ Nākamā karoga diena: *${nextDateStr}* - ${nextDescriptionWithLink}`;
    }

    return reminderMessage;
  }

  static async buildHealthMessage(subscriberService: ISubscriberService): Promise<string> {
    const subscriberCount = await subscriberService.getSubscriberCount();
    const uptime = process.uptime();

    return '*Bot Health Status*\n\n'
      + `- Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m\n`
      + `- Subscribers: ${subscriberCount}\n`
      + `- Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`;
  }
}
