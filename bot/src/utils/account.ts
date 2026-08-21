import type { ChatInputCommandInteraction } from 'discord.js';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, EmbedBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AccountData } from '@/fortnite/clients';
import { config } from '@/shared/config';
import { getLinkedAccount } from '@/store/accounts';
import { resolveLanguage } from '@/utils/language';
import { sendError } from '@/utils/send-embed';

const lastHeavy = new Map<string, number>();

export function rateLimit(userId: string, ms = 8_000): boolean {
  const now = Date.now();
  const prev = lastHeavy.get(userId) ?? 0;
  if (now - prev < ms) return false;
  lastHeavy.set(userId, now);
  return true;
}

export async function requireAccount(interaction: ChatInputCommandInteraction): Promise<AccountData | null> {
  const account = getLinkedAccount(interaction.user.id);
  if (account) return account;
  const t = i18next.getFixedT(resolveLanguage(interaction.locale), 'errors');
  await sendError(interaction, { description: t('needLogin'), ephemeral: true });
  return null;
}

export function imageAttachment(buf: Buffer, name: string) {
  return new AttachmentBuilder(buf, { name });
}

export async function replyImage(
  interaction: ChatInputCommandInteraction,
  buf: Buffer,
  filename: string,
  caption?: string,
  extras?: { components?: ActionRowBuilder<ButtonBuilder>[] }
) {
  const file = imageAttachment(buf, filename);
  const embed = new EmbedBuilder()
    .setColor(config.embedColors.default)
    .setDescription(caption || null)
    .setImage(`attachment://${filename}`);
  const payload = { embeds: [embed], files: [file], components: extras?.components ?? [] };
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  return interaction.reply(payload);
}
