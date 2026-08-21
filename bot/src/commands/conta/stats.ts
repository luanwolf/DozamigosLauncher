import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { fetchBrStats } from '@/fortnite/stats';
import { config } from '@/shared/config';
import { requireAccount } from '@/utils/account';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('stats'),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    await interaction.deferReply();
    const stats = await fetchBrStats(account);
    const embed = new EmbedBuilder()
      .setColor(config.embedColors.default)
      .setTitle(stats.displayName)
      .addFields(
        { name: t('stats.wins'), value: String(stats.wins), inline: true },
        { name: t('stats.kills'), value: String(stats.kills), inline: true },
        { name: 'K/D', value: stats.kd.toFixed(2), inline: true },
        { name: t('stats.matches'), value: String(stats.matches), inline: true },
        { name: t('stats.winRate'), value: `${stats.winRate.toFixed(1)}%`, inline: true }
      );
    return interaction.editReply({ embeds: [embed] });
  }
});
