<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import UsersIcon from '@lucide/svelte/icons/users';
  import { t } from '$lib/i18n';
  import { accountStore } from '$lib/storage';
  import { avatarCache } from '$lib/stores';
  import LoginModal from '$components/modules/login/LoginModal.svelte';
  import { Button } from '$components/ui/button';
  import * as Dialog from '$components/ui/dialog';
  import type { AccountData } from '$types/account';

  type Props = {
    compact?: boolean;
  };

  let { compact = false }: Props = $props();

  let open = $state(false);
  let searchTerm = $state<string>();
  let showLoginModal = $state(false);

  const allAccounts = $derived($accountStore.accounts);
  const activeAccount = accountStore.getActiveStore(true);

  const filteredAccounts = $derived(
    searchTerm
      ? allAccounts.filter((account) => account.displayName.toLowerCase().includes(searchTerm!.toLowerCase()))
      : allAccounts
  );

  function changeAccount(account: AccountData) {
    open = false;
    accountStore.setActive(account.accountId);
  }

  function addNewAccount() {
    open = false;
    showLoginModal = true;
  }
</script>

<Button
  aria-label={$t('accountHub.switchAccount')}
  class={compact ? 'shrink-0 px-2.5' : undefined}
  onclick={() => (open = true)}
  size={compact ? 'default' : 'sm'}
  variant="outline"
>
  {#if compact}
    <UsersIcon class="size-4" />
  {:else}
    {$t('accountHub.switchAccount')}
  {/if}
</Button>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>{$t('accountHub.switchAccountDialog.title')}</Dialog.Title>
      <Dialog.Description>{$t('accountHub.switchAccountDialog.description')}</Dialog.Description>
    </Dialog.Header>

    {#if allAccounts.length}
      <input
        class="w-full rounded-none border border-input bg-input px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
        placeholder={$t('accountManager.searchAccounts')}
        type="search"
        bind:value={searchTerm}
      />
    {/if}

    <div class="max-h-64 space-y-1 overflow-y-auto">
      {#each filteredAccounts as account (account.accountId)}
        <button
          class="flex w-full items-center gap-3 rounded-none px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
          onclick={() => changeAccount(account)}
          type="button"
        >
          <img
            class="size-8 rounded-full"
            alt={account.displayName}
            src={avatarCache.get(account.accountId) || '/misc/default-outfit-icon.png'}
          />
          <span class="min-w-0 flex-1 truncate font-medium">{account.displayName}</span>
          {#if $activeAccount?.accountId === account.accountId}
            <CheckIcon class="size-4 shrink-0 text-primary" />
          {/if}
        </button>
      {:else}
        <p class="py-4 text-center text-sm text-muted-foreground">{$t('combobox.noResults')}</p>
      {/each}
    </div>

    <Button class="w-full" onclick={addNewAccount} variant="outline">
      <PlusIcon class="size-4" />
      {$t('accountManager.login')}
    </Button>
  </Dialog.Content>
</Dialog.Root>

<LoginModal bind:open={showLoginModal} />
