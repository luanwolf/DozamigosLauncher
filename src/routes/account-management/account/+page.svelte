<script lang="ts" module>
  import type { BulkState } from '$types/account';

  type CodeState = BulkState<
    Array<{
      code: string;
      error?: string;
    }>
  >;

  let codesToRedeem = $state<string[]>([]);
  let isRedeeming = $state(false);
  let codeState = $state<CodeState | null>(null);

  let generatingExchangeCode = $state(false);
  let generatingAccessToken = $state(false);

  let isLoggingIn = $state(false);
  let isCopying = $state(false);
  let isOpeningSettings = $state(false);
</script>

<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { page } from '$app/state';
  import { toast } from 'svelte-sonner';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import EyeIcon from '@lucide/svelte/icons/eye';
  import EyeOffIcon from '@lucide/svelte/icons/eye-off';
  import KeyRound from '@lucide/svelte/icons/key-round';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
  import { writeText } from '@tauri-apps/plugin-clipboard-manager';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import {
    defaultClient,
    fortniteAndroidGameClient,
    fortnitePCGameClient,
    launcherAppClient2
  } from '$lib/constants/clients';
  import { EpicAPIError } from '$lib/exceptions/EpicAPIError';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { language, t } from '$lib/i18n';
  import { getCachedToken } from '$lib/modules/auth-session';
  import {
    getAccessTokenUsingDeviceAuth,
    getAccessTokenUsingExchangeCode,
    getExchangeCodeUsingAccessToken
  } from '$lib/modules/authentication';
  import { accountProfileCache } from '$lib/modules/account-data';
  import { redeemCode } from '$lib/modules/code';
  import { generateEpicExchangeUrl } from '$lib/modules/epic-web-url';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import SectionHeading from '$components/layout/SectionHeading.svelte';
  import AccountFriendsSection from '$components/modules/account/AccountFriendsSection.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import { Button } from '$components/ui/button';
  import { TagInput } from '$components/ui/tag-input';
  import * as Select from '$components/ui/select';
  import type { EpicAccountById } from '$types/game/lookup';
  import type { EpicTokenType } from '$types/game/authorizations';

  const EPIC_ACCOUNT_SETTINGS_URL = 'https://www.epicgames.com/account/personal';

  const activeAccount = accountStore.getActiveStore();

  let showSensitiveData = $state(false);
  let isOpeningStwNews = $state(false);

  const cachedProfile = $derived(accountProfileCache.get($activeAccount));
  const profileData = $derived<EpicAccountById | null>(cachedProfile.data);
  const isLoadingProfile = $derived(cachedProfile.loading || cachedProfile.refreshing);
  const profileError = $derived(
    cachedProfile.error && !cachedProfile.data ? $t('accountHub.profile.loadFailed') : null
  );

  let selectedTokenType = $state<EpicTokenType>();
  const tokenTypeOptions: { label: string; value: EpicTokenType }[] = [
    { label: 'EG1', value: 'eg1' },
    { label: 'Bearer', value: 'bearer' }
  ];

  let selectedClient = $state<string>(defaultClient.clientId);
  const allClients = [fortnitePCGameClient, fortniteAndroidGameClient, launcherAppClient2];
  const clientOptions = allClients.map((client) => ({ value: client.clientId, label: client.name }));

  const humanizedErrors = $derived<Record<string, string>>({
    'errors.com.epicgames.coderedemption.code_not_found': $t('redeemCodes.redeemErrors.notFound'),
    'errors.com.epicgames.coderedemption.codeUse_already_used': $t('redeemCodes.redeemErrors.itemsAlreadyOwned'),
    'errors.com.epicgames.coderedemption.multiple_redemptions_not_allowed': $t(
      'redeemCodes.redeemErrors.itemsAlreadyOwned'
    ),
    'errors.com.epicgames.coderedemption.code_used': $t('redeemCodes.redeemErrors.alreadyUsed')
  });

  function platformLabel(key: string, fallback: string) {
    const labels: Record<string, string> = {
      psn: $t('accountHub.profile.platforms.psn'),
      xbl: $t('accountHub.profile.platforms.xbl'),
      nintendo: $t('accountHub.profile.platforms.nintendo'),
      nintendo_switch: $t('accountHub.profile.platforms.nintendo_switch'),
      twitch: $t('accountHub.profile.platforms.twitch'),
      google: $t('accountHub.profile.platforms.google'),
      apple: $t('accountHub.profile.platforms.apple'),
      facebook: $t('accountHub.profile.platforms.facebook'),
      github: $t('accountHub.profile.platforms.github'),
      vk: $t('accountHub.profile.platforms.vk')
    };

    return labels[key] ?? fallback;
  }

  function humanizeMinorStatus(status: string) {
    const labels: Record<string, string> = {
      NOT_MINOR: $t('accountHub.profile.minorStatusValues.notMinor'),
      MINOR: $t('accountHub.profile.minorStatusValues.minor'),
      PARENTAL_APPROVAL_REQUIRED: $t('accountHub.profile.minorStatusValues.parentalApprovalRequired'),
      NEEDS_VERIFICATION: $t('accountHub.profile.minorStatusValues.needsVerification')
    };

    return labels[status] ?? status.replaceAll('_', ' ').toLowerCase();
  }

  const linkedPlatforms = $derived.by(() => {
    if (!profileData?.externalAuths) return [];
    return Object.entries(profileData.externalAuths).map(([key, auth]) => ({
      key,
      label: platformLabel(key, auth.type || key),
      name: auth.externalDisplayName || auth.accountId
    }));
  });

  const resultSummary = $derived.by(() => {
    if (!codeState) return null;

    const success = codeState.data.filter((x) => !x.error).length;
    const failed = codeState.data.filter((x) => x.error).length;

    return { success, failed };
  });

  function formatDate(date: string) {
    return new Date(date).toLocaleString($language, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function scrollToHash() {
    const hash = page.url.hash.slice(1);
    if (!hash) return;
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function fetchProfile(account = $activeAccount, force = false) {
    if (!account) return;

    const profile = await accountProfileCache.ensure(account, { force });
    if (!profile) {
      handleError({
        error: accountProfileCache.get(account).error,
        message: 'Failed to fetch account profile',
        account,
        toastId: false
      });
    }
  }

  async function redeemCodes() {
    const account = $activeAccount;
    if (!account || !codesToRedeem.length) return;

    isRedeeming = true;
    codeState = null;

    const nonExistentCodes: string[] = [];
    let invalidCredentials = false;

    const state: CodeState = { accountId: account.accountId, displayName: account.displayName, data: [] };

    await Promise.allSettled(
      codesToRedeem.map(async (code) => {
        if (nonExistentCodes.includes(code)) {
          state.data.push({ code, error: $t('redeemCodes.redeemErrors.notFound') });
          return;
        }

        if (invalidCredentials) {
          state.data.push({ code, error: $t('redeemCodes.loginExpired') });
          return;
        }

        try {
          await redeemCode(account, code);
          state.data.push({ code });
        } catch (error) {
          handleError({ error, message: 'Failed to redeem code', account, toastId: false });

          let errorString = $t('redeemCodes.redeemErrors.unknownError');

          if (error instanceof EpicAPIError) {
            errorString = humanizedErrors[error.errorCode] || error.errorMessage;

            switch (error.errorCode) {
              case 'errors.com.epicgames.coderedemption.code_not_found': {
                nonExistentCodes.push(code);
                break;
              }
              case 'errors.com.epicgames.account.invalid_account_credentials': {
                errorString = $t('redeemCodes.loginExpired');
                invalidCredentials = true;
                break;
              }
            }
          }

          state.data.push({ code, error: errorString });
        }
      })
    );

    codeState = state;
    codesToRedeem = [];
    isRedeeming = false;
  }

  async function generateAndCopyExchangeCode() {
    generatingExchangeCode = true;

    try {
      const accessToken = await getCachedToken($activeAccount, defaultClient, true);
      const { code } = await getExchangeCodeUsingAccessToken(accessToken);

      await writeText(code);
      toast.success($t('exchangeCode.generated'));
    } catch (error) {
      handleError({ error, message: $t('exchangeCode.failedToGenerate'), account: $activeAccount });
    } finally {
      generatingExchangeCode = false;
    }
  }

  async function generateAccessToken(event: SubmitEvent) {
    event.preventDefault();

    generatingAccessToken = true;

    try {
      let accessTokenData = await getAccessTokenUsingDeviceAuth($activeAccount, selectedTokenType);

      if (selectedClient !== fortniteAndroidGameClient.clientId) {
        const { code } = await getExchangeCodeUsingAccessToken(accessTokenData.access_token);

        const client = allClients.find((client) => client.clientId === selectedClient);
        accessTokenData = await getAccessTokenUsingExchangeCode(code, client, selectedTokenType);
      }

      await writeText(accessTokenData.access_token);
      toast.success($t('accessToken.generated'));
    } catch (error) {
      handleError({ error, message: $t('accessToken.failedToGenerate'), account: $activeAccount });
    } finally {
      generatingAccessToken = false;
    }
  }

  async function openEpicUrl(redirectUrl?: string) {
    return generateEpicExchangeUrl($activeAccount, redirectUrl);
  }

  async function openEpicGamesWebsite() {
    isLoggingIn = true;

    try {
      const url = await openEpicUrl();
      await openUrl(url);
      toast.success($t('epicGamesWebsite.openedWebsite'));
    } catch (error) {
      handleError({ error, message: $t('epicGamesWebsite.failedToOpenWebsite'), account: $activeAccount });
    } finally {
      isLoggingIn = false;
    }
  }

  async function openAccountSettings() {
    isOpeningSettings = true;

    try {
      const url = await openEpicUrl(EPIC_ACCOUNT_SETTINGS_URL);
      await openUrl(url);
      toast.success($t('epicGamesWebsite.openedWebsite'));
    } catch (error) {
      handleError({ error, message: $t('epicGamesWebsite.failedToOpenWebsite'), account: $activeAccount });
    } finally {
      isOpeningSettings = false;
    }
  }

  async function copyWebsiteLink() {
    isCopying = true;

    try {
      const url = await openEpicUrl();
      await writeText(url);

      toast.success($t('epicGamesWebsite.copied'));
    } catch (error) {
      handleError({ error, message: $t('epicGamesWebsite.failedToCopy'), account: $activeAccount });
    } finally {
      isCopying = false;
    }
  }

  async function openStwNewsProfile() {
    if (!$activeAccount) return;
    isOpeningStwNews = true;
    try {
      await openUrl(`https://stw.news/${$activeAccount.accountId}`);
    } catch (error) {
      handleError({ error, message: $t('accountHub.customization.stwNews'), account: $activeAccount });
    } finally {
      isOpeningStwNews = false;
    }
  }

  onMount(() => {
    scrollToHash();
  });

  $effect(() => {
    const account = $activeAccount;
    untrack(() => {
      fetchProfile(account);
    });
  });

  $effect(() => {
    const account = $activeAccount;
    untrack(() => {
      void account;
      codeState = null;
    });
  });

  $effect(() => {
    void page.url.hash;
    scrollToHash();
  });
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'F5') {
      event.preventDefault();
      fetchProfile($activeAccount, true);
    }
  }}
