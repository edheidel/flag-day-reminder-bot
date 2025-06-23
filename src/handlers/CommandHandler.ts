import { Telegraf, Context } from 'telegraf';
import { ServicesInitializer } from '../ServicesInitializer';
import { MessageService } from '../services/MessageService';
import { IFlagDayService, ISubscriberService } from '../types/types';

export class CommandHandler {
  private readonly flagDayService: IFlagDayService;
  private readonly subscriberService: ISubscriberService;

  constructor(servicesInitializer: ServicesInitializer) {
    this.flagDayService = servicesInitializer.get<IFlagDayService>('IFlagDayService');
    this.subscriberService = servicesInitializer.get<ISubscriberService>('ISubscriberService');
  }

  registerCommands(bot: Telegraf): void {
    bot.start(this.handleStart.bind(this));
    bot.command('list', this.handleFlagDays.bind(this));
    bot.command('subscribe', this.handleSubscribe.bind(this));
    bot.command('unsubscribe', this.handleUnsubscribe.bind(this));
    bot.command('status', this.handleStatus.bind(this));
    bot.command('help', this.handleHelp.bind(this));
  }

  private async handleStart(ctx: Context): Promise<void> {
    await ctx.reply('Sveiki! Es esmu Latvijas karoga izkāršanas dienu atgādinātājs. Lietojiet /help lai apskatītu komandas.');
  }

  private async handleFlagDays(ctx: Context): Promise<void> {
    try {
      const year = new Date().getFullYear();
      const flagDays = this.flagDayService.getAllFlagDaysForYear(year);
      const message = MessageService.buildFlagDaysMessage(flagDays, year);

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in handleFlagDays:', error);
      await ctx.reply('Kļūda iegūstot karoga dienas.');
    }
  }

  private async handleSubscribe(ctx: Context): Promise<void> {
    const chatId = ctx.chat!.id;
    const added = await this.subscriberService.addSubscriber(chatId);

    await ctx.reply(added ? 'Abonements aktivizēts!' : 'Jūs jau esat abonējis atgādinājumus.');
  }

  private async handleUnsubscribe(ctx: Context): Promise<void> {
    const chatId = ctx.chat!.id;
    const removed = await this.subscriberService.removeSubscriber(chatId);

    await ctx.reply(removed ? 'Abonements atcelts.' : 'Jūs neesat abonējis atgādinājumus.');
  }

  private async handleStatus(ctx: Context): Promise<void> {
    const chatId = ctx.chat!.id;
    const isSubscribed = this.subscriberService.isSubscribed(chatId);
    const count = this.subscriberService.getSubscriberCount();

    await ctx.reply(`Statuss: ${isSubscribed ? 'Abonēts' : 'Nav abonēts'}\nKopā abonentu: ${count}`);
  }

  private async handleHelp(ctx: Context): Promise<void> {
    await ctx.reply(MessageService.buildHelpMessage(), { parse_mode: 'Markdown' });
  }
}
