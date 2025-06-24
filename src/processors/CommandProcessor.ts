import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';

import { MessageService } from '../services/MessageService';
import { Logger } from '../utils/Logger';

import type { BotContext, IFlagDayService, ISubscriberService } from '../types/types';

export class CommandProcessor {
  constructor(
    private readonly bot: Telegraf<BotContext>,
    private readonly flagDayService: IFlagDayService,
    private readonly subscriberService: ISubscriberService,
  ) {}

  registerCommands(): void {
    this.bot.start(async (ctx) => {
      await ctx.reply('Sveiki! Es esmu Latvijas karoga izkāršanas dienu atgādinātājs. Lietojiet /help lai apskatītu komandas.');
    });

    this.bot.command('list', this.handleListCommand.bind(this));
    this.bot.command('subscribe', this.handleSubscribeCommand.bind(this));
    this.bot.command('unsubscribe', this.handleUnsubscribeCommand.bind(this));
    this.bot.command('help', this.handleHelpCommand.bind(this));
    this.bot.command('health', this.handleHealthCommand.bind(this));

    this.bot.on(message('text'), async (ctx) => {
      if (ctx.message.text.startsWith('/')) {
        await ctx.reply('Nezināma komanda. Izmantojiet /help, lai redzētu pieejamās komandas.');
      }
    });
  }

  private async handleListCommand(ctx: BotContext): Promise<void> {
    try {
      const year = new Date().getFullYear();
      const flagDays = this.flagDayService.getAllFlagDaysForYear(year);
      const message = MessageService.buildFlagDaysMessage(flagDays, year);
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      Logger.error('Error in handleListCommand', error);
      await ctx.reply('Kļūda iegūstot karoga dienas.');
    }
  }

  private async handleSubscribeCommand(ctx: BotContext): Promise<void> {
    const chatId = ctx.chat?.id;

    if (!chatId) {
      return;
    }

    try {
      const added = await this.subscriberService.addSubscriber(chatId);

      if (ctx.session) {
        ctx.session.subscribed = true;
      }

      const count = await this.subscriberService.getSubscriberCount();
      const message = added
        ? `Abonements aktivizēts! Jūs tagad saņemsiet atgādinājumus par karoga dienām.\nKopā abonentu: ${count}`
        : 'Jūs jau esat abonējis atgādinājumus.';

      await ctx.reply(message);
    } catch (error) {
      Logger.error('Error in handleSubscribeCommand', error);
      await ctx.reply('Kļūda abonējot atgādinājumus.');
    }
  }

  private async handleUnsubscribeCommand(ctx: BotContext): Promise<void> {
    const chatId = ctx.chat?.id;

    if (!chatId) {
      return;
    }

    try {
      const removed = await this.subscriberService.removeSubscriber(chatId);

      if (ctx.session) {
        ctx.session.subscribed = false;
      }

      await ctx.reply(removed ? 'Abonements atcelts.' : 'Jūs neesat abonējis atgādinājumus.');
    } catch (error) {
      Logger.error('Error in handleUnsubscribeCommand', error);
      await ctx.reply('Kļūda atceļot abonementu.');
    }
  }

  private async handleHelpCommand(ctx: BotContext): Promise<void> {
    try {
      await ctx.reply(MessageService.buildHelpMessage(), { parse_mode: 'Markdown' });
    } catch (error) {
      Logger.error('Error in handleHelpCommand', error);
      await ctx.reply('Kļūda ielādējot palīdzības informāciju.');
    }
  }

  private async handleHealthCommand(ctx: BotContext): Promise<void> {
    const isAdmin = ctx.from?.id === parseInt(process.env.ADMIN_ID || '0', 10);

    if (!isAdmin) return;

    try {
      const message = await MessageService.buildHealthMessage(this.subscriberService);
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      Logger.error('Error in handleHealthCommand', error);
      await ctx.reply('Kļūda iegūstot veselības informāciju.');
    }
  }
}
