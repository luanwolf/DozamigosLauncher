import { z } from 'zod';
import {
  allSettingsSchema,
  appSettingsSchema,
  automationSettingSchema,
  automationSettingsSchema,
  customizableMenuSchema,
  deviceAuthsSettingsSchema,
  downloaderSettingsSchema
} from '$lib/schemas/settings';

export type AppSettings = z.infer<typeof appSettingsSchema>;
export type CustomizableMenuSettings = z.infer<typeof customizableMenuSchema>;
export type AllSettings = z.infer<typeof allSettingsSchema>;
export type AutomationSetting = z.infer<typeof automationSettingSchema>;
export type AutomationSettings = z.infer<typeof automationSettingsSchema>;
export type DeviceAuthsSettings = z.infer<typeof deviceAuthsSettingsSchema>;
export type DownloaderSettings = z.infer<typeof downloaderSettingsSchema>;
