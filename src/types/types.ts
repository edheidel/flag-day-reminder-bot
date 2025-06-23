export interface FlagDay {
  month: number;
  day: number;
  type: 'normal' | 'mourning';
  description: string;
}

export interface DynamicDate extends FlagDay {
  year: number;
  category: 'election' | 'referendum' | 'special';
}

export interface ISubscriberService {
  addSubscriber(chatId: number): Promise<boolean>;
  removeSubscriber(chatId: number): Promise<boolean>;
  getAllSubscribers(): Promise<number[]>;
  isSubscribed(chatId: number): Promise<boolean>;
  getSubscriberCount(): Promise<number>;
}

export interface IDynamicDatesService {
  addDynamicDate(date: DynamicDate): Promise<boolean>;
  removeDynamicDate(year: number, month: number, day: number, category: string): Promise<boolean>;
  getDynamicDatesForYear(year: number): Promise<DynamicDate[]>;
  getDynamicDateForToday(month: number, day: number, year: number): Promise<DynamicDate | null>;
}

export interface IFlagDayService {
  getAllFlagDaysForYear(year: number): Promise<(FlagDay | DynamicDate)[]>;
  getFlagDayToday(): Promise<FlagDay | DynamicDate | null>;
}

export interface INotificationService {
  sendReminders(): Promise<void>;
}