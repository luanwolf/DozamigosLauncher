import { SlashCommandBuilder } from 'discord.js';
import { askConfirm } from '@/confirm';
import { redeemCode } from '@/fortnite/actions';
import { requireAccount } from '@/utils/account';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('codigo')
    .setDescription('Redeem an Epic code')
    .addStringOption((o) => o.setName('codigo').setDescription('Code').setRequired(true)),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    const code = interaction.options.getString('codigo', true);
    return askConfirm(interaction, {
      description: t('codigo.confirm', { code }),
      run: async () => {
        await redeemCode(account, code);
        return t('codigo.ok');
      }
    });
  }
});
