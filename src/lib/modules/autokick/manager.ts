import { ConnectionEvents, EpicEvents } from '$lib/constants/events';
import { t } from '$lib/i18n';
import { getChildLogger } from '$lib/logger';
import { autoKickAccounts, updateAutoKickStatus } from '$lib/modules/autokick/base';
import { claimRewards } from '$lib/modules/autokick/claim-rewards';
import { transferBuildingMaterials } from '$lib/modules/autokick/transfer-building-materials';
import { getFriends } from '$lib/modules/friends';
import { queryProfile } from '$lib/modules/mcp';
import { sendNotificationMessage } from '$lib/modules/notification';
import { getParty, invite, kickMember, leaveParty } from '$lib/modules/party';
import { XMPPManager } from '$lib/modules/xmpp';
import { accountStore, settingsStore } from '$lib/storage';
import { partyCache } from '$lib/stores';
import { sleep } from '$lib/utils';
import { get } from 'svelte/store';
import type { AccountData } from '$types/account';
import type { PartyData } from '$types/game/party';

const logger = getChildLogger('AutoKickManager');

type State = 'lobby' | 'mission' | 'endgame';

export class AutoKickManager {
  private abortController = new AbortController();
  private scheduleTimeout?: number;
  private checkerInterval?: number;

  private currentState: State = 'lobby';
  private matchesPlayed?: number;

  private constructor(
    private account: AccountData,
    private xmpp: XMPPManager
  ) {}

  static async new(account: AccountData) {
    const accountId = account.accountId;
    updateAutoKickStatus(accountId, 'LOADING');

    let xmpp: XMPPManager;
    try {
      xmpp = await XMPPManager.new(account, 'autoKick');
    } catch (error) {
      updateAutoKickStatus(accountId, 'INVALID_CREDENTIALS');
      throw error;
    }

    const manager = new AutoKickManager(account, xmpp);
    const signal = manager.abortController.signal;

    xmpp.on(
      ConnectionEvents.SessionStarted,
      async () => {
        updateAutoKickStatus(accountId, 'ACTIVE');

        const state = await manager.checkState();
        manager.currentState = state;
        logger.debug('Initial mission state polled', { accountId, state });

        if (state === 'mission') {
          manager.startMissionChecker();
        }

        if (state === 'endgame') {
          manager.resetState();
          await manager.postMissionActions();
        }
      },
      { signal }
    );

    xmpp.on(
      ConnectionEvents.Disconnected,
      () => {
        updateAutoKickStatus(accountId, 'DISCONNECTED');
        manager.resetState();
      },
      { signal }
    );

    xmpp.on(
      EpicEvents.MemberDisconnected,
      (data) => {
        if (data.account_id !== accountId) return;
        manager.resetState();
      },
      { signal }
    );

    xmpp.on(
      EpicEvents.MemberExpired,
      (data) => {
        if (data.account_id !== accountId) return;
        manager.resetState();
      },
      { signal }
    );

    xmpp.on(
      EpicEvents.MemberJoined,
      (data) => {
        if (data.account_id !== accountId) return;

        logger.debug('Member joined detected', { accountId });
        manager.scheduleMissionChecker(30_000);
      },
      { signal }
    );

    xmpp.on(
      EpicEvents.PartyUpdated,
      async (data) => {
        const partyState = data.party_state_updated?.['Default:PartyState_s'];
        if (partyState === 'PostMatchmaking' && manager.currentState === 'lobby') {
          logger.debug('PostMatchmaking detected');
          manager.scheduleMissionChecker(60_000);
        }
      },
      { signal }
    );

    try {
      await xmpp.connect();
      updateAutoKickStatus(accountId, 'ACTIVE');
    } catch (error) {
      logger.error('XMPP connection failed', { accountId, error });
      updateAutoKickStatus(accountId, 'DISCONNECTED');
    }

    return manager;
  }

  scheduleMissionChecker(timeout: number) {
    logger.debug('Scheduling mission checker', { accountId: this.account.accountId, timeout });

    clearTimeout(this.scheduleTimeout);
    this.scheduleTimeout = window.setTimeout(() => {
      this.startMissionChecker();
    }, timeout);
  }

  startMissionChecker() {
    const interval = (settingsStore.get().app?.missionCheckInterval || 5) * 1000;
    logger.debug('Starting mission checker', { accountId: this.account.accountId, interval });

    clearInterval(this.checkerInterval);
    this.checkerInterval = window.setInterval(async () => {
      const accountId = this.account.accountId;
      const state = await this.checkState();
      const previousState = this.currentState;
      this.currentState = state;

      logger.debug('Mission state polled', { accountId, state });

      if (state === 'endgame') {
        this.resetState();
        await this.postMissionActions();
        return;
      }

      if (state === 'lobby') {
        this.resetState();

        // If the user was kicked, previousState would be 'mission'
        if (previousState === 'mission') {
          await this.postMissionActions();
        }
      }
    }, interval);
  }

