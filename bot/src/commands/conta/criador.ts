import { SlashCommandBuilder } from 'discord.js';
import { askConfirm } from '@/confirm';
import { currentCreator, lookupCreator, setCreator } from '@/fortnite/actions';
import { requireAccount } from '@/utils/account';
import { sendError, sendSuccess } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('criador')
    .setDescription('Support-a-Creator')
    .addStringOption((o) => o.setName('codigo').setDescription('Creator code')),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    const code = interaction.options.getString('codigo');
    if (!code) {
      await interaction.deferReply();
      const current = await currentCreator(account);
      return sendSuccess(interaction, current ? t('criador.current', { code: current }) : t('criador.none'));
    }
    const info = await lookupCreator(code);
    if (!info) return sendError(interaction, t('criador.invalid'));
    return askConfirm(interaction, {
      description: t('criador.confirm', { code: info.code, name: info.displayName }),
      run: async () => {
        await setCreator(account, info.code);
        return t('criador.ok', { code: info.code });
      }
    });
  }
});
