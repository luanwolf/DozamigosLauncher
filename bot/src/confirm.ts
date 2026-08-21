import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  MessageFlags
} from 'discord.js';

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
    new ButtonBuilder().setCustomId(`ok:${id}`).setLabel(confirmLabel).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`no:${id}`).setLabel(cancelLabel).setStyle(ButtonStyle.Secondary)
  );
}

function embed(description: string, color: number = 0x5865f2) {
  return new EmbedBuilder().setColor(color).setDescription(description);
}

export async function askConfirm(
  interaction: ChatInputCommandInteraction,
  opts: { description: string; run: () => Promise<string>; confirmLabel?: string; cancelLabel?: string }
) {
  const id = nonce();
  rememberConfirm(id, interaction.user.id, opts.run);
  const row = confirmRow(id, opts.confirmLabel ?? 'Confirmar', opts.cancelLabel ?? 'Cancelar');
  const payload = { embeds: [embed(opts.description)], components: [row] };
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
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
    return interaction.reply({
      embeds: [embed(description, 0xf04a47)],
      flags: MessageFlags.Ephemeral
    });
  }

  pending.delete(resolved.id);
  if (resolved.kind === 'no') {
    return interaction.update({
      embeds: [embed('Cancelado.', 0xf04a47)],
      components: []
    });
  }

  await interaction.deferUpdate();
  try {
    const message = await resolved.item.run();
    await interaction.editReply({
      embeds: [embed(message, 0x56b849).setTitle('Pronto')],
      components: []
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await interaction.editReply({
      embeds: [embed(detail, 0xf04a47).setTitle('Erro')],
      components: []
    });
  }
}

export function isConfirmButton(customId: string) {
  return customId.startsWith('ok:') || customId.startsWith('no:');
}
