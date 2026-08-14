<script lang="ts">
  import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
  import XIcon from '@lucide/svelte/icons/x';
  import { open } from '@tauri-apps/plugin-dialog';
  import { Input, type InputProps } from '$components/ui/input';

  type Props = Omit<InputProps, 'onchange' | 'value' | 'files'> & {
    title?: string;
    value?: string | undefined;
    defaultPath?: string;
    onchange?: (path: string) => void;
    showClearButton?: boolean;
  };

  let { title, defaultPath, value = $bindable(), onchange, showClearButton = true, ...restProps }: Props = $props();

  async function handleClick() {
    const folderPath = await open({
      directory: true,
      multiple: false,
      title,
      defaultPath
    });

    if (!folderPath) return;

    value = folderPath;
    onchange?.(folderPath);
  }

  function handleClear() {
    value = undefined;
    onchange?.('');
  }
</script>

<div class="flex gap-2">
  <div class="relative flex-1">
    <Input
      {...restProps}
      class="pr-8 hover:cursor-pointer"
      onclick={handleClick}
      onkeydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      readonly
      bind:value
    />

    {#if value && showClearButton}
      <button
        class="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        onclick={handleClear}
        type="button"
      >
        <XIcon class="size-4" />
      </button>
    {/if}
  </div>

  <button
    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
    onclick={handleClick}
    title={title}
    type="button"
  >
    <FolderOpenIcon class="size-4" />
  </button>
</div>
