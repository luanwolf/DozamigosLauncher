<script lang="ts">
  import { get } from 'svelte/store';
  import { toast } from 'svelte-sonner';
  import { t } from '$lib/i18n';
  import { allSettingsSchema } from '$lib/schemas/settings';
  import { accountStore, settingsStore } from '$lib/storage';
  import AccountCombobox from '$components/ui/AccountCombobox.svelte';
  import SectionHeading from '$components/layout/SectionHeading.svelte';
  import SettingItem from '$components/modules/settings/SettingItem.svelte';
  import { Button } from '$components/ui/button';
  import { Input } from '$components/ui/input';
  import { Label } from '$components/ui/label';
  import { Switch } from '$components/ui/switch';
  import { TagInput } from '$components/ui/tag-input';
  import type { AllSettings } from '$types/settings';

  const activeAccount = accountStore.getActiveStore(true);

  let selectedAccountId = $state('');
  let aliasDraft = $state('');
  let tagsDraft = $state<string[]>([]);
  let syncedAccountId = $state('');

  $effect(() => {
    if (!selectedAccountId) selectedAccountId = $activeAccount?.accountId ?? $accountStore.accounts[0]?.accountId ?? '';
    if (!selectedAccountId || selectedAccountId === syncedAccountId) return;

    const account = $accountStore.accounts.find((entry) => entry.accountId === selectedAccountId);
    if (!account) return;

    syncedAccountId = selectedAccountId;
    aliasDraft = account.alias ?? '';
    tagsDraft = [...(account.tags ?? [])];
  });

  function updateAppSetting(key: 'showXrayTickets' | 'showStwGold', value: boolean) {
    const current = get(settingsStore);
    const next: AllSettings = {
      ...current,
      app: { ...current.app, [key]: value }
    };

    if (!allSettingsSchema.safeParse(next).success) {
      toast.error($t('settings.invalidValue'));
      return;
    }

    settingsStore.set(() => next);
  }

  function saveAccountCustomization() {
    if (!selectedAccountId) return;

    accountStore.update(selectedAccountId, {
      alias: aliasDraft.trim() || undefined,
      tags: tagsDraft.map((tag) => tag.trim()).filter(Boolean)
    });
    toast.success($t('accountHub.customization.saved'));
  }
</script>

<div class="space-y-6">
  <section class="space-y-4">
    <SectionHeading
      description={$t('settings.customization.accountDescription')}
      title={$t('settings.customization.accountTitle')}
    />

    <div class="space-y-1.5">
      <Label>{$t('launchGame.profile.account')}</Label>
      <AccountCombobox type="single" bind:value={selectedAccountId} />
    </div>

    <div class="space-y-1.5">
      <Label for="settings-account-alias">{$t('accountHub.customization.alias')}</Label>
      <Input
        id="settings-account-alias"
        maxlength={32}
        placeholder={$t('accountHub.customization.aliasPlaceholder')}
        bind:value={aliasDraft}
      />
      <p class="text-xs text-muted-foreground">{$t('accountHub.customization.aliasHint')}</p>
    </div>

    <div class="space-y-1.5">
      <Label>{$t('accountHub.customization.tags')}</Label>
      <TagInput placeholder={$t('accountHub.customization.tagsPlaceholder')} bind:items={tagsDraft} />
      <p class="text-xs text-muted-foreground">{$t('accountHub.customization.tagsHint')}</p>
    </div>

    <Button disabled={!selectedAccountId} onclick={saveAccountCustomization} size="sm">
      {$t('accountHub.customization.save')}
    </Button>
  </section>

  <div class="border-t border-border/70"></div>

  <section class="space-y-4">
    <SectionHeading
      description={$t('settings.customization.headerDescription')}
      title={$t('settings.customization.headerTitle')}
    />

    <SettingItem
      description={$t('settings.general.showXrayTickets.description')}
      labelFor="showXrayTickets"
      orientation="horizontal"
      title={$t('settings.general.showXrayTickets.title')}
    >
      <Switch
        id="showXrayTickets"
        checked={$settingsStore.app?.showXrayTickets ?? true}
        onCheckedChange={(checked) => updateAppSetting('showXrayTickets', checked)}
      />
    </SettingItem>

    <SettingItem
      description={$t('settings.general.showStwGold.description')}
      labelFor="showStwGold"
      orientation="horizontal"
      title={$t('settings.general.showStwGold.title')}
    >
      <Switch
        id="showStwGold"
        checked={$settingsStore.app?.showStwGold ?? true}
        onCheckedChange={(checked) => updateAppSetting('showStwGold', checked)}
      />
    </SettingItem>
  </section>
</div>
