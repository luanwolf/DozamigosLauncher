import { SlashCommandBuilder } from 'discord.js';
import { fetchShop, isLeavingToday } from '@/fortnite/public';
import { renderGrid } from '@/canvas/grid';
import { rateLimit, replyImage } from '@/utils/account';
import { sendError } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder().setName('loja'),
  config: { category: 'fortnite' },
  run: async ({ interaction, t }) => {
    if (!rateLimit(interaction.user.id)) return sendError(interaction, t('slowDown', { ns: 'errors' }));
    await interaction.deferReply();
    const shop = await fetchShop();
    const buf = await renderGrid({
      title: t('loja.title'),
      subtitle: new Date(shop.lastUpdated).toLocaleDateString('pt-BR'),
      items: shop.offers.map((o) => ({
        name: o.name,
        imageUrl: o.image,
        rarity: o.rarity,
        series: o.series,
        price: String(o.price),
        tag: isLeavingToday(o.outDate) ? t('loja.onlyToday') : undefined
      })),
      cell: 168,
      maxCols: 16
    });
    return replyImage(interaction, buf, 'loja.webp', t('loja.caption', { count: shop.offers.length }));
  }
});
