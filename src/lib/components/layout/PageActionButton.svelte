<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Button, type ButtonProps } from '$components/ui/button';

  type Props = Omit<ButtonProps, 'size' | 'variant'> & {
    /** Button label; hidden below `xs` when `hideLabelOnXs` is true. */
    label?: string;
    hideLabelOnXs?: boolean;
    variant?: ButtonProps['variant'];
    size?: ButtonProps['size'];
    children?: Snippet;
  };

  let {
    label,
    hideLabelOnXs = true,
    variant = 'outline',
    size = 'sm',
    children,
    ...rest
  }: Props = $props();
</script>

<Button {size} {variant} {...rest}>
  {@render children?.()}
  {#if label}
    <span class={hideLabelOnXs ? 'max-xs:hidden' : undefined}>{label}</span>
  {/if}
</Button>