  resetState() {
    this.currentState = 'lobby';
    this.matchesPlayed = undefined;

    clearInterval(this.checkerInterval);
    this.checkerInterval = undefined;
    clearTimeout(this.scheduleTimeout);
    this.scheduleTimeout = undefined;
  }

  destroy() {
    this.abortController.abort();
    this.resetState();
    this.xmpp?.removePurpose('autoKick');
  }

  private async checkState(): Promise<State> {
    const party = partyCache.get(this.account.accountId) || (await getParty(this.account)).current[0];
    const partyState = party?.meta['Default:PartyState_s'];
    if (!party || partyState !== 'PostMatchmaking') {
      return 'lobby';
    }

    const campaignProfile = await queryProfile(this.account, 'campaign');
    const newMatchesPlayed = campaignProfile.profileChanges[0].profile.stats.attributes.matches_played;

    if (this.matchesPlayed == null) {
      this.matchesPlayed = newMatchesPlayed;
      return 'mission';
    }

    if (newMatchesPlayed > this.matchesPlayed) {
      this.matchesPlayed = newMatchesPlayed;
      return 'endgame';
    }

    return 'mission';
  }

  private async postMissionActions() {
    const accountId = this.account.accountId;
    const settings = autoKickAccounts.get(accountId)?.settings || {};

    logger.debug('Post-mission actions started', { accountId, settings });

    const partyData = await getParty(this.account);
    const party = partyData.current[0] as PartyData | undefined;

    let kickPromise: Promise<unknown> = Promise.resolve();
    if (settings.autoKick && party) {
      logger.debug('Running auto-kick', { accountId, partyId: party.id });

      kickPromise = this.kick(party)
        .then((left) => {
          if (left) void this.notifyLeftBase();
        })
        .catch((error) => {
          logger.error('Auto-kick failed', { accountId, error });
        });
    }

    if (settings.autoClaim) {
      logger.debug('Running auto-claim rewards', { accountId });

      claimRewards(this.account).catch((error) => {
        logger.error('Auto-claim rewards failed', { accountId, error });
      });
    }

    if (settings.autoTransferMaterials) {
      logger.debug('Running auto-transfer building materials', { accountId });

      kickPromise.finally(() => {
        transferBuildingMaterials(this.account).catch((error) => {
          logger.error('Auto-transfer building materials failed', { accountId, error });
        });
      });
    }

    if (party && settings.autoKick && settings.autoInvite && party.members.length > 1) {
      logger.debug('Running auto-invite', { accountId });

      kickPromise.finally(() => {
        this.invite(party.members).catch((error) => {
          logger.error('Auto-invite failed', { accountId, error });
        });
      });
    }
  }

  private async notifyLeftBase() {
    const title = get(t)('autoKick.notifications.leftBase.title');
    const message = get(t)('autoKick.notifications.leftBase.message', { name: this.account.displayName });

    sendNotificationMessage(message, title).catch((error) => {
      logger.warn('Failed to send left-base notification', {
        accountId: this.account.accountId,
        error
      });
    });
  }

  private async kick(party: PartyData): Promise<boolean> {
    const { accounts } = accountStore.get();

    const memberIds = party.members.map((x) => x.account_id);
    const leaderId = party.members.find((x) => x.role === 'CAPTAIN')!.account_id;
    const leaderAccount = accounts.find((x) => x.accountId === leaderId);

    const autoKickIds = memberIds.filter((x) => autoKickAccounts.get(x)?.settings.autoKick);
    const noAutoKickIds = memberIds.filter((x) => !autoKickIds.includes(x));

    if (leaderAccount) {
      await Promise.allSettled(
        noAutoKickIds.filter((id) => id !== this.account.accountId).map((id) => kickMember(leaderAccount, party.id, id))
      );

      await leaveParty(this.account, party.id);
      return true;
    }

    const leaveAccounts = accounts.filter((acc) => noAutoKickIds.includes(acc.accountId));
    leaveAccounts.push(this.account);

    const results = await Promise.allSettled(leaveAccounts.map((x) => leaveParty(x, party.id)));
    const ownIndex = leaveAccounts.findIndex((x) => x.accountId === this.account.accountId);
    return ownIndex >= 0 && results[ownIndex].status === 'fulfilled';
  }

  private async invite(members: PartyData['members']) {
    await this.xmpp.waitForEvent(EpicEvents.MemberJoined, (x) => x.account_id === this.account.accountId, 20_000);
    await sleep(10_000);

    const [partyData, friends] = await Promise.allSettled([getParty(this.account), getFriends(this.account)]);

    const party = partyData.status === 'fulfilled' ? partyData.value.current[0] : null;
    if (!party || friends.status === 'rejected' || !friends.value.length) {
      return [];
    }

    const prevMemberIds = members.map((x) => x.account_id).filter((x) => x !== this.account.accountId);
    return Promise.allSettled(
      friends.value
        .filter((x) => prevMemberIds.includes(x.accountId))
        .map((x) => invite(this.account, party.id, x.accountId))
    );
  }
}
