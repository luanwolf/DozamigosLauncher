import { SlashCommandBuilder } from 'discord.js';
import { fetchBrStats } from '@/fortnite/stats';
import { requireAccount } from '@/utils/account';
import { sendInfo } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('stats'),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    await interaction.deferReply();
    const stats = await fetchBrStats(account);
    return sendInfo(interaction, {
      title: stats.displayName,
      fields: [
        { name: t('stats.wins'), value: `\`${stats.wins}\`` },
        { name: t('stats.kills'), value: `\`${stats.kills}\`` },
        { name: 'K/D', value: `\`${stats.kd.toFixed(2)}\`` },
        { name: t('stats.matches'), value: `\`${stats.matches}\`` },
        { name: t('stats.winRate'), value: `\`${stats.winRate.toFixed(1)}%\`` }
      ]
    });
  }
});
