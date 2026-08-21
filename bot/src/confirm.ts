import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction
} from 'discord.js';
import { replyUi } from '@/ui/message';

const TTL_MS = 60_000;

type Pending = {
  userId: string;
  expiresAt: number;
  run: () => Promise<string>;
};

const pending = new Map<string, Pending>();

export function nonce() {
  return crypto.randomUUID().slice(0, 8);
}

export function rememberConfirm(id: string, userId: string, run: () => Promise<string>) {
  pending.set(id, { userId, expiresAt: Date.now() + TTL_MS, run });
}

export function confirmRow(id: string, confirmLabel: string, cancelLabel: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ok:${id}`).setLabel(confirmLabel).setStyle(ButtonStyle.Danger).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`no:${id}`).setLabel(cancelLabel).setStyle(ButtonStyle.Secondary).setEmoji('❌')
  );
}

export async function askConfirm(
  interaction: ChatInputCommandInteraction,
  opts: { description: string; run: () => Promise<string>; confirmLabel?: string; cancelLabel?: string }
) {
  const id = nonce();
  rememberConfirm(id, interaction.user.id, opts.run);
  const row = confirmRow(id, opts.confirmLabel ?? 'Confirmar', opts.cancelLabel ?? 'Cancelar');
  return replyUi(interaction, {
    cards: [{ kind: 'warn', title: 'Confirmar', description: opts.description }],
    rows: [row]
  });
}

/** Pure: who can press, and whether the nonce is still live. */
export function resolveConfirmClick(customId: string, userId: string, now = Date.now()) {
  const [kind, id] = customId.split(':');
  if (!id || (kind !== 'ok' && kind !== 'no')) return { ok: false as const, reason: 'malformed' };
  const item = pending.get(id);
  if (!item) return { ok: false as const, reason: 'missing' };
  if (item.userId !== userId) return { ok: false as const, reason: 'wrong-user' };
  if (now > item.expiresAt) {
    pending.delete(id);
    return { ok: false as const, reason: 'expired' };
  }
  return { ok: true as const, kind: kind as 'ok' | 'no', id, item };
}

export async function handleConfirmButton(interaction: ButtonInteraction) {
  const resolved = resolveConfirmClick(interaction.customId, interaction.user.id);
  if (!resolved.ok) {
    const description =
      resolved.reason === 'wrong-user' ? 'Só quem pediu a ação pode confirmar.' : 'Esse pedido expirou.';
    return replyUi(
      interaction,
      {
        cards: [{ kind: 'error', title: 'Bloqueado', description }],
        ephemeral: true
      },
      'reply'
    );
  }

  pending.delete(resolved.id);
  if (resolved.kind === 'no') {
    return replyUi(
      interaction,
      {
        cards: [{ kind: 'error', title: 'Cancelado', description: 'Nada foi alterado.' }]
      },
      'update'
    );
  }

  await interaction.deferUpdate();
  try {
    const message = await resolved.item.run();
    return replyUi(interaction, {
      cards: [{ kind: 'success', title: 'Pronto', description: message }]
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return replyUi(interaction, {
      cards: [{ kind: 'error', title: 'Erro', description: detail }]
    });
  }
}

export function isConfirmButton(customId: string) {
  return customId.startsWith('ok:') || customId.startsWith('no:');
}
