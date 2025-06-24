import { Context, MiddlewareFn } from 'telegraf';
import { Logger } from '../utils/Logger';

export const loggerMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  const startTime = Date.now();
  const updateType = ctx.updateType;
  const chatId = ctx.chat?.id;
  const username = ctx.from?.username;

  Logger.info('Received update', { updateType, chatId, username });

  await next();

  Logger.info('Response time', { ms: Date.now() - startTime, updateType, chatId });
};
