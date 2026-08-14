import { z } from 'zod';
import { SidebarItems, type SidebarItem } from '$lib/constants/sidebar';
import { locales } from '$lib/paraglide/runtime';

export const appSettingsSchema = z
  .object({
    language: z.enum(locales).nullish(),
    gamePath: z.string(),
    launchArguments: z.string(),
    missionCheckInterval: z.number().positive(),
    claimRewardsDelay: z.number().positive(),
    userAgent: z.string(),
    discordStatus: z.boolean(),
    hideToTray: z.boolean(),
    openAtStartup: z.boolean(),
    debugLogs: z.boolean(),
    /** Native OS toast notifications (Windows, macOS, Linux). */
    windowsNotifications: z.boolean(),
    /** First-run setup finished (or skipped) — hides the welcome screen. */
    onboardingDone: z.boolean()
  })
  .partial();

export const customizableMenuSchema = z
  .object(
    Object.fromEntries(SidebarItems.map((x) => [x.id, z.boolean().optional()])) as {
      [K in SidebarItem['id']]: z.ZodOptional<z.ZodBoolean>;
    }
  )
  .optional();

export const allSettingsSchema = z
  .object({
    app: appSettingsSchema,
    customizableMenu: customizableMenuSchema
  })
  .partial();

export const automationSettingSchema = z.object({
  accountId: z.string(),
  autoKick: z.boolean().optional(),
  autoClaim: z.boolean().optional(),
  autoTransferMaterials: z.boolean().optional(),
  autoInvite: z.boolean().optional()
});

export const automationSettingsSchema = z.array(automationSettingSchema);

export const deviceAuthsSettingsSchema = z.array(
  z.object({
    deviceId: z.string(),
    customName: z.string()
  })
);


export const parsedAppSchema = z.object({
  id: z.string(),
  title: z.string(),
  images: z.object({
    tall: z.string(),
    wide: z.string()
  }),
  requiresRepair: z.boolean().optional(),
  hasUpdate: z.boolean().optional(),
  downloadSize: z.number().optional(),
  installSize: z.number(),
  installed: z.boolean().optional(),
  canRunOffline: z.boolean()
});

export const queueItemSchema = z.object({
  status: z.enum(['queued', 'downloading', 'completed', 'failed', 'paused']),
  item: parsedAppSchema,
  installTags: z.array(z.string()).optional(),
  addedAt: z.number(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional()
});

export const downloaderSettingsSchema = z
  .object({
    downloadPath: z.string(),
    autoUpdate: z.boolean(),
    sendNotifications: z.boolean(),
    favoriteApps: z.array(z.string()),
    hiddenApps: z.array(z.string()),
    perAppAutoUpdate: z.record(z.string(), z.boolean()),
    queue: z.record(z.string(), z.array(queueItemSchema))
  })
  .partial();
