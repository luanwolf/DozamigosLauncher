import { z } from 'zod';

export const accountDataSchema = z.object({
  displayName: z.string(),
  accountId: z.string(),
  deviceId: z.string(),
  secret: z.string(),
  /** Visual nickname in the launcher only — does not change Epic display name. */
  alias: z.string().optional(),
  /** Free-form labels for grouping accounts in bulk tools. */
  tags: z.array(z.string()).optional()
});

export const accountDataFileSchema = z.object({
  activeAccountId: z.string().optional(),
  accounts: z.array(accountDataSchema)
});