/>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('accountHub.page.description')}
  title={$t('accountHub.page.title')}
>
  {#snippet actions()}
    <Button
      disabled={isLoggingIn || isCopying || isOpeningSettings}
      loading={isLoggingIn}
      loadingText={$t('epicGamesWebsite.loggingIn')}
      onclick={openEpicGamesWebsite}
      size="sm"
    >
      {$t('accountHub.epic.openWebsite')}
    </Button>

    <Button
      disabled={isLoggingIn || isCopying || isOpeningSettings}
      loading={isOpeningSettings}
      loadingText={$t('epicGamesWebsite.loggingIn')}
      onclick={openAccountSettings}
      size="sm"
      variant="secondary"
    >
      {$t('accountHub.epic.openAccountSettings')}
    </Button>

    <Button
      disabled={isLoggingIn || isCopying || isOpeningSettings}
      onclick={copyWebsiteLink}
      size="icon"
      title={$t('accountHub.epic.copyLoginLink')}
      variant="outline"
    >
      {#if isCopying}
        <LoaderCircleIcon class="size-4 animate-spin" />
      {:else}
        <CopyIcon class="size-4" />
      {/if}
    </Button>

    <Button
      disabled={isLoggingIn || isCopying || isOpeningSettings || isOpeningStwNews}
      loading={isOpeningStwNews}
      onclick={openStwNewsProfile}
      size="sm"
      variant="outline"
    >
      {$t('accountHub.customization.stwNews')}
    </Button>
  {/snippet}

  <section id="profile" class="scroll-mt-6 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <SectionHeading title={$t('accountHub.sections.accountDetails')} />
      {#if profileData && !isLoadingProfile && !profileError}
        <Button
          aria-label={showSensitiveData
            ? $t('accountHub.profile.hideSensitive')
            : $t('accountHub.profile.showSensitive')}
          aria-pressed={showSensitiveData}
          onclick={() => (showSensitiveData = !showSensitiveData)}
          size="icon"
          title={showSensitiveData
            ? $t('accountHub.profile.hideSensitive')
            : $t('accountHub.profile.showSensitive')}
          variant="outline"
        >
          {#if showSensitiveData}
            <EyeIcon class="size-4" />
          {:else}
            <EyeOffIcon class="size-4" />
          {/if}
        </Button>
      {/if}
    </div>

    {#if isLoadingProfile}
      <PageLoading compact label={$t('loading')} />
    {:else if profileError}
      <p class="text-sm text-destructive">{profileError}</p>
    {:else if profileData}
      {@const secretClass = showSensitiveData
        ? 'transition-[filter]'
        : 'pointer-events-none select-none blur-sm transition-[filter]'}
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="rounded-md border border-border/60 bg-muted/20 px-4 py-3">
            <p class="text-xs text-muted-foreground">{$t('accountHub.profile.displayName')}</p>
            <p class="mt-1 text-sm font-semibold {secretClass}">{profileData.displayName}</p>
          </div>

          <div class="min-w-0 rounded-md border border-border/60 bg-muted/20 px-4 py-3">
            <p class="text-xs text-muted-foreground">{$t('accountHub.profile.email')}</p>
            <p class="mt-1 break-all text-sm font-semibold {secretClass}" class:text-muted-foreground={!profileData.email}>
              {profileData.email || $t('accountHub.profile.emailUnavailable')}
            </p>
          </div>

          <div class="min-w-0 rounded-md border border-border/60 bg-muted/20 px-4 py-3">
            <p class="text-xs text-muted-foreground">{$t('accountHub.profile.accountId')}</p>
            <p class="mt-1 break-all text-sm font-semibold tabular-nums {secretClass}">{profileData.id}</p>
          </div>

          <div class="rounded-md border border-border/60 bg-muted/20 px-4 py-3">
            <p class="text-xs text-muted-foreground">{$t('accountHub.profile.created')}</p>
            <p class="mt-1 text-sm font-semibold {secretClass}">
              {#if profileData.created}
                {formatDate(profileData.created)}
              {:else}
                {$t('accountHub.profile.createdUnavailable')}
              {/if}
            </p>
          </div>

          <div class="rounded-md border border-border/60 bg-muted/20 px-4 py-3">
            <p class="text-xs text-muted-foreground">{$t('accountHub.profile.minorStatus')}</p>
            <p class="mt-1 text-sm font-semibold {secretClass}">
              {profileData.minorStatus ? humanizeMinorStatus(profileData.minorStatus) : '-'}
            </p>
          </div>

          <div class="rounded-md border border-border/60 bg-muted/20 px-4 py-3">
            <p class="text-xs text-muted-foreground">{$t('accountHub.profile.cabinedMode')}</p>
            <p class="mt-1 text-sm font-semibold {secretClass}">
              {profileData.cabinedMode ? $t('yes') : $t('no')}
            </p>
          </div>
        </div>

        <div class="rounded-md border border-border/60 bg-muted/20 px-4 py-4">
          <p class="text-xs font-medium text-muted-foreground">{$t('accountHub.profile.linkedPlatforms')}</p>
          {#if linkedPlatforms.length}
            <ul class="mt-3 space-y-2">
              {#each linkedPlatforms as platform (platform.key)}
                <li class="flex items-start justify-between gap-3 text-sm">
                  <span class="font-medium">{platform.label}</span>
                  {#if platform.name}
                    <span class="truncate text-muted-foreground {secretClass}">{platform.name}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {:else}
            <p class="mt-2 text-sm text-muted-foreground">{$t('accountHub.profile.noLinkedPlatforms')}</p>
          {/if}
        </div>
      </div>
    {/if}
  </section>

  <section id="friends" class="scroll-mt-6 space-y-4">
    <SectionHeading title={$t('accountHub.sections.friends')} />
    <AccountFriendsSection />
  </section>

  <section id="redeem" class="scroll-mt-6 space-y-4">
    <SectionHeading title={$t('accountHub.sections.redeem')} />

    <div class="space-y-4">
      <TagInput placeholder={$t('redeemCodes.codesPlaceholder')} bind:items={codesToRedeem} />

      <Button
        class="w-full sm:w-auto"
        disabled={!codesToRedeem.length || isRedeeming}
        loading={isRedeeming}
        loadingText={$t('redeemCodes.redeeming')}
        onclick={redeemCodes}
        type="button"
      >
        {$t('redeemCodes.redeemCodes')}
      </Button>

      {#if !isRedeeming && codeState}
        {@const state = codeState}
        {#if resultSummary}
          <div class="flex flex-wrap gap-2">
            {#if resultSummary.success > 0}
              <span class="hud-chip text-xs tabular-nums text-green-500">
                {resultSummary.success} resgatado(s)
              </span>
            {/if}
            {#if resultSummary.failed > 0}
              <span class="hud-chip text-xs tabular-nums text-destructive">
                {resultSummary.failed} erro(s)
              </span>
            {/if}
          </div>
        {/if}

        {@const successCount = state.data.filter((x) => !x.error).length}

        <AccountResultCard accountId={state.accountId} displayName={state.displayName}>
          {#snippet badge()}
            <span class="text-xs tabular-nums text-muted-foreground">
              {successCount}/{state.data.length}
            </span>
          {/snippet}

          <div class="space-y-2">
            {#each state.data as { code, error } (code)}
              <div class="flex items-start gap-2 text-sm">
                <span class="min-w-0 flex-1 truncate font-medium">{code}</span>
                <span class="shrink-0" class:text-destructive={error} class:text-green-500={!error}>
                  {error || $t('redeemCodes.redeemed')}
                </span>
              </div>
            {/each}
          </div>
        </AccountResultCard>
      {/if}
    </div>
  </section>

  <section id="authentication" class="scroll-mt-6 space-y-4">
    <SectionHeading title={$t('accountHub.sections.authentication')} />

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="hud-toolbar space-y-3">
        <h3 class="text-sm font-medium text-foreground">{$t('exchangeCode.page.title')}</h3>
        <p class="text-sm text-muted-foreground">{$t('exchangeCode.page.description')}</p>
        <Button
          class="w-full sm:w-auto"
          disabled={generatingExchangeCode}
          loading={generatingExchangeCode}
          loadingText={$t('exchangeCode.generating')}
          onclick={generateAndCopyExchangeCode}
        >
          {$t('exchangeCode.generate')}
        </Button>
      </div>

      <div class="hud-toolbar space-y-3">
        <h3 class="text-sm font-medium text-foreground">{$t('accessToken.page.title')}</h3>
        <form class="space-y-3" onsubmit={generateAccessToken}>
          <p class="text-sm text-muted-foreground">{$t('accessToken.page.description')}</p>

          <Select.Root type="single" bind:value={selectedTokenType}>
            <Select.Trigger class="w-full">
              <KeyRound class="size-5" />
              {tokenTypeOptions.find((option) => option.value === selectedTokenType)?.label ||
                $t('accessToken.selectTokenType')}
            </Select.Trigger>

            <Select.Content>
              {#each tokenTypeOptions as option (option.value)}
                <Select.Item value={option.value}>
                  {option.label}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>

          <Select.Root type="single" bind:value={selectedClient}>
            <Select.Trigger class="w-full">
              <MonitorSmartphone class="size-5" />
              {clientOptions.find((option) => option.value === selectedClient)?.label ||
                $t('accessToken.selectClient')}
            </Select.Trigger>

            <Select.Content>
              {#each clientOptions as option (option.value)}
                <Select.Item value={option.value}>
                  {option.label}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>

          <Button
            class="w-full sm:w-auto"
            disabled={generatingAccessToken || !selectedTokenType || !selectedClient}
            loading={generatingAccessToken}
            loadingText={$t('accessToken.generating')}
            type="submit"
          >
            {$t('accessToken.generate')}
          </Button>
        </form>
      </div>
    </div>
  </section>
</PageContent>
