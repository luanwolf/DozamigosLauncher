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
      fields: [
        { name: t('ping.roundtrip'), value: `\`${latency}ms\`` },
        { name: t('ping.gateway'), value: `\`${interaction.client.ws.ping}ms\`` }
      ]
    });
  }
});
