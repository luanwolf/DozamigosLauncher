import { SlashCommandBuilder } from 'discord.js';
import { renderSpriteAlbum } from '@/canvas/sprites';
import { fetchSpriteAccountState, ownedKeysFromState } from '@/fortnite/sprites';
import { rateLimit, replyImage, requireAccount } from '@/utils/account';
import { sendError } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('elementais'),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    if (!rateLimit(interaction.user.id, 12_000)) return sendError(interaction, t('slowDown', { ns: 'errors' }));
    await interaction.deferReply();
    const state = await fetchSpriteAccountState(account);
    const buf = await renderSpriteAlbum({
      accountLabel: account.displayName,
      ownedKeys: ownedKeysFromState(state),
      levels: state.levels,
      resources: state.resources
    });
    return replyImage(interaction, buf, 'elementais.webp', t('elementais.caption', { name: account.displayName }));
  }
});
