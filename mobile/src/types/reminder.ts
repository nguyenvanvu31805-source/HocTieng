export interface ReminderSettings {
  enabled: boolean;
  reminderTime: string;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  reminderTime: '19:00',
};

export const AVAILABLE_REMINDER_TIMES = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '12:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
];
