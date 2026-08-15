import { openCardPacks, type CardPackOffer } from '$lib/modules/free-llamas';
import { composeMCP, queryProfile } from '$lib/modules/mcp';
import {
  currencyMatchesPreference,
  DEFAULT_AUTO_LLAMA_PREFS,
  extractPrerollGrantTemplates,
  isLegendaryOrMythicSurvivorTemplate,
  llamaContainsLegendaryMythicSurvivor,
  type AutoLlamaCurrency,
  type AutoLlamaPrefs
} from '$lib/modules/stw-auto-llama-parse';
import { fetchStwStore, purchaseStwOffer } from '$lib/modules/stw-catalog';
import type { AccountData } from '$types/account';
import type { FullQueryProfile } from '$types/game/mcp';
import type { StwStoreOffer } from '$types/game/stw-store';

export type { AutoLlamaCurrency, AutoLlamaPrefs };
export {
  currencyMatchesPreference,
  extractPrerollGrantTemplates,
  isLegendaryOrMythicSurvivorTemplate,
  llamaContainsLegendaryMythicSurvivor
};

export function readAutoLlamaPrefs(): AutoLlamaPrefs {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_AUTO_LLAMA_PREFS };
  try {
    const raw = localStorage.getItem('autoLlamaPrefs');
    if (!raw) return { ...DEFAULT_AUTO_LLAMA_PREFS };
    return { ...DEFAULT_AUTO_LLAMA_PREFS, ...(JSON.parse(raw) as Partial<AutoLlamaPrefs>) };
  } catch {
    return { ...DEFAULT_AUTO_LLAMA_PREFS };
  }
}

export function writeAutoLlamaPrefs(prefs: AutoLlamaPrefs) {
  localStorage.setItem('autoLlamaPrefs', JSON.stringify(prefs));
}

export async function populatePrerollProfile(account: AccountData) {
  return composeMCP<FullQueryProfile<'campaign'>>(account, 'PopulatePrerolledOffers', 'campaign', {});
}

export async function claimFreeAndOptionalSurvivorBuys(account: AccountData, prefs = readAutoLlamaPrefs()) {
  const populate = await populatePrerollProfile(account);
  const profile = populate.profileChanges[0].profile;
  const freePacks: CardPackOffer[] = Object.entries(profile.items)
    .filter(([, item]) => item.templateId.startsWith('CardPack:'))
    .map(([id, item]) => ({ id, templateId: item.templateId }));

  let opened = 0;
  let bought = 0;

  if (freePacks.length) {
    await openCardPacks(
      account,
      freePacks.map((pack) => pack.id)
    );
    opened = freePacks.length;
  }

  if (!prefs.buySurvivorLlamas || prefs.maxBuysPerRun < 1) {
    return { opened, bought };
  }

  const [campaign, commonCore] = await Promise.all([
    queryProfile(account, 'campaign'),
    queryProfile(account, 'common_core')
  ]);
  const store = await fetchStwStore(account, campaign.profileChanges[0].profile, commonCore.profileChanges[0].profile);
  const llamaSection = store.sections.find((section) => section.id === 'CardPackStorePreroll');
  if (!llamaSection) return { opened, bought };

  const candidates = llamaSection.offers.filter((offer) => {
    if (offer.ownedHeroGrant) return false;
    if (offer.price.finalPrice <= 0) return false;
    if (!currencyMatchesPreference(offer.price.currencySubType, prefs.currency)) return false;
    const grants = offer.grants.map((grant) => grant.templateId);
    // Paid preroll cards often grant the CardPack itself; inspect attributes via store title/grants when possible.
    return llamaContainsLegendaryMythicSurvivor(grants) || /survivor|worker/i.test(offer.title);
  });

  for (const offer of candidates.slice(0, prefs.maxBuysPerRun)) {
    await purchaseAndOpen(account, offer);
    bought++;
  }

  return { opened, bought };
}

async function purchaseAndOpen(account: AccountData, offer: StwStoreOffer) {
  return purchaseStwOffer(account, offer, 1);
}
