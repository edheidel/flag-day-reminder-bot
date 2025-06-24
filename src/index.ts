import * as dotenv from 'dotenv';
dotenv.config();

import { Telegraf, session } from 'telegraf';
import { BotContext } from './types/types';
import { Config } from './config/config';
import { Logger } from './utils/Logger';
import { DynamicDatesService } from './services/DynamicDatesService';
import { SubscriberService } from './services/SubscriberService';
import { FlagDayService } from './services/FlagDayService';
import { NotificationService } from './services/NotificationService';
import { CommandProcessor } from './processors/CommandProcessor';
import { HttpServerService } from './services/HttpServerService';
import { errorHandler } from './middleware/errorHandler';
import { loggerMiddleware } from './middleware/loggerMiddleware';

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception', error);
  void shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled Rejection', reason as Error);
  void shutdown('UNHANDLED_REJECTION');
});

let bot: Telegraf<BotContext> | null = null;
let notificationScheduler: NotificationService | null = null;
let httpServer: HttpServerService | null = null;
let subscriberService: SubscriberService | null = null;

async function shutdown(signal: string): Promise<void> {
  Logger.warn('Shutting down application', { signal });

  try {
    // Stop services in reverse order of dependency
    if (httpServer) {
      await httpServer.stop().catch((err) =>
        Logger.error('Error stopping HTTP server', err));
    }

    if (notificationScheduler) {
      notificationScheduler.stop();
    }

    if (subscriberService) {
      subscriberService.stop();
    }

    if (bot) {
      try {
        bot.stop();
      } catch (botError) {
        if ((botError as Error).message !== 'Bot is not running!') {
          Logger.error('Error stopping bot', botError as Error);
        }
      }
    }
  } catch (error) {
    Logger.error('Error during shutdown', error as Error);
  } finally {
    // Give some time for logs to flush
    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.exit(signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1);
  }
}

async function main(): Promise<void> {
  try {
    // Validate configuration
    Config.validate();

    // Initialize the bot
    bot = new Telegraf<BotContext>(Config.BOT_TOKEN);

    // Initialize services
    const dynamicDatesService = new DynamicDatesService();

    subscriberService = new SubscriberService(Config.STORAGE_PATH);
    const flagDayService = new FlagDayService(dynamicDatesService);

    await subscriberService.initialize();

    // Set up middleware
    bot.use(errorHandler);
    bot.use(loggerMiddleware);
    bot.use(session());

    // Register commands using the CommandProcessor
    const commandProcessor = new CommandProcessor(bot, flagDayService, subscriberService);

    commandProcessor.registerCommands();

    // Set up notification scheduler
    notificationScheduler = new NotificationService(bot, flagDayService, subscriberService);
    notificationScheduler.start();

    // Set up the HTTP server for health checks
    httpServer = new HttpServerService(Config.HTTP_PORT, subscriberService);
    await httpServer.start();

    // Set up webhook in production, polling in development
    if (Config.ENV === 'production') {
      // Configure webhook for Fly.io
      const webhookDomain = process.env.WEBHOOK_DOMAIN;

      if (!webhookDomain) {
        throw new Error('WEBHOOK_DOMAIN environment variable is required in production');
      }

      Logger.info('Starting bot in webhook mode', { webhookDomain, port: Config.HTTP_PORT });
      void bot.telegram.setWebhook(`${webhookDomain}/bot${Config.BOT_TOKEN}`);

      await bot.launch({
        webhook: {
          domain: webhookDomain,
          port: Config.HTTP_PORT,
          hookPath: `/bot${Config.BOT_TOKEN}`,
        },
      });
    } else {
      // Use polling in development
      Logger.info('Starting bot in polling mode');
      await bot.launch();
    }

    Logger.info('Bot started successfully', {
      env: Config.ENV,
      notificationTime: Config.NOTIFICATION_TIME,
      timezone: Config.TIMEZONE,
    });

    // Register shutdown handlers
    process.once('SIGINT', () => { void shutdown('SIGINT'); });
    process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
  } catch (error) {
    Logger.error('Failed to start application', error as Error);
    await shutdown('STARTUP_FAILURE');
  }
}

void main();
