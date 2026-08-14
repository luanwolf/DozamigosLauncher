export type IntegrationStatus = 'integrated' | 'linkOnly' | 'needsLogin' | 'needsApiKey';

export type IntegrationDescriptionKey =
  | 'externalIntegrations.items.fortniteGg'
  | 'externalIntegrations.items.fortniteDb'
  | 'externalIntegrations.items.statsBr'
  | 'externalIntegrations.items.creatorCode'
  | 'externalIntegrations.items.statsProxy'
  | 'externalIntegrations.items.eosLocker';

export type ExternalIntegration = {
  id: string;
  category: 'sites' | 'fortniteApi' | 'epic' | 'local';
  name: string;
  descriptionKey: IntegrationDescriptionKey;
  status: IntegrationStatus;
  href?: string;
  docsUrl?: string;
  siteUrl?: string;
};

export const EXTERNAL_INTEGRATIONS: ExternalIntegration[] = [
  {
    id: 'fortnite-gg',
    category: 'sites',
    name: 'fortnite.gg',
    descriptionKey: 'externalIntegrations.items.fortniteGg',
    status: 'linkOnly',
    siteUrl: 'https://fortnite.gg/shop'
  },
  {
    id: 'fortnitedb',
    category: 'sites',
    name: 'FortniteDB',
    descriptionKey: 'externalIntegrations.items.fortniteDb',
    status: 'linkOnly',
    siteUrl: 'https://fortnitedb.com/'
  },
  {
    id: 'stats-br',
    category: 'fortniteApi',
    name: 'Stats BR',
    descriptionKey: 'externalIntegrations.items.statsBr',
    status: 'needsApiKey',
    href: '/br-stw/stats',
    docsUrl: 'https://fortnite-api.com/documentation'
  },
  {
    id: 'creator-code',
    category: 'fortniteApi',
    name: 'Creator Code',
    descriptionKey: 'externalIntegrations.items.creatorCode',
    status: 'integrated',
    href: '/br-stw/support-creator',
    docsUrl: 'https://fortnite-api.com/documentation'
  },
  {
    id: 'stats-proxy',
    category: 'epic',
    name: 'Stats Proxy',
    descriptionKey: 'externalIntegrations.items.statsProxy',
    status: 'needsLogin',
    href: '/br-stw/stats'
  },
  {
    id: 'eos-locker',
    category: 'local',
    name: 'Locker',
    descriptionKey: 'externalIntegrations.items.eosLocker',
    status: 'integrated',
    href: '/br-stw/locker'
  }
];

export const INTEGRATION_CATEGORIES = ['sites', 'fortniteApi', 'epic', 'local'] as const;
