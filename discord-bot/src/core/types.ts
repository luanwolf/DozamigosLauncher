import { z } from 'zod';

export const accountDataSchema = z.object({
  displayName: z.string(),
  accountId: z.string(),
  deviceId: z.string(),
  secret: z.string()
});

export type AccountData = z.infer<typeof accountDataSchema>;

export type DeviceAuthData = {
  accountId: string;
  deviceId: string;
  secret: string;
};

export type EpicTokenType = 'eg1' | 'bearer';

export type EpicOAuthData = {
  access_token: string;
  expires_in: number;
  token_type: string;
  client_id: string;
  internal_client: boolean;
  product_id: string;
  application_id: string;
};

export type EpicDeviceAuthLoginData = EpicOAuthData & {
  account_id: string;
  displayName: string;
  app: string;
  in_app_id: string;
  device_id: string;
};

export type EpicExchangeCodeData = { code: string; expiresInSeconds: number };
export type EpicExchangeCodeLoginData = EpicDeviceAuthLoginData;

export type EpicDeviceAuthData = {
  deviceId: string;
  accountId: string;
  secret: string;
  userAgent: string;
  created: { location: string; ipAddress: string; dateTime: string };
};
