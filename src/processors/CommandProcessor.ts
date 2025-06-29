import { Markup, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';

import { MessageService } from '../services/MessageService';
import { DateFormatter } from '../utils/DateFormatter';
import { Logger } from '../utils/Logger';
import { WikipediaLinkBuilder } from '../utils/WikipediaLinkBuilder';

import type { BotContext, IFlagDayService, ISubscriberService, MessageOptions } from '../types/types';
import type { InlineKeyboardMarkup } from 'telegraf/types';

export class CommandProcessor {
  constructor(
    private readonly bot: Telegraf<BotContext>,
    private readonly flagDayService: IFlagDayService,
    private readonly subscriberService: ISubscriberService,
  ) {}

  registerCommands(): void {
    void this.setBotCommands();

    this.bot.start(this.handleStartCommand.bind(this));

    // Register both callback actions and commands with the same handlers
    const commands = ['list', 'subscribe', 'unsubscribe', 'menu', 'next'];
    commands.forEach((cmd) => {
      this.bot.action(cmd === 'list' ? 'list_flag_days' : cmd === 'menu' ? 'main_menu' : cmd, this.getHandler(cmd));
      this.bot.command(cmd, this.getHandler(cmd));
    });

    this.bot.command('health', this.handleHealthCommand.bind(this));
    this.bot.on(message('text'), this.handleUnknownCommand.bind(this));
  }

  private async setBotCommands(): Promise<void> {
    try {
      await this.bot.telegram.setMyCommands([
        { command: 'start', description: 'Sākt darbu ar botu' },
        { command: 'menu', description: 'Parādīt galveno izvēlni' },
        { command: 'list', description: 'Parādīt karoga dienas' },
        { command: 'next', description: 'Parādīt nākamo karoga dienu' },
        { command: 'subscribe', description: 'Abonēt atgādinājumus' },
        { command: 'unsubscribe', description: 'Atcelt abonementu' },
      ]);
    } catch (error) {
      Logger.error('Failed to set bot commands', error);
    }
  }

  private getHandler(command: string) {
    const handlers = {
      list: this.handleListCommand.bind(this),
      subscribe: this.handleSubscribeCommand.bind(this),
      unsubscribe: this.handleUnsubscribeCommand.bind(this),
      menu: this.handleMainMenuCommand.bind(this),
      next: this.handleNextCommand.bind(this),
    };

    return handlers[command as keyof typeof handlers];
  }

  private async handleStartCommand(ctx: BotContext): Promise<void> {
    const isSubscribed = await this.subscriberService.isSubscribed(ctx.chat?.id || 0);
    const welcomeMessage = 'Sveiki! Es esmu Latvijas karoga izkāršanas dienu atgādinātājs.\n\nSaskaņā ar Satversmes tiesas lēmumu, kas stājās spēkā 2015. gadā, pilsoņiem ir sagaidāms izkārt karogu svētku dienās, taču par tā neizkāršanu sods netiek piemērots. Plašāku informāciju vari atrast šeit: [https://lvportals.lv/skaidrojumi/277720-privatpersonas-nevar-sodit-par-valsts-karoga-neizkarsanu-2016](https://lvportals.lv/skaidrojumi/277720-privatpersonas-nevar-sodit-par-valsts-karoga-neizkarsanu-2016).';

    await ctx.reply(
      welcomeMessage,
      {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
        reply_markup: this.getMainMenuKeyboard(isSubscribed),
      },
    );

  }

  private async handleUnknownCommand(ctx: BotContext): Promise<void> {
    // Check if message exists and has text property
    if (ctx.message && 'text' in ctx.message && ctx.message.text?.startsWith('/')) {
      const isSubscribed = await this.subscriberService.isSubscribed(ctx.chat?.id || 0);
      await ctx.reply(
        'Nezināma komanda.',
        { reply_markup: this.getMainMenuKeyboard(isSubscribed) },
      );
    }
  }

  private getMainMenuKeyboard(isSubscribed: boolean): InlineKeyboardMarkup {
    const subscriptionButton = isSubscribed
      ? Markup.button.callback('🔕 Atcelt abonementu', 'unsubscribe')
      : Markup.button.callback('🔔 Abonēt atgādinājumus', 'subscribe');

    return Markup.inlineKeyboard([
      [subscriptionButton],
      [Markup.button.callback('📅 Karoga dienas', 'list_flag_days')],
      [Markup.button.callback('➡️ Nākamā karoga diena', 'next')],
    ]).reply_markup;
  }

  private getBackToMenuKeyboard(): InlineKeyboardMarkup {
    return Markup.inlineKeyboard([[Markup.button.callback('⬅️ Atpakaļ uz izvēlni', 'main_menu')]]).reply_markup;
  }

  private async sendResponse(
    ctx: BotContext,
    message: string,
    options: MessageOptions = {},
    callbackText?: string,
  ): Promise<void> {
    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: options.parse_mode,
        reply_markup: options.reply_markup,
      });
      if (callbackText) {
        await ctx.answerCbQuery(callbackText);
      } else {
        await ctx.answerCbQuery();
      }
    } else {
      await ctx.reply(message, options);
    }
  }

  private async handleError(ctx: BotContext, error: unknown, errorMessage: string, logPrefix: string): Promise<void> {
    Logger.error(logPrefix, error);
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery(errorMessage);
    } else {
      await ctx.reply(errorMessage);
    }
  }

  private async handleMainMenuCommand(ctx: BotContext): Promise<void> {
    try {
      const isSubscribed = await this.subscriberService.isSubscribed(ctx.chat?.id || 0);
      await this.sendResponse(ctx, 'Izvēlieties darbību:', {
        reply_markup: this.getMainMenuKeyboard(isSubscribed),
      });
    } catch (error) {
      await this.handleError(ctx, error, 'Kļūda ielādējot izvēlni.', 'Error in handleMainMenuCommand');
    }
  }

  private async handleListCommand(ctx: BotContext): Promise<void> {
    try {
      const year = new Date().getFullYear();
      const flagDays = this.flagDayService.getAllFlagDaysForYear(year);
      const message = MessageService.buildFlagDaysMessage(flagDays, year);

      await this.sendResponse(ctx, message, {
        parse_mode: 'Markdown',
        reply_markup: this.getBackToMenuKeyboard(),
        link_preview_options: { is_disabled: true },
      });
    } catch (error) {
      await this.handleError(ctx, error, 'Kļūda iegūstot karoga dienas.', 'Error in handleListCommand');
    }
  }

  private async handleNextCommand(ctx: BotContext): Promise<void> {
    try {
      const nextFlagDayInfo = this.flagDayService.getNextFlagDay();
      if (nextFlagDayInfo) {
        const { flagDay, year } = nextFlagDayInfo;
        const { day, month, description, type } = flagDay;
        const dateStr = `${DateFormatter.formatLatvianDate(day, month)}, ${year}`;
        const descriptionWithLink = WikipediaLinkBuilder.createMarkdownLink(description);
        const message = `${type === 'mourning' ? '🏴' : '🇱🇻'} Nākamā karoga diena:\n\n*${dateStr}* - ${descriptionWithLink}`;

        await this.sendResponse(ctx, message, {
          parse_mode: 'Markdown',
          reply_markup: this.getBackToMenuKeyboard(),
        });
      } else {
        await this.sendResponse(ctx, 'Neizdevās atrast nākamo karoga dienu.', {
          reply_markup: this.getBackToMenuKeyboard(),
        });
      }
    } catch (error) {
      await this.handleError(ctx, error, 'Kļūda iegūstot nākamo karoga dienu.', 'Error in handleNextCommand');
    }
  }

  private async handleSubscribeCommand(ctx: BotContext): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    try {
      const added = await this.subscriberService.addSubscriber(chatId);

      if (ctx.session) {
        ctx.session.subscribed = true;
      }

      const count = await this.subscriberService.getSubscriberCount();
      const message = added
        ? `✅ Abonements aktivizēts! Jūs tagad saņemsiet atgādinājumus par karoga dienām.\nKopā abonentu: ${count}`
        : '✅ Jūs jau esat abonējis atgādinājumus.';

      await this.sendResponse(ctx, message, {
        reply_markup: this.getBackToMenuKeyboard(),
      }, 'Abonements aktivizēts!');
    } catch (error) {
      await this.handleError(ctx, error, 'Kļūda abonējot atgādinājumus.', 'Error in handleSubscribeCommand');
    }
  }

  private async handleUnsubscribeCommand(ctx: BotContext): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    try {
      const removed = await this.subscriberService.removeSubscriber(chatId);

      if (ctx.session) {
        ctx.session.subscribed = false;
      }

      const message = removed ? '🔕 Abonements atcelts.' : '❌ Jūs neesat abonējis atgādinājumus.';
      const callbackText = removed ? 'Abonements atcelts!' : 'Jūs neesat abonējis';

      await this.sendResponse(ctx, message, {
        reply_markup: this.getBackToMenuKeyboard(),
      }, callbackText);
    } catch (error) {
      await this.handleError(ctx, error, 'Kļūda atceļot abonementu.', 'Error in handleUnsubscribeCommand');
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
