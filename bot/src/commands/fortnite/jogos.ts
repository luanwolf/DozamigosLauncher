import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js';
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
import { config } from '@/shared/config';
import { getLinkedAccount } from '@/store/accounts';
import { rateLimit } from '@/utils/account';
import { sendError } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

function untilLabel(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

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

function gameEmbed(game: FreeGame, t: TFunction<'commands'>) {
  const original = formatBRL(game.originalPrice);
  const current = game.currentPrice === 0 ? t('gratis.free') : formatBRL(game.currentPrice);
  const embed = new EmbedBuilder()
    .setColor(config.embedColors.default)
    .setTitle(game.title)
    .setURL(game.storeUrl)
    .addFields(
      { name: t('gratis.original'), value: original, inline: true },
      { name: t('gratis.current'), value: `**${current}**`, inline: true },
      { name: t('gratis.until'), value: untilLabel(game.endDate), inline: false }
    );
  if (game.description) embed.setDescription(game.description.slice(0, 300));
  if (game.cover) embed.setImage(game.cover);
  return embed;
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
      new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel(t('gratis.claim'))
    );

    const embeds = games.slice(0, 10).map((game) => gameEmbed(game, t));
    embeds[0]?.setFooter({
      text: account ? t('gratis.captionLoggedIn', { name: account.displayName }) : t('gratis.caption')
    });

    return interaction.editReply({ embeds, components: [row] });
  }
});
