export type EpicAccountById = {
  id: string;
  displayName: string;
  minorVerified: boolean;
  minorStatus: string;
  cabinedMode: boolean;
  externalAuths: ExternalAuths;
  /** Returned when fetching the authenticated user's own account. */
  email?: string;
  emailVerified?: boolean;
  lastLogin?: string;
  /** Present on some Epic account responses; not guaranteed. */
  created?: string;
};

export type EpicExternalAuth = {
  accountId: string;
  type: string;
  externalAuthId?: string;
  externalAuthIdType?: string;
  externalDisplayName?: string;
  dateAdded?: string;
  authIds?: {
    id: string;
    type: string;
  }[];
};

export type EpicAccountByName = {
  id: string;
  displayName: string;
  externalAuths: ExternalAuths;
};

export type EpicAccountSearch = {
  accountId: string;
  matches: Array<{
    value: string;
    platform: string;
  }>;
  matchType: string;
  epicMutuals: number;
  sortPosition: number;
};

type ExternalAuths = Record<
  string,
  {
    accountId: string;
    type: string;
    externalAuthId?: string;
    externalAuthIdType: string;
    externalDisplayName?: string;
    authIds: {
      id: string;
      type: string;
    }[];
  }
>;
