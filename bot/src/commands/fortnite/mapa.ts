import { SlashCommandBuilder } from 'discord.js';
import { fetchBuffer } from '@/canvas/grid';
import { fetchMapPoisUrl } from '@/fortnite/public';
import { replyImage } from '@/utils/account';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('mapa'),
  config: { category: 'fortnite' },
  run: async ({ interaction, t }) => {
    await interaction.deferReply();
    const url = await fetchMapPoisUrl();
    const buf = await fetchBuffer(url);
    return replyImage(interaction, buf, 'mapa.png', t('mapa.caption'));
  }
});
