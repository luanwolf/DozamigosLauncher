import { SlashCommandBuilder } from 'discord.js';
import { fetchLeaks, groupLeaksByDay } from '@/fortnite/public';
import { renderGrid } from '@/canvas/grid';
import { rateLimit, replyImage } from '@/utils/account';
import { sendError } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('vazamentos'),
  config: { category: 'fortnite' },
  run: async ({ interaction, t }) => {
    if (!rateLimit(interaction.user.id)) return sendError(interaction, t('slowDown', { ns: 'errors' }));
    await interaction.deferReply();
    const leaks = await fetchLeaks();
    const days = groupLeaksByDay(leaks.cosmetics);
    const [day, items] = days[0] ?? ['', leaks.cosmetics];
    const slice = (items ?? []).slice(0, 80);
    if (!slice.length) return sendError(interaction, t('vazamentos.empty'));
    const buf = await renderGrid({
      title: t('vazamentos.title'),
      subtitle: `${leaks.build} · ${day}`,
      items: slice.map((c) => ({
        name: c.name,
        imageUrl: c.image,
        rarity: c.rarity,
        series: c.series
      })),
      cell: 140,
      maxCols: 12
    });
    return replyImage(interaction, buf, 'vazamentos.webp', t('vazamentos.caption', { count: slice.length }));
  }
});
