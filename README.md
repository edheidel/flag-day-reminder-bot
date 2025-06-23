# Latvia Flag Day Reminder Bot

A Telegram bot that reminds about Latvia's flag days.

## Features

- Daily reminders for flag days at 8:00 AM (Europe/Riga)
- Subscription management
- Complete flag day calendar
- Automatic first Sunday of December calculation

## Commands

- `/start` - Start the bot
- `/flagdays` - View flag day calendar
- `/subscribe` - Subscribe to daily reminders
- `/unsubscribe` - Unsubscribe from reminders
- `/status` - Check subscription status
- `/help` - Show help

## Setup

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file with your bot token:
   ```
   BOT_TOKEN=your_bot_token_here
   ```
4. Run in development mode: `npm run dev`

### Deployment

#### Railway

1. Push your code to GitHub
2. Connect Railway to your GitHub repository
3. Set environment variable in Railway dashboard:
   - `BOT_TOKEN` = your bot token
4. Deploy automatically

#### Other Platforms

Set the following environment variable:
- `BOT_TOKEN` - Your Telegram bot token from @BotFather

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