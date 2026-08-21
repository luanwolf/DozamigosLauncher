import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { fetchServerStatus } from '@/fortnite/public';
import { config } from '@/shared/config';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('status'),
  config: { category: 'fortnite' },
  run: async ({ interaction, t }) => {
    await interaction.deferReply();
    const status = await fetchServerStatus();
    const embed = new EmbedBuilder()
      .setColor(config.embedColors.default)
      .setTitle(t('status.title'))
      .addFields(
        { name: 'Fortnite', value: status.fortnite, inline: true },
        { name: 'Epic', value: status.epic, inline: true }
      );
    return interaction.editReply({ embeds: [embed] });
  }
});
