import 'dotenv/config';
import { Telegraf } from 'telegraf';
import * as cron from 'node-cron';
import { Container } from './container';
import { CommandHandlers } from './handlers/CommandHandlers';
import { INotificationService } from './types/types';

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('CRITICAL ERROR: BOT_TOKEN environment variable is not set');
  process.exit(1);
}

async function main() {
  if (!BOT_TOKEN) return;

  const bot = new Telegraf(BOT_TOKEN);
  const container = new Container(bot);
  const commandHandlers = new CommandHandlers(container);

  // Register all commands
  commandHandlers.registerCommands(bot);

  // Setup scheduler
  const notificationService = container.get<INotificationService>('INotificationService');
  cron.schedule('0 7 * * *', async () => {
    await notificationService.sendReminders();
  }, { timezone: 'Europe/Riga' });

  console.log('Daily reminders scheduled for 7:00 AM (Europe/Riga)');

  // Start bot
  await bot.launch();
  console.log(`✅ Latvia Flag Day Reminder Bot started successfully`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Daily reminders scheduled for 8:00 AM (Europe/Riga)`);

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`${signal} received. Stopping bot...`);
    bot.stop(signal);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(error => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});