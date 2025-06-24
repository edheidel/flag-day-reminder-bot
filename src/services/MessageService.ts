import { DateTime } from 'luxon';
import { FlagDay, DynamicDate } from '../types/types';
import { DateFormatter } from '../utils/DateFormatter';

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

      message += `${flagDay.type === 'mourning' ? '🏴' : '🇱🇻'} *${dateStr}* - ${flagDay.description}\n`;
    }

    return message;
  }

  static buildReminderMessage(flagDayInfo: FlagDay | DynamicDate, today: DateTime): string {
    const dateStr = DateFormatter.formatLatvianDate(today.day, today.month);
    const baseMessage = `Šodien, ${dateStr} - ${flagDayInfo.description}.`;

    return flagDayInfo.type === 'normal'
      ? `${baseMessage} Izkarat Latvijas valsts karogu!`
      : `${baseMessage} Izkarat Latvijas valsts karogu ar melnu sēru lenti!`;
  }

  static buildHelpMessage(): string {
    return '*Latvijas karoga izkāršanas dienu atgādinātājs*\n\n'
      + 'Komandas:\n'
      + '/start - Sākt darbu ar botu\n'
      + '/list - Parādīt karoga dienu sarakstu\n'
      + '/subscribe - Abonēt karoga dienu atgādinājumus\n'
      + '/unsubscribe - Atcelt karoga dienu atgādinājumus\n'
      + '/help - Parādīt šo palīdzības ziņojumu';
  }
}
