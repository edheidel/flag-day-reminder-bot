import { DateTime } from 'luxon';

import { Config } from '../config/config';

import type { DynamicDate, IDynamicDatesService } from '../types/types';

export class DynamicDatesService implements IDynamicDatesService {
  private readonly yearCache = new Map<number, DynamicDate[]>();

  getDynamicDatesForYear(year: number): DynamicDate[] {
    if (this.yearCache.has(year)) {
      return this.yearCache.get(year)!;
    }

    const easterDate = this.calculateEaster(year);
    const goodFriday = easterDate.minus({ days: 2 });
    const firstSundayDec = this.calculateFirstSundayOfDecember(year);
    const dynamicDates: DynamicDate[] = [
      {
        month: goodFriday.month,
        day: goodFriday.day,
        year,
        type: 'normal',
        description: 'Lielā Piektdiena',
      },
      {
        month: easterDate.month,
        day: easterDate.day,
        year,
        type: 'normal',
        description: 'Lieldienas',
      },
    ];

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

  private calculateEaster(year: number): DateTime {
    // Butcher-Meeus algorithm for calculating Easter
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return DateTime.local(year, month, day, { zone: Config.TIMEZONE });
  }
}
