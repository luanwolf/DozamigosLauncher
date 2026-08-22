import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { createDeviceCode, pollDeviceLogin } from '@/fortnite/auth';
import { errorDetail } from '@/fortnite/errors';
import { getLinkedAccount, saveLinkedAccount } from '@/store/accounts';
import { sendError, sendInfo, sendSuccess } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('login'),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    if (getLinkedAccount(interaction.user.id)) {
      return sendError(interaction, { description: t('login.already'), ephemeral: true });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const device = await createDeviceCode();
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setURL(device.verification_uri_complete)
        .setLabel(t('login.openEpic'))
        .setEmoji('🔗')
    );

    await sendInfo(interaction, {
      title: t('login.title'),
      description: t('login.prompt', { code: device.user_code }),
      components: [row]
    });

    try {
      const account = await pollDeviceLogin(device.device_code, (device.interval || 5) * 1000, 5 * 60_000);
      saveLinkedAccount(interaction.user.id, account);
      return sendSuccess(interaction, t('login.ok', { name: account.displayName }));
    } catch (error) {
      return sendError(interaction, t('login.fail', { error: errorDetail(error) }));
    }
  }
});
