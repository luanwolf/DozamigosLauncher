import { SlashCommandBuilder } from 'discord.js';
import { renderGrid } from '@/canvas/grid';
import { CATEGORY_LABEL, fetchLockerCategory, LOCKER_CATEGORIES, type LockerCategory } from '@/fortnite/locker';
import { rateLimit, replyImage, requireAccount } from '@/utils/account';
import { sendError } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('vestiario')
    .setDescription('Locker collage')
    .addStringOption((o) =>
      o
        .setName('categoria')
        .setDescription('Category')
        .setRequired(true)
        .addChoices(...LOCKER_CATEGORIES.map((c) => ({ name: CATEGORY_LABEL[c], value: c })))
    ),
  config: { category: 'conta' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    if (!rateLimit(interaction.user.id, 12_000)) return sendError(interaction, t('slowDown', { ns: 'errors' }));
    await interaction.deferReply();
    const category = interaction.options.getString('categoria', true) as LockerCategory;
    const items = await fetchLockerCategory(account, category);
    if (!items.length) return sendError(interaction, t('vestiario.empty'));
    const buf = await renderGrid({
      title: account.displayName,
      subtitle: `${items.length} ${CATEGORY_LABEL[category]}`,
      items: items.map((i) => ({
        name: i.name,
        imageUrl: i.imageUrl,
        rarity: i.rarity,
        series: i.series
      })),
      cell: 132
    });
    return replyImage(interaction, buf, `vestiario-${category}.webp`);
  }
});
