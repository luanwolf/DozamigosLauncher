import { SlashCommandBuilder } from 'discord.js';
import { fetchVbucks } from '@/fortnite/vbucks';
import { requireAccount } from '@/utils/account';
import { sendInfo } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('vbucks'),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    await interaction.deferReply();
    const v = await fetchVbucks(account);
    return sendInfo(interaction, {
      title: t('vbucks.title'),
      description: `# ${v.total.toLocaleString('pt-BR')}`,
      fields: [
        { name: t('vbucks.purchased'), value: `\`${v.purchased.toLocaleString('pt-BR')}\`` },
        { name: t('vbucks.earned'), value: `\`${v.earned.toLocaleString('pt-BR')}\`` },
        { name: t('vbucks.other'), value: `\`${v.other.toLocaleString('pt-BR')}\`` },
        { name: t('vbucks.platform'), value: `\`${v.platform}\`` }
      ]
    });
  }
});
