import { SlashCommandBuilder } from 'discord.js';
import { fetchServerStatus } from '@/fortnite/public';
import { sendInfo } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('status'),
  config: { category: 'fortnite' },
  run: async ({ interaction, t }) => {
    await interaction.deferReply();
    const status = await fetchServerStatus();
    const up = /up|online|operational/i.test(`${status.fortnite} ${status.epic}`);
    return sendInfo(interaction, {
      title: t('status.title'),
      color: up ? '#34D399' : '#FB7185',
      fields: [
        { name: 'Fortnite', value: `\`${status.fortnite}\`` },
        { name: 'Epic', value: status.epic }
      ]
    });
  }
});
