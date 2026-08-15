import { fetchAvatars } from '$lib/modules/avatar';
import { queryProfile } from '$lib/modules/mcp';
import { calculateGold, calculateVbucks, calculateXrayTickets } from '$lib/utils';
import type { AccountData } from '$types/account';

class ActiveAccountBalances {
  vbucks = $state<number | null>(null);
  gold = $state<number | null>(null);
  xrayTickets = $state<number | null>(null);
  isLoading = $state(false);

  #loadId = 0;

  async refresh(account: AccountData | null, options?: { refreshAvatar?: boolean }) {
    if (!account) {
      this.vbucks = null;
      this.gold = null;
      this.xrayTickets = null;
      this.isLoading = false;
      return;
    }

    const loadId = ++this.#loadId;
    const accountId = account.accountId;
    this.isLoading = true;

    try {
      const [commonCore, campaign] = await Promise.all([
        queryProfile(account, 'common_core'),
        queryProfile(account, 'campaign'),
        ...(options?.refreshAvatar ? [fetchAvatars(account, [accountId])] : [])
      ]);

      if (loadId !== this.#loadId) return;

      this.vbucks = calculateVbucks(commonCore);
      this.gold = calculateGold(campaign);
      this.xrayTickets = calculateXrayTickets(campaign);
    } catch {
      if (loadId !== this.#loadId) return;

      this.vbucks = null;
      this.gold = null;
      this.xrayTickets = null;
    } finally {
      if (loadId === this.#loadId) {
        this.isLoading = false;
      }
    }
  }
}

export const activeAccountBalances = new ActiveAccountBalances();
