import {
  type ChatInputCommandInteraction,
  type ColorResolvable,
  EmbedBuilder,
  type EmbedData,
  MessageFlags,
  resolveColor
} from 'discord.js';
import i18next from 'i18next';
import { config } from '@/shared/config';
import { resolveLanguage } from './language';

export type EmbedType = 'error' | 'success' | 'info';
export type EmbedOptions = Omit<EmbedData, 'image' | 'thumbnail' | 'color'> & {
  image?: string;
  thumbnail?: string;
  color?: ColorResolvable;
  ephemeral?: boolean;
  language?: string;
};

export function buildEmbed(type: EmbedType, options: EmbedOptions) {
  const emoji = type === 'error' ? ':x:' : type === 'success' ? ':white_check_mark:' : '';
  let title = options.title;
  if (title == null && type !== 'info') {
    const titles = i18next.t(`embedTitles.${type}`, {
      returnObjects: true,
      ns: 'common',
      lng: options.language
    }) as string[];
    title = `${emoji} ${titles[Math.floor(Math.random() * titles.length)]}`;
  }
  const { image, thumbnail, color, ephemeral: _ephemeral, language: _language, ...rest } = options;
  return new EmbedBuilder({
    ...rest,
    title: title || undefined,
    color: resolveColor(color || (type === 'info' ? config.embedColors.default : config.embedColors[type])),
    image: image ? { url: image } : undefined,
    thumbnail: thumbnail ? { url: thumbnail } : undefined
  });
}

export async function sendEmbed(
  interaction: ChatInputCommandInteraction,
  type: EmbedType,
  optionsOrDesc: EmbedOptions | string
) {
  if (typeof optionsOrDesc === 'string') {
    optionsOrDesc = { description: optionsOrDesc };
  }

  const language = resolveLanguage(optionsOrDesc.language || interaction.locale);
  const embed = buildEmbed(type, { ...optionsOrDesc, language });

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({ embeds: [embed], components: [] });
  }

  return interaction.reply({
    embeds: [embed],
    components: [],
    flags: optionsOrDesc.ephemeral ? [MessageFlags.Ephemeral] : undefined
  });
}

export async function sendError(interaction: ChatInputCommandInteraction, optionsOrDesc: EmbedOptions | string) {
  return sendEmbed(interaction, 'error', optionsOrDesc);
}

export async function sendSuccess(interaction: ChatInputCommandInteraction, optionsOrDesc: EmbedOptions | string) {
  return sendEmbed(interaction, 'success', optionsOrDesc);
}

export async function sendInfo(interaction: ChatInputCommandInteraction, optionsOrDesc: EmbedOptions | string) {
  return sendEmbed(interaction, 'info', optionsOrDesc);
}
