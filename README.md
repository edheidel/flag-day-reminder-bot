# Flag Reminder Bot

A Telegram bot that reminds about Latvia's flag days.

## Features

- Daily reminders for flag days at 7:00 AM (Europe/Riga)
- Subscription management
- Complete flag day calendar
- Automatic first Sunday of December calculation

## Commands

- `/start` - Start the bot
- `/list` - View flag day calendar
- `/subscribe` - Subscribe to daily reminders
- `/unsubscribe` - Unsubscribe from reminders
- `/status` - Check subscription status

## Setup

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file with your bot token:
   ```
   BOT_TOKEN=your_bot_token_here
   ```
4. Run in development mode: `npm run dev`

## Environment Variables

- `BOT_TOKEN` - Telegram bot token (required)
- `NOTIFICATION_TIME` - Hour for daily notifications (default: 7)
- `TIMEZONE` - Timezone for notifications (default: Europe/Riga)
- `ENV` - Environment name (development/production)
- `STORAGE_PATH` - Path for storing subscriber data

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Adding Dynamic Dates

To add special dates (elections, referendums), edit the `DynamicDatesService.ts` file directly and add dates in the constructor:

```typescript
// In DynamicDatesService constructor
await this.addDynamicDate({
  year: 2025,
  month: 10,
  day: 15,
  type: 'normal',
  category: 'election',
  description: 'Vēlēšanu diena'
});
```