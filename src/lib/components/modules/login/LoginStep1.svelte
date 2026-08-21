<script lang="ts">
  import { tick } from 'svelte';
  import { toast } from 'svelte-sonner';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { defaultClient, epicLoginAuthorizationCodeUrl, fortniteNewSwitchGameClient } from '$lib/constants/clients';
  import { oauthService } from '$lib/http';
  import { t } from '$lib/i18n';
  import {
    getAccessTokenUsingClientCredentials,
    getAccessTokenUsingDeviceCode,
    getAccessTokenFromEpicLoginCode,
    getAccessTokenUsingExchangeCode,
    getExchangeCodeUsingAccessToken,
    parseEpicLoginCodeInput
  } from '$lib/modules/authentication';
  import { createDeviceAuth } from '$lib/modules/device-auth';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import type { LoginMethod } from '$components/modules/login/LoginStep0.svelte';
  import { Button } from '$components/ui/button';
  import { Input } from '$components/ui/input';
  import type { DeviceCodeLoginData, EpicOAuthData } from '$types/game/authorizations';

  type Props = {
    selectedMethod: LoginMethod;
    goToPreviousStep: () => void;
    goToNextStep: () => void;
  };

  const { selectedMethod, goToPreviousStep, goToNextStep }: Props = $props();

  let exchangeCode = $state<string>();
  let exchangeForm = $state<HTMLFormElement>();
  let isLoggingIn = $state(false);
  let deviceCodeVerifyButtonDisabled = $state(true);
  let deviceCodeData = $state<{ code: string; verificationUrl: string }>();

  $effect(() => {
    if (selectedMethod === 'webConfirmation') {
      generateDeviceCodeLink();

      setTimeout(() => {
        deviceCodeVerifyButtonDisabled = false;
      }, 5000);
    }

    if (selectedMethod === 'exchangeCode') {
      exchangeCodeFromClipboard();
    }
  });

  async function exchangeCodeFromClipboard() {
    const clipboardText = (await readText()).trim();
    const parsed = parseEpicLoginCodeInput(clipboardText);
    const matchesCode = /^[a-f0-9]{32}$/i.test(parsed);
    if (!matchesCode) return;

    exchangeCode = parsed;

    await tick();
    exchangeForm?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  async function handleExchangeCodeSubmit(event: SubmitEvent) {
    event.preventDefault();

    const parsedCode = parseEpicLoginCodeInput(exchangeCode ?? '');
    if (!parsedCode) return;

    isLoggingIn = true;

    try {
      const accessTokenData = await getAccessTokenFromEpicLoginCode(parsedCode);
      await handleLogin(accessTokenData);
    } catch (error) {
      handleError({ error, message: $t('accountManager.failedToLogin') });
    } finally {
      isLoggingIn = false;
    }
  }

  async function generateDeviceCodeLink() {
    const clientToken = await getAccessTokenUsingClientCredentials(fortniteNewSwitchGameClient);
    const deviceCodeResponse = await oauthService
      .post<DeviceCodeLoginData>('deviceAuthorization', {
        body: new URLSearchParams({ prompt: 'login' }).toString(),
        headers: {
          Authorization: `Bearer ${clientToken.access_token}`
        }
      })
      .json();

    deviceCodeData = {
      code: deviceCodeResponse.device_code,
      verificationUrl: deviceCodeResponse.verification_uri_complete
    };
  }

  async function handleWebConfirmation() {
    isLoggingIn = true;

    try {
      const newSwitchAccessTokenData = await getAccessTokenUsingDeviceCode(
        deviceCodeData!.code,
        fortniteNewSwitchGameClient
      );

      const newSwitchExchangeCode = await getExchangeCodeUsingAccessToken(newSwitchAccessTokenData.access_token);
      const pcAccessTokenData = await getAccessTokenUsingExchangeCode(newSwitchExchangeCode.code);

      await handleLogin(pcAccessTokenData);
    } catch (error) {
      handleError({ error, message: $t('accountManager.confirmRequest') });
    } finally {
      isLoggingIn = false;
    }
  }

  async function handleLogin(accessTokenData: EpicOAuthData) {
    if (accessTokenData.client_id !== defaultClient.clientId) {
      toast.error('Invalid client ID');
      return;
    }

    const accounts = accountStore.get().accounts;
    if (accounts.some((account) => account.accountId === accessTokenData.account_id)) {
      toast.error($t('accountManager.alreadyLoggedIn', { name: accessTokenData.displayName }));
      return;
    }

    const deviceAuthData = await createDeviceAuth({
      accountId: accessTokenData.account_id,
      accessToken: accessTokenData.access_token
    });

    accountStore.add({
      displayName: accessTokenData.displayName,
      accountId: accessTokenData.account_id,
      deviceId: deviceAuthData.deviceId,
      secret: deviceAuthData.secret
    });

    goToNextStep();
  }

  function openDeviceCodeLink() {
    openUrl(deviceCodeData!.verificationUrl);
  }
</script>

<div class="flex flex-col">
  <button
    class="mb-4 flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    onclick={goToPreviousStep}
  >
    <ArrowLeftIcon class="size-4" />
    {$t('accountManager.back')}
  </button>

  {#if selectedMethod === 'webConfirmation'}
    <h3 class="text-lg font-medium">
      {$t('accountManager.loginMethods.webConfirmation.title')}
    </h3>
    <p class="mb-4 text-sm text-muted-foreground">
      {$t('accountManager.loginMethods.webConfirmation.instructions')}
    </p>

    <div class="mb-6 rounded-none">
      <Button
        class="flex w-full items-center justify-center gap-x-2"
        disabled={!deviceCodeData?.verificationUrl}
        loading={!deviceCodeData?.verificationUrl}
        loadingText={$t('accountManager.loginMethods.webConfirmation.generatingURL')}
        onclick={openDeviceCodeLink}
        variant="outline"
      >
        <ExternalLinkIcon class="size-4" />
        {$t('accountManager.loginMethods.webConfirmation.openWebsite')}
      </Button>
    </div>

    {#if !deviceCodeVerifyButtonDisabled}
      <Button
        class="w-full"
        disabled={isLoggingIn || deviceCodeVerifyButtonDisabled || !deviceCodeData?.verificationUrl}
        loading={isLoggingIn}
        loadingText={$t('accountManager.verifying')}
        onclick={handleWebConfirmation}
      >
        {$t('accountManager.continue')}
      </Button>
    {/if}
  {:else if selectedMethod === 'exchangeCode'}
    <h3 class="text-lg font-medium">
      {$t('accountManager.loginMethods.exchangeCode.title')}
    </h3>
    <p class="mb-4 text-sm text-muted-foreground">
      {$t('accountManager.loginMethods.exchangeCode.instructions')}
    </p>

    <div class="mb-4 flex flex-col gap-2 sm:flex-row">
      <Button
        class="flex flex-1 items-center justify-center gap-x-2"
        onclick={() => openUrl(epicLoginAuthorizationCodeUrl)}
        variant="outline"
      >
        <ExternalLinkIcon class="size-4" />
        {$t('accountManager.loginMethods.exchangeCode.openLink')}
      </Button>
      <Button
        class="flex flex-1 items-center justify-center gap-x-2"
        onclick={async () => {
          await writeText(epicLoginAuthorizationCodeUrl);
          toast.success($t('accountManager.loginMethods.exchangeCode.linkCopied'));
        }}
        variant="secondary"
      >
        {$t('accountManager.loginMethods.exchangeCode.copyLink')}
      </Button>
    </div>
    <p class="mb-4 text-xs text-muted-foreground">
      {$t('accountManager.loginMethods.exchangeCode.shareHint')}
    </p>

    <form
      bind:this={exchangeForm}
      class="flex h-full flex-1 flex-col justify-between gap-y-4"
      onsubmit={handleExchangeCodeSubmit}
    >
      <Input
        autofocus={true}
        disabled={isLoggingIn}
        placeholder={$t('accountManager.loginMethods.exchangeCode.inputPlaceholder')}
        type="text"
        bind:value={exchangeCode}
      />

      <div class="flex-1"></div>

      <Button
        class="mt-auto flex w-full items-center justify-center gap-2"
        disabled={!/^[a-f0-9]{32}$/i.test(parseEpicLoginCodeInput(exchangeCode ?? '')) || isLoggingIn}
        loading={isLoggingIn}
        loadingText={$t('accountManager.verifying')}
        type="submit"
      >
        {$t('accountManager.continue')}
      </Button>
    </form>
  {/if}
</div>
