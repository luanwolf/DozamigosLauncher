import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { fetchSeasonInfo } from '@/fortnite/public';
import { config } from '@/shared/config';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('temporada'),
  config: { category: 'fortnite' },
  run: async ({ interaction, t }) => {
    await interaction.deferReply();
    const season = await fetchSeasonInfo();
    const embed = new EmbedBuilder()
      .setColor(config.embedColors.default)
      .setTitle(season.name)
      .setDescription(
        season.daysRemaining != null
          ? t('temporada.days', { days: season.daysRemaining })
          : t('temporada.current')
      );
    return interaction.editReply({ embeds: [embed] });
  }
});
