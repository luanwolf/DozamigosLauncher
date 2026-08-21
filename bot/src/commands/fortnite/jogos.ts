import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import type { TFunction } from 'i18next';
import { getCachedToken, getExchangeCode } from '@/fortnite/auth';
import {
  buildExchangeClaimUrl,
  buildStorePurchaseUrl,
  fetchFreeGames,
  fitDiscordUrl,
  formatBRL,
  type FreeGame
} from '@/fortnite/free-games';
import { getLinkedAccount } from '@/store/accounts';
import { discordTime } from '@/ui/theme';
import type { UiCard } from '@/ui/message';
import { rateLimit } from '@/utils/account';
import { sendCards, sendError } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

async function claimUrl(games: { namespace: string; id: string }[], userId: string) {
  const purchase = buildStorePurchaseUrl(games);
  const account = getLinkedAccount(userId);
  if (!account) return purchase;
  try {
    const token = await getCachedToken(account);
    const code = await getExchangeCode(token);
    return fitDiscordUrl(buildExchangeClaimUrl(code, purchase), purchase);
  } catch {
    return purchase;
  }
}

function gameCard(game: FreeGame, t: TFunction<'commands'>, footer?: string): UiCard {
  const original = formatBRL(game.originalPrice);
  const current = game.currentPrice === 0 ? t('gratis.free') : formatBRL(game.currentPrice);
  return {
    title: game.title,
    description: game.description ? game.description.slice(0, 300) : undefined,
    image: game.cover || undefined,
    footer,
    fields: [
      { name: t('gratis.original'), value: `~~${original}~~`, inline: true },
      { name: t('gratis.current'), value: `**${current}**`, inline: true },
      {
        name: t('gratis.until'),
        value: `${discordTime(game.endDate, 'F')} · ${discordTime(game.endDate, 'R')}`
      }
    ]
  };
}

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('jogos')
    .setDescription('Epic Games Store')
    .addSubcommand((s) => s.setName('gratis').setDescription('Epic Store free games')),
  config: { category: 'fortnite' },
  run: async ({ interaction, t }) => {
    if (!rateLimit(interaction.user.id)) return sendError(interaction, t('slowDown', { ns: 'errors' }));
    await interaction.deferReply();
    const games = await fetchFreeGames();
    if (!games.length) return sendError(interaction, t('gratis.empty'));

    const account = getLinkedAccount(interaction.user.id);
    const url = await claimUrl(games, interaction.user.id);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel(t('gratis.claim')).setEmoji('🎁')
    );

    const cards = games.slice(0, 10).map((game, i) =>
      gameCard(
        game,
        t,
        i === 0
          ? account
            ? t('gratis.captionLoggedIn', { name: account.displayName })
            : t('gratis.caption')
          : undefined
      )
    );

    return sendCards(interaction, cards, { components: [row] });
  }
});
