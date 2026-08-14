<script lang="ts" module>
  import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
  import { tv, type VariantProps } from 'tailwind-variants';
  import { cn, type WithElementRef } from '$lib/utils';

  export const inputVariants = tv({
    base: [
      'flex w-full min-w-0 rounded-md border outline-none',
      'transition-[color,box-shadow]',

      'border-input bg-card/60 text-sm',
      'placeholder:text-muted-foreground',

      'selection:bg-primary selection:text-primary-foreground',

      'disabled:cursor-not-allowed disabled:opacity-50',
      'aria-invalid:border-destructive',
      'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',

      'focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40'
    ],
    variants: {
      size: {
        default: 'h-8 px-2.5 py-1',
        sm: 'h-7 px-2 text-xs',
        lg: 'h-9 px-3'
      },
      file: {
        true: 'bg-transparent pt-1.5 text-sm font-medium',
        false: ''
      }
    },
    defaultVariants: {
      size: 'default',
      file: false
    }
  });

  export type InputVariants = VariantProps<typeof inputVariants>;
  export type InputVariant = InputVariants['size'];
  export type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

  export type InputProps = WithElementRef<
    Omit<HTMLInputAttributes, 'type'> & ({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
  > &
    InputVariants;
</script>

<script lang="ts">
  let {
    ref = $bindable(),
    value = $bindable(),
    type,
    files = $bindable(),
    size,
    class: className,
    'data-slot': dataSlot = 'input',
    ...restProps
  }: InputProps = $props();
</script>

{#if type === 'file'}
  <input
    bind:this={ref}
    class={cn(inputVariants({ size, file: true }), className)}
    data-slot={dataSlot}
    type="file"
    bind:files
    bind:value
    {...restProps}
  />
{:else}
  <input
    bind:this={ref}
    class={cn(inputVariants({ size, file: false }), className)}
    data-slot={dataSlot}
    {type}
    bind:value
    {...restProps}
  />
{/if}
