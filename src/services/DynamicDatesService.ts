import { DynamicDate, IDynamicDatesService } from '../types/types';

export class DynamicDatesService implements IDynamicDatesService {
  private readonly dynamicDates = new Map<string, DynamicDate>();
  private readonly yearIndex = new Map<number, DynamicDate[]>();
  private readonly logger = console;

  private generateKey(year: number, month: number, day: number, category: string): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${category}`;
  }

  private updateYearIndex(date: DynamicDate, isAddition: boolean): void {
    const existing = this.yearIndex.get(date.year) || [];

    if (isAddition) {
      existing.push(date);
      this.yearIndex.set(date.year, existing);
    } else {
      const filtered = existing.filter((d) =>
        !(d.month === date.month && d.day === date.day && d.category === date.category),
      );

      if (filtered.length > 0) {
        this.yearIndex.set(date.year, filtered);
      } else {
        this.yearIndex.delete(date.year);
      }
    }
  }

  addDynamicDate(date: DynamicDate): boolean {
    const key = this.generateKey(date.year, date.month, date.day, date.category);

    if (!this.dynamicDates.has(key)) {
      this.dynamicDates.set(key, date);
      this.updateYearIndex(date, true);
      this.logger.info(`Dynamic date added: ${date.description} on ${date.day}.${date.month}.${date.year}`);

      return true;
    }

    return false;
  }

  removeDynamicDate(year: number, month: number, day: number, category: string): boolean {
    const key = this.generateKey(year, month, day, category);
    const date = this.dynamicDates.get(key);

    if (date && this.dynamicDates.delete(key)) {
      this.updateYearIndex(date, false);
      this.logger.info(`Dynamic date removed: ${day}.${month}.${year} (${category})`);

      return true;
    }

    return false;
  }

  getDynamicDatesForYear(year: number): DynamicDate[] {
    return this.yearIndex.get(year) || [];
  }

  getDynamicDateForToday(month: number, day: number, year: number): DynamicDate | null {
    // Check all categories for this date
    const categories = ['election', 'referendum', 'special'];

    for (const category of categories) {
      const key = this.generateKey(year, month, day, category);
      const date = this.dynamicDates.get(key);

      if (date) {
        return date;
      }
    }

    return null;
  }
}
