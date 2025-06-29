export class WikipediaLinkBuilder {
  private static readonly BASE_URL = 'https://lv.wikipedia.org/wiki/';

  /**
   * Special mapping for flag day descriptions that don't follow standard URL patterns
   */
  private static readonly SPECIAL_MAPPINGS: Map<string, string> = new Map([
    ['Ebreju tautas genocīda upuru piemiņas diena', 'Holokausts_Latvijā'],
    ['Komunistiskā režīma upuru piemiņas diena', 'Pret_latviešu_tautu_vērstā_totalitārā_komunistiskā_režīma_genocīda_upuru_piemiņas_diena'],
    ['Konstitucionālā likuma "Par Latvijas Republikas valstisko statusu" pieņemšanas diena', 'Par_Latvijas_Republikas_valstisko_statusu'],
  ]);

  /**
   * Converts flag day description to Wikipedia URL
   */
  static buildWikipediaLink(description: string): string {
    return this.SPECIAL_MAPPINGS.get(description)
      ? `${this.BASE_URL}${this.SPECIAL_MAPPINGS.get(description)}`
      : `${this.BASE_URL}${description.replace(/\s+/g, '_')}`;
  }

  /**
   * Creates a markdown hyperlink for Telegram
   */
  static createMarkdownLink(description: string): string {
    const url = this.buildWikipediaLink(description);

    return `[${description}](${url})`;
  }
}
