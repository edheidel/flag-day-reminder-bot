import { Telegraf, session } from 'telegraf';

import { Config } from './config/config';
import { errorHandler } from './middleware/errorHandler';
import { loggerMiddleware } from './middleware/loggerMiddleware';
import { CommandProcessor } from './processors/CommandProcessor';
import { DynamicDatesService } from './services/DynamicDatesService';
import { FlagDayService } from './services/FlagDayService';
import { HealthService } from './services/HealthService';
import { NotificationService } from './services/NotificationService';
import { SubscriberService } from './services/SubscriberService';
import { BotContext } from './types/types';
import { Logger } from './utils/Logger';

let bot: Telegraf<BotContext> | null = null;
let notificationScheduler: NotificationService | null = null;
let healthServer: HealthService | null = null;
let subscriberService: SubscriberService | null = null;

async function shutdown(signal: string): Promise<void> {
  Logger.warn('Shutting down application', { signal });

  try {
    if (healthServer) {
      healthServer.stop();
    }

    if (notificationScheduler) {
      notificationScheduler.stop();
    }

    if (subscriberService) {
      subscriberService.stop();
    }

    if (bot) {
      bot.stop();
    }
  } catch (error) {
    Logger.error('Error during shutdown', error as Error);
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.exit(signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1);
  }
}

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception', error);
  void shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled Rejection', reason as Error);
  void shutdown('UNHANDLED_REJECTION');
});

async function main(): Promise<void> {
  try {
    Config.validate();
    bot = new Telegraf<BotContext>(Config.BOT_TOKEN);

    // Set up middleware
    bot.use(errorHandler);
    bot.use(loggerMiddleware);
    bot.use(session());

    // Initialize services
    const dynamicDatesService = new DynamicDatesService();
    const flagDayService = new FlagDayService(dynamicDatesService);
    subscriberService = new SubscriberService();
    await subscriberService.initialize();
    const commandProcessor = new CommandProcessor(bot, flagDayService, subscriberService);
    commandProcessor.registerCommands();
    notificationScheduler = new NotificationService(bot, flagDayService, subscriberService);
    notificationScheduler.start();
    healthServer = new HealthService(subscriberService);
    healthServer.start();

    try {
      await bot.launch();
      Logger.info('Bot launched in polling mode successfully');
    } catch (launchError) {
      Logger.error('Failed to start bot', launchError as Error);
      throw launchError;
    }

    Logger.info('Bot started successfully', {
      env: Config.ENV,
      subscribers: await subscriberService.getSubscriberCount(),
      storagePath: subscriberService.getStoragePath(),
    });

    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (error) {
    Logger.error('Failed to start application', error as Error);
    await shutdown('STARTUP_FAILURE');
  }
}

void main();
