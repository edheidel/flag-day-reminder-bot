import * as dotenv from 'dotenv';
dotenv.config();

import { Telegraf } from 'telegraf';
import { Config } from './config/Config';
import { Logger } from './utils/Logger';
import { ServicesInitializer } from './ServicesInitializer';
import { CommandHandler } from './handlers/CommandHandler';

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception', error);
  void shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled Rejection', reason as Error);
  void shutdown('UNHANDLED_REJECTION');
});

let services: ServicesInitializer | null = null;

async function shutdown(signal: string): Promise<void> {
  Logger.warn('Shutting down application', { signal });

  if (services) {
    try {
      await services.stop();
    } catch (error) {
      Logger.error('Error during shutdown', error as Error);
    }
  }

  setTimeout(() => process.exit(1), 1000);
}

async function main(): Promise<void> {
  try {
    Config.validate();
    const bot = new Telegraf(Config.BOT_TOKEN);

    services = new ServicesInitializer(bot);
    await services.start();
    const commandHandler = new CommandHandler(services);

    commandHandler.registerCommands(bot);
    await bot.launch();
    Logger.info('Bot started successfully');

    process.once('SIGINT', () => { void shutdown('SIGINT'); });
    process.once('SIGTERM', () => { void shutdown('SIGTERM'); });

    Logger.info('Application started successfully', {
      env: Config.ENV,
      notificationTime: Config.NOTIFICATION_TIME,
      timezone: Config.TIMEZONE,
    });
  } catch (error) {
    Logger.error('Failed to start application', error as Error);
    await shutdown('STARTUP_FAILURE');
  }
}

void main();
