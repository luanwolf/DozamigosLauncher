import { SlashCommandBuilder } from 'discord.js';
import { sendInfo } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('ping'),
  config: {
    category: 'bot'
  },
  run: async ({ interaction, t }) => {
    const start = performance.now();
    await interaction.deferReply();
    const latency = Math.round(performance.now() - start);

    return sendInfo(interaction, {
      title: t('ping.pong'),
      description: `${t('ping.roundtrip')}: **${latency}ms**\n${t('ping.gateway')}: **${interaction.client.ws.ping}ms**`
    });
  }
});
