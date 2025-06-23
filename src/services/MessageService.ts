import { FlagDay, DynamicDate } from '../types/types';
import { DateFormatter } from '../utils/DateFormatter';

export class MessageService {
  private static readonly MESSAGE_TEMPLATES = {
    FLAG_DAYS_HEADER: (year: number) => `Saraksts ar dienām, kad jāizkar Latvijas valsts karogs (${year}. gads):\n\n`,
    NORMAL_DAYS_HEADER: '🗓️ *Svinamās dienas (parastais karogs):*\n',
    MOURNING_DAYS_HEADER: '\n⚫ *Sēru dienas (karogs ar melnu lenti):*\n',
    DAY_ENTRY: (day: number, month: number, description: string) =>
      `  - ${DateFormatter.formatLatvianDate(day, month)}: ${description}\n`
  };

  /**
   * Efficiently builds flag days message using StringBuilder pattern.
   */
  static buildFlagDaysMessage(flagDays: (FlagDay | DynamicDate)[], year: number): string {
    const parts: string[] = [];
    parts.push(this.MESSAGE_TEMPLATES.FLAG_DAYS_HEADER(year));

    // Separate and sort for consistent display
    const normalDays = flagDays.filter(d => d.type === 'normal')
      .sort((a, b) => a.month !== b.month ? a.month - b.month : a.day - b.day);
    const mourningDays = flagDays.filter(d => d.type === 'mourning')
      .sort((a, b) => a.month !== b.month ? a.month - b.month : a.day - b.day);

    // Build normal days section
    if (normalDays.length > 0) {
      parts.push(this.MESSAGE_TEMPLATES.NORMAL_DAYS_HEADER);
      normalDays.forEach(d => {
        parts.push(this.MESSAGE_TEMPLATES.DAY_ENTRY(d.day, d.month, d.description));
      });
    }

    // Build mourning days section
    if (mourningDays.length > 0) {
      parts.push(this.MESSAGE_TEMPLATES.MOURNING_DAYS_HEADER);
      mourningDays.forEach(d => {
        parts.push(this.MESSAGE_TEMPLATES.DAY_ENTRY(d.day, d.month, d.description));
      });
    }

    return parts.join('');
  }

  static buildHelpMessage(): string {
    return `*Pieejamās komandas:*

/start - Sākt darbu ar botu
/flagdays - Apskatīt karoga dienu sarakstu
/subscribe - Abonēt ikdienas atgādinājumus
/unsubscribe - Atteikties no atgādinājumiem
/status - Apskatīt savu statusu
/help - Šis palīdzības saraksts`;
  }
}