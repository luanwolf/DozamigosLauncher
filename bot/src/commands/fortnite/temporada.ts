import { SlashCommandBuilder } from 'discord.js';
import { fetchSeasonInfo } from '@/fortnite/public';
import { sendInfo } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('temporada'),
  config: { category: 'fortnite' },
  run: async ({ interaction, t }) => {
    await interaction.deferReply();
    const season = await fetchSeasonInfo();
    return sendInfo(interaction, {
      title: season.name,
      description:
        season.daysRemaining != null ? t('temporada.days', { days: season.daysRemaining }) : t('temporada.current')
    });
  }
});
