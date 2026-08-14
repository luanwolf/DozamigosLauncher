import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { EmbedColors } from '@/config/colors';
import { ASSETS } from '@/config/paths';
import { fetchShop, shopItemToGridCard } from '@/core/shop';
import { renderFullShop } from '@/images/shop-grid';
import { fetchStwStore, stwOfferToGridCard } from '@/stw/catalog';
import { refreshButton } from '@/ui/buttons';
import type { AccountData } from '@/core/types';

export async function buildBrShopPayload(locale: string) {
  const shop = await fetchShop(locale);

  const buffer = await renderFullShop({
    title: 'Loja de Itens — Battle Royale',
    subtitle: `${shop.offers.length} itens · ${shop.sections.length} seções · ${new Date(shop.lastUpdated).toLocaleString('pt-BR')}`,
    accentColor: '#5865f2',
    cols: 6,
    width: 1140,
    cardHeight: 148,
    sections: shop.sections.map((s) => ({
      title: `${s.name} (${s.items.length})`,
      items: s.items.map(shopItemToGridCard)
    }))
  });

  const attachment = new AttachmentBuilder(buffer, { name: 'loja-br.png' });
  const embed = new EmbedBuilder()
    .setColor(EmbedColors.br)
    .setTitle('🛒 Loja de Itens — Battle Royale')
    .setDescription(`**${shop.offers.length}** itens em **${shop.sections.length}** seções`)
    .setImage('attachment://loja-br.png')
    .setFooter({ text: `Atualizado: ${new Date(shop.lastUpdated).toLocaleString('pt-BR')}` })
    .setTimestamp(new Date(shop.lastUpdated));

  return {
    embeds: [embed],
    files: [attachment],
    components: [refreshButton('br', locale)]
  };
}

export async function buildStwShopPayload(account: AccountData, locale: string) {
  const store = await fetchStwStore(account, locale);
  const totalOffers = store.sections.reduce((n, s) => n + s.offers.length, 0);

  const buffer = await renderFullShop({
    title: 'Loja — Save the World',
    subtitle: `Gold: ${store.gold.toLocaleString('pt-BR')} · ${totalOffers} ofertas · Expira ${new Date(store.expiration).toLocaleString('pt-BR')}`,
    accentColor: '#e67e22',
    cols: 5,
    width: 980,
    cardHeight: 168,
    sections: store.sections.map((s) => ({
      title: `${s.name} (${s.offers.length})`,
      items: s.offers.map(stwOfferToGridCard)
    }))
  });

  const attachment = new AttachmentBuilder(buffer, { name: 'loja-stw.png' });
  const embed = new EmbedBuilder()
    .setColor(EmbedColors.stw)
    .setTitle('🏪 Loja — Save the World')
    .setDescription(`**${totalOffers}** ofertas · **${store.gold.toLocaleString('pt-BR')}** Gold`)
    .setImage('attachment://loja-stw.png')
    .setFooter({ text: account.displayName })
    .setTimestamp(new Date(store.expiration));

  return {
    embeds: [embed],
    files: [attachment],
    components: [refreshButton('stw', locale)]
  };
}

export function vbucksEmbed(
  account: AccountData,
  balance: { purchased: number; earned: number; total: number }
) {
  return new EmbedBuilder()
    .setColor(EmbedColors.br)
    .setTitle(`💎 V-Bucks — ${account.displayName}`)
    .setThumbnail(`attachment://vbucks.png`)
    .addFields(
      { name: 'Comprados', value: balance.purchased.toLocaleString('pt-BR'), inline: true },
      { name: 'Ganhos (STW)', value: balance.earned.toLocaleString('pt-BR'), inline: true },
      { name: 'Total', value: `**${balance.total.toLocaleString('pt-BR')}**`, inline: true }
    );
}

export function vbucksAttachment() {
  return new AttachmentBuilder(ASSETS.vbucks, { name: 'vbucks.png' });
}
