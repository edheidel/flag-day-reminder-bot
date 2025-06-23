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

export interface IService {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface ISubscriberService {
  addSubscriber(chatId: number): Promise<boolean>;
  removeSubscriber(chatId: number): Promise<boolean>;
  getAllSubscribers(): number[];
  isSubscribed(chatId: number): boolean;
  getSubscriberCount(): number;
}

export interface IDynamicDatesService {
  addDynamicDate(date: DynamicDate): boolean;
  removeDynamicDate(year: number, month: number, day: number, category: string): boolean;
  getDynamicDatesForYear(year: number): DynamicDate[];
  getDynamicDateForToday(month: number, day: number, year: number): DynamicDate | null;
}

export interface IFlagDayService {
  getAllFlagDaysForYear(year: number): (FlagDay | DynamicDate)[];
  getFlagDayToday(): FlagDay | DynamicDate | null;
}

export interface INotificationService {
  sendReminders(): Promise<void>;
}

type HealthStatus = 'UP' | 'DOWN' | 'DEGRADED';

interface ServerDetails {
  uptime: number;
  activeConnections: number;
}

interface StorageDetails {
  subscriberCount: number;
}

type ComponentDetails = {
  server: ServerDetails;
} & {
  storage: StorageDetails;
}

interface ComponentHealth {
  status: HealthStatus;
  details?: Partial<ComponentDetails>[keyof ComponentDetails];
}

export interface HealthCheckResult {
  status: HealthStatus;
  components: {
    [K in keyof ComponentDetails]?: ComponentHealth;
  };
  timestamp: string;
}

interface TelegramError extends Error {
  response?: {
    error_code: number;
    description: string;
  };
}

export interface SendResult {
  success: boolean;
  chatId: number;
  error?: TelegramError;
}
