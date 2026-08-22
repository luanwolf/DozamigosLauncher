import { SlashCommandBuilder } from 'discord.js';
import { deleteDeviceAuth } from '@/fortnite/auth';
import { deleteLinkedAccount, getLinkedAccount } from '@/store/accounts';
import { sendError, sendSuccess } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('logout'),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    const account = getLinkedAccount(interaction.user.id);
    if (!account) return sendError(interaction, t('needLogin', { ns: 'errors' }));
    await deleteDeviceAuth(account).catch(() => null);
    deleteLinkedAccount(interaction.user.id);
    return sendSuccess(interaction, t('logout.ok', { name: account.displayName }));
  }
});
