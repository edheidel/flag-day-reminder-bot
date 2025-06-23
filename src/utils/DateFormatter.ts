/**
 * Formats day and month to Latvian format (DD.MM)
 */
export class DateFormatter {
  static formatLatvianDate(day: number, month: number): string {
    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`;
  }
}