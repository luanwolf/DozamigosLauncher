import { SlashCommandBuilder } from 'discord.js';
import { askConfirm } from '@/confirm';
import { claimMfa } from '@/fortnite/actions';
import { requireAccount } from '@/utils/account';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('mfa')
    .setDescription('Claim 2FA reward')
    .addStringOption((o) =>
      o.setName('modo').setDescription('BR or STW').setRequired(true).addChoices({ name: 'BR', value: 'br' }, { name: 'STW', value: 'stw' })
    ),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    const modo = interaction.options.getString('modo', true);
    return askConfirm(interaction, {
      description: t('mfa.confirm', { modo: modo.toUpperCase() }),
      run: async () => {
        await claimMfa(account, modo === 'stw');
        return t('mfa.ok');
      }
    });
  }
});
