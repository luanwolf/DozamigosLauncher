import type { StwTemplateDisplay } from '$lib/utils/stw-template-display';

export type StwCatalogPrice = {
  currency: string;
  currencySubType: string;
  finalPrice: number;
  regularPrice: number;
};

export type StwStoreGrant = {
  templateId: string;
  quantity: number;
  display: StwTemplateDisplay;
};

export type StwPurchaseLimitPeriod = 'event' | 'daily' | 'weekly' | 'monthly' | 'none';

export type StwPurchaseLimit = {
  max: number;
  period: StwPurchaseLimitPeriod;
  purchased: number;
  /** null when unlimited (-1). */
  remaining: number | null;
};

export type StwStoreOffer = {
  offerId: string;
  devName: string;
  title: string;
  storefront: string;
  price: StwCatalogPrice;
  grants: StwStoreGrant[];
  requiredTemplateId?: string;
  limit: StwPurchaseLimit;
  /** Hero grant already in the campaign collection (cannot buy again). */
  ownedHeroGrant?: boolean;
};

export type StwStoreSection = {
  id: string;
  name: string;
  offers: StwStoreOffer[];
};

export type StwStoreData = {
  expiration: string;
  sections: StwStoreSection[];
  balances: Record<string, number>;
};
