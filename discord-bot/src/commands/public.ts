import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { searchCosmetic } from '@/core/shop';
import { getLightswitch, getStatusPage } from '@/core/server-status';
import { buildAlertsPayload } from '@/ui/embeds';
import { buildBrShopPayload } from '@/ui/shop-presenter';
import { cosmeticNavButtons } from '@/ui/buttons';
import { brItemColor, EmbedColors } from '@/config/colors';
import { sendEpicError } from '@/utils/discord';

export const lojaCommand = new SlashCommandBuilder()
  .setName('loja')
  .setDescription('Ver a loja completa do Fortnite (imagem)')
  .addStringOption((opt) =>
    opt
      .setName('idioma')
      .setDescription('Idioma da loja')
      .addChoices(
        { name: 'Português', value: 'pt' },
        { name: 'English', value: 'en' },
        { name: 'Español', value: 'es' },
        { name: 'Français', value: 'fr' },
        { name: 'Deutsch', value: 'de' },
        { name: 'Türkçe', value: 'tr' }
      )
  );

export const statusCommand = new SlashCommandBuilder().setName('status').setDescription('Status dos servidores Fortnite/Epic');

export const alertasCommand = new SlashCommandBuilder()
  .setName('alertas')
  .setDescription('Alertas principais STW (imagem como no launcher)');

export const cosmeticCommand = new SlashCommandBuilder()
  .setName('cosmetic')
  .setDescription('Buscar cosmético na API')
  .addStringOption((opt) => opt.setName('nome').setDescription('Nome do cosmético').setRequired(true));

export const commands = [
  lojaCommand.toJSON(),
  statusCommand.toJSON(),
  alertasCommand.toJSON(),
  cosmeticCommand.toJSON()
];

function statusEmbed(
  lightswitch: { status: string; message: string },
  epic?: { components: { name: string; status: string }[]; page?: { updated_at: string } }
) {
  const statusEmoji: Record<string, string> = {
    UP: '🟢', DOWN: '🔴', operational: '🟢', degraded_performance: '🟡', partial_outage: '🟠', major_outage: '🔴'
  };
  const embed = new EmbedBuilder()
    .setTitle('📡 Status dos Servidores')
    .setColor(lightswitch.status === 'UP' ? EmbedColors.success : EmbedColors.error)
    .addFields({
      name: '🎮 Fortnite',
      value: `${statusEmoji[lightswitch.status] ?? '⚪'} **${lightswitch.status}**\n${lightswitch.message}`,
      inline: false
    });
  if (epic?.components?.length) {
    embed.addFields({
      name: '🏛️ Epic Games',
      value: epic.components.slice(0, 10).map((c) => `${statusEmoji[c.status] ?? '⚪'} ${c.name}`).join('\n'),
      inline: false
    });
  }
  if (epic?.page?.updated_at) embed.setTimestamp(new Date(epic.page.updated_at));
  return embed;
}

export async function handleLoja(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  try {
    const locale = interaction.options.getString('idioma') ?? 'pt';
    await interaction.editReply(await buildBrShopPayload(locale));
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}

export async function handleStatus(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  try {
    const [lightswitch, epic] = await Promise.all([getLightswitch(), getStatusPage()]);
    await interaction.editReply({ embeds: [statusEmbed(lightswitch, epic)] });
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}

export async function handleAlertas(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  try {
    await interaction.editReply(await buildAlertsPayload());
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}

export async function handleCosmetic(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  try {
    const name = interaction.options.getString('nome', true);
    const results = await searchCosmetic(name);
    if (!results.length) {
      await interaction.editReply({ content: 'Nenhum cosmético encontrado.', embeds: [] });
      return;
    }
    const item = results[0];
    const embed = new EmbedBuilder()
      .setTitle(item.name)
      .setDescription(item.description ?? '_Sem descrição_')
      .setColor(Number.parseInt(brItemColor(item.rarity.value).replace('#', ''), 16) || EmbedColors.br)
      .addFields(
        { name: 'Tipo', value: item.type.displayValue, inline: true },
        { name: 'Raridade', value: item.rarity.displayValue, inline: true },
        { name: 'ID', value: `\`${item.id}\``, inline: false }
      )
      .setFooter({ text: `1/${results.length}` });
    if (item.images.featured ?? item.images.icon) embed.setImage(item.images.featured ?? item.images.icon!);
    await interaction.editReply({ embeds: [embed], components: cosmeticNavButtons(name, 0, results.length) });
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}
