import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { fetchVbucks } from '@/fortnite/vbucks';
import { config } from '@/shared/config';
import { requireAccount } from '@/utils/account';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('vbucks'),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    await interaction.deferReply();
    const v = await fetchVbucks(account);
    const embed = new EmbedBuilder()
      .setColor(config.embedColors.default)
      .setTitle(t('vbucks.title'))
      .setDescription(`**${v.total.toLocaleString('pt-BR')}**`)
      .addFields(
        { name: t('vbucks.purchased'), value: String(v.purchased), inline: true },
        { name: t('vbucks.earned'), value: String(v.earned), inline: true },
        { name: t('vbucks.other'), value: String(v.other), inline: true },
        { name: t('vbucks.platform'), value: v.platform, inline: true }
      );
    return interaction.editReply({ embeds: [embed] });
  }
});
