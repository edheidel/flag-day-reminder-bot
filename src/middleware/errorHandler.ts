import { Context, MiddlewareFn } from 'telegraf';

import { Logger } from '../utils/Logger';

export const errorHandler: MiddlewareFn<Context> = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    Logger.error('Bot error', error);
    try {
      await ctx.reply('Diemžēl radās kļūda. Lūdzu, mēģiniet vēlreiz vēlāk.');
    } catch (replyError) {
      Logger.error('Failed to send error message', replyError);
    }
  }
};
