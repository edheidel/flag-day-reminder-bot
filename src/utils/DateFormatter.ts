export class DateFormatter {
  private static readonly LATVIAN_MONTHS = [
    'janvāris',
    'februāris',
    'marts',
    'aprīlis',
    'maijs',
    'jūnijs',
    'jūlijs',
    'augusts',
    'septembris',
    'oktobris',
    'novembris',
    'decembris',
  ];

  static formatLatvianDate(day: number, month: number): string {
    return `${day}. ${this.LATVIAN_MONTHS[month - 1]}`;
  }
}
