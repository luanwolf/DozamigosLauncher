<script lang="ts">
  import Volume2Icon from '@lucide/svelte/icons/volume-2';
  import VolumeXIcon from '@lucide/svelte/icons/volume-x';

  type Props = {
    videoUrl: string | null;
    imageUrl: string;
    alt: string;
    rarityStyle: string;
    hasAudio?: boolean;
    muted?: boolean;
    volume?: number;
    poster?: string;
  };

  let {
    videoUrl,
    imageUrl,
    alt,
    rarityStyle,
    hasAudio = false,
    muted = $bindable(true),
    volume = 0.6,
    poster = ''
  }: Props = $props();

  let videoFailed = $state(false);
  /** width / height of the loaded media — the pane sizes to this. */
  let ratio = $state(1);

  $effect(() => {
    videoUrl;
    imageUrl;
    videoFailed = false;
    ratio = 1;
  });

  const showVideo = $derived(!!videoUrl && !videoFailed);

  function applyRatio(w: number, h: number) {
    if (w > 0 && h > 0) ratio = w / h;
  }
</script>

<div
  class="relative shrink-0 overflow-hidden sm:border-r sm:border-border/80"
  style="{rarityStyle};width:min(28rem,92vw,calc(min(70dvh,36rem)*{ratio}));height:min(70dvh,36rem,calc(min(28rem,92vw)/{ratio}))"
>
  {#if showVideo}
    <video
      class="size-full object-cover"
      autoplay
      loop
      muted={muted}
      playsinline
      poster={poster || imageUrl || undefined}
      src={videoUrl ?? undefined}
      onerror={() => {
        videoFailed = true;
      }}
      onloadedmetadata={(event) => {
        applyRatio(event.currentTarget.videoWidth, event.currentTarget.videoHeight);
      }}
      onloadeddata={(event) => {
        if (!hasAudio) return;
        event.currentTarget.volume = volume;
        event.currentTarget.muted = muted;
      }}
    ></video>
    {#if hasAudio}
      <button
        class="absolute right-2 bottom-2 z-10 rounded-sm bg-black/65 p-1.5 text-white hover:bg-black/85"
        aria-label={muted ? 'Ativar som da prévia' : 'Silenciar prévia'}
        onclick={() => (muted = !muted)}
        type="button"
      >
        {#if muted}
          <VolumeXIcon class="size-4" />
        {:else}
          <Volume2Icon class="size-4" />
        {/if}
      </button>
    {/if}
  {:else if imageUrl}
    <img
      class="size-full object-cover"
      {alt}
      src={imageUrl}
      onload={(event) => {
        applyRatio(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
      }}
    />
  {:else}
    <p class="relative z-10 p-4 text-sm text-muted-foreground">{alt}</p>
  {/if}
</div>
