import { SlashCommandBuilder } from 'discord.js';
import { askConfirm } from '@/confirm';
import { claimBattlePassOffers, fetchBattlePass } from '@/fortnite/actions';
import { requireAccount } from '@/utils/account';
import { sendError, sendInfo } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('passe')
    .setDescription('Battle Pass')
    .addSubcommand((s) => s.setName('ver').setDescription('View pending offers'))
    .addSubcommand((s) => s.setName('resgatar').setDescription('Claim battle pass offers')),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    await interaction.deferReply();
    const snap = await fetchBattlePass(account);
    const sub = interaction.options.getSubcommand();
    if (sub === 'ver') {
      const lines = snap.offers.slice(0, 15).map((o) => `• ${o.title} (${o.price})`);
      return sendInfo(interaction, {
        title: t('passe.title'),
        description: [
          t('passe.status', {
            level: snap.level,
            stars: snap.battleStars,
            owned: snap.purchased ? '✓' : '—'
          }),
          lines.length ? lines.join('\n') : t('passe.none')
        ].join('\n')
      });
    }
    if (!snap.offers.length) return sendError(interaction, t('passe.none'));
    const ids = snap.offers.slice(0, 10).map((o) => o.offerId);
    return askConfirm(interaction, {
      description: t('passe.confirm', { count: ids.length }),
      run: async () => {
        await claimBattlePassOffers(account, ids, snap.seasonPassTemplateId);
        return t('passe.ok', { count: ids.length });
      }
    });
  }
});
