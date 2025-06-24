import { DateTime } from 'luxon';
import { FlagDay, DynamicDate, IFlagDayService, IDynamicDatesService } from '../types/types';
import { Config } from '../config/config';

export class FlagDayService implements IFlagDayService {
  private static readonly STATIC_FLAG_DAYS: Readonly<FlagDay[]> = Object.freeze([
    { month: 5, day: 1, type: 'normal', description: 'Latvijas Republikas Satversmes sapulces sasaukšanas diena' },
    { month: 5, day: 4, type: 'normal', description: 'Latvijas Republikas Neatkarības deklarācijas pasludināšanas diena' },
    { month: 6, day: 14, type: 'mourning', description: 'Komunistiskā genocīda upuru piemiņas diena' },
    { month: 6, day: 17, type: 'mourning', description: 'Latvijas Republikas okupācijas diena' },
    { month: 6, day: 23, type: 'normal', description: 'Līgo diena' },
    { month: 6, day: 24, type: 'normal', description: 'Jāņu diena' },
    { month: 7, day: 4, type: 'mourning', description: 'Ebreju tautas genocīda upuru piemiņas diena' },
    { month: 11, day: 11, type: 'normal', description: 'Lāčplēša diena' },
    { month: 11, day: 18, type: 'normal', description: 'Latvijas Republikas proklamēšanas diena' },
    { month: 3, day: 25, type: 'mourning', description: 'Komunistiskā genocīda upuru piemiņas diena' },
  ]);

  private readonly yearlyCache = new Map<number, (FlagDay | DynamicDate)[]>();
  private todayCache: { date: string; result: FlagDay | DynamicDate | null } | null = null;

  constructor(private readonly dynamicDatesService: IDynamicDatesService) {}

  /**
   * Returns all flag days for a year with caching.
   */
  getAllFlagDaysForYear(year: number): (FlagDay | DynamicDate)[] {
    if (this.yearlyCache.has(year)) {
      return this.yearlyCache.get(year)!;
    }

    const allDays: (FlagDay | DynamicDate)[] = [...FlagDayService.STATIC_FLAG_DAYS];
    const dynamicDates = this.dynamicDatesService.getDynamicDatesForYear(year);

    allDays.push(...dynamicDates);
    this.yearlyCache.set(year, allDays);

    return allDays;
  }

  /**
   * Optimized check for today's flag day with caching.
   */
  getFlagDayToday(): FlagDay | DynamicDate | null {
    const today = DateTime.local({ zone: Config.TIMEZONE });
    const todayKey = today.toISODate();

    if (this.todayCache?.date === todayKey) {
      return this.todayCache.result;
    }

    // Check static days first (most common case)
    for (const dayInfo of FlagDayService.STATIC_FLAG_DAYS) {
      if (today.month === dayInfo.month && today.day === dayInfo.day) {
        this.todayCache = { date: todayKey, result: dayInfo };

        return dayInfo;
      }
    }

    // Check dynamic dates
    const dynamicDate = this.dynamicDatesService.getDynamicDateForToday(
      today.month, today.day, today.year,
    );

    this.todayCache = { date: todayKey, result: dynamicDate };

    return dynamicDate;
  }
}
