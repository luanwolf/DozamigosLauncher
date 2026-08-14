<script lang="ts" module>
  import type { BulkState } from '$types/account';

  type EULAState = BulkState<{
    acceptLink?: string;
  }>;

  let selectedAccounts = $state<string[]>([]);
  let isFetching = $state(false);
  let eulaStates = $state<EULAState[]>([]);
</script>

<script lang="ts">
  import { toast } from 'svelte-sonner';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import { launcherAppClient2 } from '$lib/constants/clients';
  import { EpicAPIError } from '$lib/exceptions/EpicAPIError';
  import { t } from '$lib/i18n';
  import {
    getAccessTokenUsingDeviceAuth,
    getAccessTokenUsingExchangeCode,
    getExchangeCodeUsingAccessToken
  } from '$lib/modules/authentication';
  import { acceptEULA, checkEULA as checkGameEULA } from '$lib/modules/eula';
  import { getAccountsFromSelection, handleError } from '$lib/utils';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountCombobox from '$components/ui/AccountCombobox.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import { Button } from '$components/ui/button';
  import { ExternalLink } from '$components/ui/external-link';

  async function checkEULA() {
    isFetching = true;
    eulaStates = [];

    const accounts = getAccountsFromSelection(selectedAccounts);
    await Promise.allSettled(
      accounts.map(async (account) => {
        const state: EULAState = { accountId: account.accountId, displayName: account.displayName, data: {} };

        try {
          // TODO: Shortest way I could find. Might change later
          const accessTokenData = await getAccessTokenUsingDeviceAuth(account);
          const exchangeData = await getExchangeCodeUsingAccessToken(accessTokenData.access_token);
          const launcherAccessTokenData = await getAccessTokenUsingExchangeCode(exchangeData.code, launcherAppClient2);
          await getExchangeCodeUsingAccessToken(launcherAccessTokenData.access_token);
        } catch (error) {
          if (
            error instanceof EpicAPIError &&
            error.errorCode === 'errors.com.epicgames.oauth.corrective_action_required' &&
            error.continuationUrl
          ) {
            state.data.acceptLink = error.continuationUrl;
            eulaStates.push(state);
          } else {
            handleError({ error, message: 'EULA acceptance check failed', account, toastId: false });
          }
        }

        const gameEULAData = await checkGameEULA(account).catch(() => null);
        if (gameEULAData) {
          try {
            await acceptEULA(account, gameEULAData.version);
          } catch (error) {
            handleError({ error, message: 'Failed to accept EULA', account, toastId: false });
          }
        }
      })
    );

    if (!eulaStates.length) {
      toast.info($t('eula.allAccountsAlreadyAccepted'));
    }

    isFetching = false;
  }
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('eula.page.description')}
  title={$t('eula.page.title')}
>
  <AccountCombobox disabled={isFetching} type="multiple" bind:value={selectedAccounts} />

  <Button
    class="w-full sm:w-auto sm:self-start"
    disabled={!selectedAccounts?.length || isFetching}
    loading={isFetching}
    loadingText={$t('eula.checking')}
    onclick={checkEULA}
    type="button"
  >
    {$t('eula.check')}
  </Button>

  {#if !isFetching && eulaStates.length}
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {#each eulaStates as state (state.accountId)}
        <AccountResultCard accountId={state.accountId} displayName={state.displayName}>
          <ExternalLink
            class="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            href={state.data.acceptLink!}
          >
            {$t('eula.check')}
            <ExternalLinkIcon class="size-4" />
          </ExternalLink>
        </AccountResultCard>
      {/each}
    </div>
  {/if}
</PageContent>
