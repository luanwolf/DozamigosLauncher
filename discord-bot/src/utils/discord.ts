import { AttachmentBuilder, EmbedBuilder, type ChatInputCommandInteraction, type User } from 'discord.js';
import { formatEpicError } from '@/core/EpicAPIError';
import type { AccountData } from '@/core/types';
import { getActiveAccount } from '@/storage/accounts';

export function requireAccount(interaction: ChatInputCommandInteraction): AccountData | null {
  const account = getActiveAccount(interaction.user.id);
  if (!account) {
    interaction.reply({
      content: '❌ Você precisa fazer login primeiro. Use `/login` para conectar sua conta Epic.',
      ephemeral: true
    });
    return null;
  }
  return account;
}

export async function sendEpicError(
  interaction: {
    deferred?: boolean;
    replied?: boolean;
    editReply: (options: Record<string, unknown>) => Promise<unknown>;
    reply: (options: Record<string, unknown>) => Promise<unknown>;
  },
  error: unknown
) {
  const message = formatEpicError(error);
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content: `❌ ${message}`, embeds: [], components: [], files: [] });
  } else {
    await interaction.reply({ content: `❌ ${message}`, ephemeral: true });
  }
}

export async function sendToDm(user: User, content: string) {
  try {
    await user.send(content);
    return true;
  } catch {
    return false;
  }
}

export function truncate(text: string, max = 4000): string {
  return text.length <= max ? text : text.slice(0, max - 3) + '...';
}

export { AttachmentBuilder, EmbedBuilder };
