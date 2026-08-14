<script lang="ts" module>
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
  import { tv, type VariantProps } from 'tailwind-variants';
  import { cn, type WithElementRef } from '$lib/utils';

  export const buttonVariants = tv({
    base: "focus-visible:border-ring focus-visible:ring-ring/40 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 rounded-none text-sm font-semibold leading-none tracking-wide whitespace-nowrap transition-[color,background-color,border-color,transform] outline-none focus-visible:ring-[2px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 active:translate-y-px",
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 [clip-path:polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 [clip-path:polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]',
        outline:
          'border border-border bg-transparent text-foreground hover:border-primary/60 hover:bg-accent/60 hover:text-accent-foreground [clip-path:polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 [clip-path:polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-8 px-3 py-1.5 has-[>svg]:px-2.5',
        sm: 'h-7 gap-1.5 px-2.5 text-xs has-[>svg]:px-2',
        lg: 'h-10 px-5 text-sm has-[>svg]:px-3',
        icon: 'size-8',
        'icon-sm': 'size-7',
        'icon-lg': 'size-9'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  });

  export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
  export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

  export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
    WithElementRef<HTMLAnchorAttributes> & {
      variant?: ButtonVariant;
      size?: ButtonSize;
      loading?: boolean;
      loadingText?: string;
    };
</script>

<script lang="ts">
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import { ExternalLink } from '$components/ui/external-link';

  let {
    class: className,
    variant = 'default',
    size = 'default',
    ref = $bindable(null),
    href = undefined,
    type = 'button',
    disabled,
    loading = false,
    loadingText = '',
    children,
    ...restProps
  }: ButtonProps = $props();

  const classes = $derived(
    cn(buttonVariants({ variant, size }), loading ? 'flex justify-center items-center gap-x-2' : null, className)
  );
</script>

{#snippet Content()}
  {#if loading}
    <LoaderCircleIcon class="size-5 animate-spin" />
  {/if}

  {#if loading && loadingText}
    {loadingText}
  {:else}
    {@render children?.()}
  {/if}
{/snippet}

{#if href}
  <ExternalLink
    class={classes}
    aria-disabled={disabled}
    data-slot="button"
    href={disabled ? undefined : href}
    role={disabled ? 'link' : undefined}
    tabindex={disabled ? -1 : undefined}
    bind:ref
    {...restProps}
  >
    {@render Content()}
  </ExternalLink>
{:else}
  <button bind:this={ref} class={classes} data-slot="button" {disabled} {type} {...restProps}>
    {@render Content()}
  </button>
{/if}
