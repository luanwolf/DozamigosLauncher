import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { fetchAccountOverview } from '@/fortnite/overview';
import { config } from '@/shared/config';
import { requireAccount } from '@/utils/account';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('conta'),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    await interaction.deferReply();
    const overview = await fetchAccountOverview(account);
    const embed = new EmbedBuilder()
      .setColor(config.embedColors.default)
      .setTitle(account.displayName)
      .addFields(
        {
          name: t('conta.br'),
          value: [
            `${t('conta.level')}: ${overview.br.accountLevel}`,
            `${t('conta.season')}: ${overview.br.seasonNumber}`,
            `${t('conta.pass')}: ${overview.br.battlePassLevel}${overview.br.battlePassOwned ? ' ✓' : ''}`
          ].join('\n'),
          inline: true
        },
        {
          name: t('conta.stw'),
          value: overview.stw
            ? `${t('conta.level')}: ${overview.stw.accountLevel}\n${t('conta.matches')}: ${overview.stw.matchesPlayed}`
            : t('conta.noStw'),
          inline: true
        },
        {
          name: t('conta.platform'),
          value: `${overview.mtxPlatform}\nMFA: ${overview.mfaEnabled ? '✓' : '—'}`,
          inline: true
        }
      );
    return interaction.editReply({ embeds: [embed] });
  }
});
