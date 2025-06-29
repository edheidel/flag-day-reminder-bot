import { Context } from 'telegraf';

import type { InlineKeyboardMarkup } from 'telegraf/types';

export interface SessionData {
  subscribed?: boolean;
}

export interface BotContext extends Context {
  session?: SessionData;
}

export type FlagDayType = 'normal' | 'mourning';

export interface FlagDay {
  month: number;
  day: number;
  type: FlagDayType;
  description: string;
}

export interface DynamicDate extends FlagDay {
  year: number;
}

export interface IDynamicDatesService {
  getDynamicDatesForYear(year: number): DynamicDate[];
  getDynamicDateForToday(month: number, day: number, year: number): DynamicDate | null;
}

export interface IFlagDayService {
  getAllFlagDaysForYear(year: number): (FlagDay | DynamicDate)[];
  getFlagDayToday(): FlagDay | DynamicDate | null;
  getNextFlagDay(): { flagDay: FlagDay | DynamicDate; year: number } | null;
}

export interface ISubscriberService {
  initialize(): Promise<void>;
  addSubscriber(chatId: number): Promise<boolean>;
  removeSubscriber(chatId: number): Promise<boolean>;
  isSubscribed(chatId: number): Promise<boolean>;
  getAllSubscribers(): Promise<number[]>;
  getSubscriberCount(): Promise<number>;
  stop(): void;
}

export interface MessageOptions {
  parse_mode?: 'Markdown' | 'HTML';
  reply_markup?: InlineKeyboardMarkup;
  link_preview_options?: {
    is_disabled?: boolean;
  };
}
