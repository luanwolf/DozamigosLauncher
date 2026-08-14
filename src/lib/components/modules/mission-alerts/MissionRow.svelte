<script lang="ts">
  import {
    DefaultMissionZoneIcon,
    TheaterColors,
    TheaterLetters,
    TheaterNames,
    ZoneCategoriesWithoutIcon,
    ZoneNames
  } from '$lib/constants/stw/world-info';
  import { language, t } from '$lib/i18n';
  import { getMissionDisplayName } from '$lib/utils/mission-zone-name';
  import { accountStore } from '$lib/storage';
  import { claimedAlerts } from '$lib/stores';
  import type { ParsedWorldMission } from '$types/game/stw/world-info';

  const activeAccount = accountStore.getActiveStore(true);

  type Props = {
    mission: ParsedWorldMission;
  };

  type Reward = ParsedWorldMission['rewards'][number] | NonNullable<ParsedWorldMission['alert']>['rewards'][number];
  type Indexable = Record<string, string>;

  const { mission }: Props = $props();

  const zoneName = $derived(
    getMissionDisplayName(mission, $language, $ZoneNames as Indexable, $t('quest'), $t('stwMissionAlerts.unknownMission'))
  );
  const zoneIconUrl = $derived(
    mission.zone.type.id && ZoneCategoriesWithoutIcon.has(mission.zone.type.id)
      ? DefaultMissionZoneIcon
      : mission.zone.type.imageUrl
  );

  function onZoneIconError(event: Event) {
    const img = event.currentTarget as HTMLImageElement;
    if (img.src.includes(DefaultMissionZoneIcon)) return;
    img.src = DefaultMissionZoneIcon;
  }
  const theaterName = $derived(($TheaterNames as Indexable)[mission.theaterId]);
  const theaterColor = $derived((TheaterColors as Indexable)[mission.theaterId] || TheaterColors.Ventures);
  const theaterLetter = $derived((TheaterLetters as Indexable)[mission.theaterId] || TheaterLetters.Ventures);
  const isClaimed = $derived(
    !!$activeAccount && claimedAlerts.get($activeAccount.accountId)?.has(mission.alert?.guid || '')
  );
</script>

<div class="hud-list-item-interactive flex-col gap-1 xl:flex-row xl:items-center xl:gap-2 xl:py-2">
  <div
    style="border-color: {theaterColor}; color: {theaterColor}"
    class="hidden size-5 items-center justify-center rounded border text-sm select-none xl:flex"
    title={theaterName}
  >
    {theaterLetter}
  </div>

  <div class="flex items-center gap-2 xl:contents">
    <img class="size-6 xl:size-5" alt={zoneName} onerror={onZoneIconError} src={zoneIconUrl} />
    <span class="text-xs font-semibold text-muted-foreground xl:w-8">
      ⚡{mission.powerLevel}
    </span>

    <span
      class="truncate text-xs font-medium text-foreground xl:w-36"
      class:text-green-600={isClaimed}
      class:dark:text-green-500={isClaimed}
    >
      {zoneName}
    </span>

    {#if isClaimed}
      <span class="shrink-0 rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-500">
        {$t('stwMissionAlerts.claimed')}
      </span>
    {/if}

    <span style="color: {theaterColor}" class="ml-auto text-xs font-medium xl:hidden">
      {theaterName}
    </span>
  </div>

  <div class="pl-8 xl:contents">
    <div class="flex items-center gap-1.5 xl:contents">
      <div class="flex w-60 flex-wrap items-center gap-x-1.5 gap-y-0.5 overflow-x-auto not-xl:w-fit">
        {#if mission.alert?.rewards?.length}
          {@render InlineRewards(mission.alert!.rewards, true)}
        {:else}
          <div class="hidden not-xl:contents">
            {@render InlineRewards(mission.rewards)}
          </div>
        {/if}
      </div>

      <div class="hidden flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 overflow-x-auto xl:flex">
        {@render InlineRewards(mission.rewards)}
      </div>

      {#if mission.modifiers?.length}
        <div class="ml-auto flex items-center gap-0.5 xl:ml-0">
          {#each mission.modifiers as modifier (modifier.id)}
            <img class="size-5" alt="Modifier icon" src={modifier.imageUrl} />
          {/each}
        </div>
      {/if}
    </div>

    {#if mission.alert?.rewards?.length}
      <div class="flex items-center gap-1.5 xl:hidden">
        {@render InlineRewards(mission.rewards)}
      </div>
    {/if}
  </div>
</div>

{#snippet InlineRewards(rewards: Reward[], alert = false)}
  {#each rewards as reward (reward.itemId)}
    <span class="flex items-center gap-0.75">
      <img class="size-5" alt="Reward icon" src={reward.imageUrl} />
      {#if reward.quantity > 1}
        <span class="text-xs text-muted-foreground">
          {reward.quantity.toLocaleString($language)}{!alert ? 'x' : ''}
        </span>
      {/if}
    </span>
  {/each}
{/snippet}
