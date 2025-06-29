import { DateTime } from 'luxon';

import { Config } from '../config/config';

import type { DynamicDate, IDynamicDatesService } from '../types/types';

export class DynamicDatesService implements IDynamicDatesService {
  private readonly yearCache = new Map<number, DynamicDate[]>();

  getDynamicDatesForYear(year: number): DynamicDate[] {
    if (this.yearCache.has(year)) {
      return this.yearCache.get(year)!;
    }

    const firstSundayDec = this.calculateFirstSundayOfDecember(year);
    const dynamicDates: DynamicDate[] = [];

    if (firstSundayDec) {
      dynamicDates.push({
        month: firstSundayDec.month,
        day: firstSundayDec.day,
        year,
        type: 'mourning',
        description: 'Komunistiskā režīma upuru piemiņas diena',
      });
    }

    this.yearCache.set(year, dynamicDates);

    return dynamicDates;
  }

  getDynamicDateForToday(month: number, day: number, year: number): DynamicDate | null {
    const dynamicDates = this.getDynamicDatesForYear(year);

    return dynamicDates.find((date) => date.month === month && date.day === day) || null;
  }

  private calculateFirstSundayOfDecember(year: number): DateTime | null {
    const firstDecember = DateTime.local(year, 12, 1, { zone: Config.TIMEZONE });
    const daysToAdd = firstDecember.weekday === 7 ? 0 : (7 - firstDecember.weekday) % 7;
    const firstSunday = firstDecember.plus({ days: daysToAdd });

    return firstSunday.month === 12 ? firstSunday : null;
  }
}
