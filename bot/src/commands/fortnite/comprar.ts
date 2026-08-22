import { SlashCommandBuilder } from 'discord.js';
import { askConfirm } from '@/confirm';
import { purchaseCatalogEntry } from '@/fortnite/mcp';
import { fetchShop } from '@/fortnite/public';
import { requireAccount } from '@/utils/account';
import { sendError } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('Buy a shop item')
    .addStringOption((o) => o.setName('item').setDescription('Shop item').setRequired(true).setAutocomplete(true)),
  config: { category: 'fortnite' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    const offerId = interaction.options.getString('item', true);
    const shop = await fetchShop();
    const offer = shop.offers.find((o) => o.offerId === offerId);
    if (!offer) return sendError(interaction, t('comprar.notFound'));
    return askConfirm(interaction, {
      description: t('comprar.confirm', { name: offer.name, price: offer.price }),
      run: async () => {
        await purchaseCatalogEntry(account, offer.offerId, offer.price);
        return t('comprar.ok', { name: offer.name, price: offer.price });
      }
    });
  },
  autocomplete: async ({ interaction }) => {
    const q = interaction.options.getFocused().toLowerCase();
    const shop = await fetchShop().catch(() => null);
    const offers = (shop?.offers ?? [])
      .filter((o) => !q || o.name.toLowerCase().includes(q))
      .slice(0, 25);
    return interaction.respond(offers.map((o) => ({ name: `${o.name} (${o.price})`.slice(0, 100), value: o.offerId })));
  }
});
