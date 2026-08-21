import type { ChatInputCommandInteraction } from 'discord.js';
import type { ActionRowBuilder, AttachmentBuilder, ColorResolvable, MessageActionRowComponentBuilder } from 'discord.js';
import i18next from 'i18next';
import { replyUi, type UiCard } from '@/ui/message';
import { resolveLanguage } from './language';

export type EmbedType = 'error' | 'success' | 'info';
export type EmbedOptions = {
  title?: string;
  description?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  image?: string;
  thumbnail?: string;
  color?: ColorResolvable;
  ephemeral?: boolean;
  language?: string;
  components?: ActionRowBuilder<MessageActionRowComponentBuilder>[];
  files?: AttachmentBuilder[];
};

function toCard(type: EmbedType, options: EmbedOptions, language?: string): UiCard {
  let title = options.title;
  if (title == null && type !== 'info') {
    const titles = i18next.t(`embedTitles.${type}`, {
      returnObjects: true,
      ns: 'common',
      lng: language
    }) as string[];
    title = titles[Math.floor(Math.random() * titles.length)];
  }
  return {
    kind: type === 'info' ? 'info' : type,
    title,
    description: options.description,
    fields: options.fields,
    footer: options.footer?.text,
    image: options.image,
    thumbnail: options.thumbnail,
    color: options.color
  };
}

export async function sendEmbed(
  interaction: ChatInputCommandInteraction,
  type: EmbedType,
  optionsOrDesc: EmbedOptions | string
) {
  if (typeof optionsOrDesc === 'string') optionsOrDesc = { description: optionsOrDesc };
  const language = resolveLanguage(optionsOrDesc.language || interaction.locale);
  return replyUi(interaction, {
    cards: [toCard(type, optionsOrDesc, language)],
    rows: optionsOrDesc.components,
    files: optionsOrDesc.files,
    ephemeral: optionsOrDesc.ephemeral
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

export async function sendCards(
  interaction: ChatInputCommandInteraction,
  cards: UiCard[],
  extras?: Pick<EmbedOptions, 'components' | 'files' | 'ephemeral'>
) {
  return replyUi(interaction, {
    cards,
    rows: extras?.components,
    files: extras?.files,
    ephemeral: extras?.ephemeral
  });
}
