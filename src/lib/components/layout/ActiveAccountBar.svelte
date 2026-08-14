<script lang="ts">
  import { toast } from 'svelte-sonner';
  import LogOutIcon from '@lucide/svelte/icons/log-out';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { language, t } from '$lib/i18n';
  import { accountStore } from '$lib/storage';
  import { avatarCache } from '$lib/stores';
  import { activeAccountBalances } from '$lib/stores/active-account-balances.svelte';
  import { cn, handleError } from '$lib/utils';
  import PageHeaderChip from '$components/layout/PageHeaderChip.svelte';
  import AccountSwitcherDialog from '$components/modules/account/AccountSwitcherDialog.svelte';
  import LoginModal from '$components/modules/login/LoginModal.svelte';
  import { Button } from '$components/ui/button';

  type Props = {
    embedded?: boolean;
  };

  let { embedded = false }: Props = $props();

  const activeAccount = accountStore.getActiveStore(true);
  const hasAccounts = $derived($accountStore.accounts.length > 0);

  let showLoginModal = $state(false);

  const greeting = $derived(
    $activeAccount ? $t('home.greeting', { name: $activeAccount.displayName }) : $t('home.guestGreeting')
  );

  $effect(() => {
    activeAccountBalances.refresh($activeAccount);
  });

  async function logout() {
    if (!$activeAccount) return;

    const accountName = $activeAccount.displayName || $activeAccount.accountId;
    const toastId = toast.loading($t('accountManager.loggingOut', { name: accountName }));

    try {
      accountStore.remove($activeAccount.accountId);
      toast.success($t('accountManager.loggedOut', { name: accountName }), { id: toastId });
    } catch (error) {
      handleError({
        error,
        message: $t('accountManager.failedToLogout', { name: accountName }),
        toastId,
        account: $activeAccount
      });
    }
  }
</script>

<!--
  Embedded, this fills the title bar's empty middle, so it has to be a drag
  region too: Tauri only drags when the element under the cursor carries the
  attribute itself, never a parent's.
-->
<div
  class={cn(
    embedded
      ? 'flex min-w-0 flex-1 items-center overflow-hidden'
      : 'border-b border-border/60 bg-card/50 px-5 py-2.5 xs:px-10 sm:px-20'
  )}
  data-tauri-drag-region={embedded ? '' : undefined}
>
  <div
    class={cn('flex items-center', embedded ? 'min-w-0 flex-1 gap-x-2.5 overflow-hidden' : 'flex-wrap gap-x-3 gap-y-2')}
    data-tauri-drag-region={embedded ? '' : undefined}
  >
    <img
      class={cn(
        'shrink-0 rounded-full border border-border/60',
        embedded ? 'size-9' : 'size-10',
        !$activeAccount && 'opacity-60'
      )}
      alt={$activeAccount?.displayName ?? $t('home.guestGreeting')}
      src={$activeAccount
        ? avatarCache.get($activeAccount.accountId) || '/misc/default-outfit-icon.png'
        : '/misc/default-outfit-icon.png'}
    />

    <span
      class={cn(
        'min-w-0 font-semibold tracking-tight',
        embedded ? 'hidden truncate text-sm min-[720px]:inline sm:text-base' : 'text-sm sm:text-base'
      )}
    >
      {greeting}
    </span>

    {#if $activeAccount}
      <PageHeaderChip
        class={embedded ? 'h-8 gap-1 px-2 text-sm max-[520px]:hidden sm:h-9 sm:gap-1.5 sm:px-2.5' : undefined}
      >
        <img class="size-5 shrink-0 object-contain" alt={$t('vbucks')} src="/resources/currency_mtxswap.png" />
        <span class="text-sm leading-none font-semibold tabular-nums">
          {#if activeAccountBalances.vbucks !== null}
            {activeAccountBalances.vbucks.toLocaleString($language)}
          {:else if activeAccountBalances.isLoading}
            …
          {:else}
            -
          {/if}
        </span>
      </PageHeaderChip>

      <PageHeaderChip class={cn(embedded && 'hidden h-9 gap-1.5 px-2.5 text-sm min-[900px]:flex')}>
        <img class="size-5 shrink-0 object-contain" alt={$t('stw.gold')} src="/resources/eventcurrency_scaling.png" />
        <span class="text-sm leading-none font-semibold tabular-nums">
          {#if activeAccountBalances.gold !== null}
            {activeAccountBalances.gold.toLocaleString($language)}
          {:else if activeAccountBalances.isLoading}
            …
          {:else}
            -
          {/if}
        </span>
      </PageHeaderChip>
    {/if}

    {#if hasAccounts}
      <AccountSwitcherDialog compact={embedded} />
    {:else}
      <Button
        class={embedded ? 'shrink-0 leading-none max-xs:px-2.5' : undefined}
        aria-label={embedded ? $t('accountManager.login') : undefined}
        onclick={() => (showLoginModal = true)}
        size={embedded ? 'default' : 'sm'}
        variant="secondary"
      >
        {#if embedded}
          <PlusIcon class="size-5 xs:hidden" />
          <span class="leading-none max-xs:hidden">{$t('accountManager.login')}</span>
        {:else}
          <PlusIcon class="size-4" />
          {$t('accountManager.login')}
        {/if}
      </Button>
    {/if}

    {#if $activeAccount}
      <Button
        class={embedded ? 'shrink-0 px-2.5 leading-none' : 'leading-none'}
        aria-label={$t('accountManager.logout')}
        onclick={logout}
        size={embedded ? 'default' : 'sm'}
        variant="outline"
      >
        <LogOutIcon class="size-4" />
        <span class="hidden leading-none min-[900px]:inline">{$t('accountManager.logout')}</span>
      </Button>
    {/if}
  </div>
</div>

<LoginModal bind:open={showLoginModal} />
