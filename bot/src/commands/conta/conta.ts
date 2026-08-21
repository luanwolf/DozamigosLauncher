import { SlashCommandBuilder } from 'discord.js';
import { fetchAccountOverview } from '@/fortnite/overview';
import { requireAccount } from '@/utils/account';
import { sendInfo } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('conta'),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    await interaction.deferReply();
    const overview = await fetchAccountOverview(account);
    return sendInfo(interaction, {
      title: account.displayName,
      fields: [
        {
          name: t('conta.br'),
          value: [
            `${t('conta.level')}: \`${overview.br.accountLevel}\``,
            `${t('conta.season')}: \`${overview.br.seasonNumber}\``,
            `${t('conta.pass')}: \`${overview.br.battlePassLevel}${overview.br.battlePassOwned ? ' ✓' : ''}\``
          ].join('\n')
        },
        {
          name: t('conta.stw'),
          value: overview.stw
            ? `${t('conta.level')}: \`${overview.stw.accountLevel}\`\n${t('conta.matches')}: \`${overview.stw.matchesPlayed}\``
            : t('conta.noStw')
        },
        {
          name: t('conta.platform'),
          value: `\`${overview.mtxPlatform}\`\nMFA: ${overview.mfaEnabled ? '`✓`' : '—'}`
        }
      ]
    });
  }
});
