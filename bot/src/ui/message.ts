import {
  type ActionRowBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
  type AttachmentBuilder,
  type ColorResolvable,
  type InteractionEditReplyOptions,
  type InteractionReplyOptions,
  type MessageActionRowComponentBuilder
} from 'discord.js';
import { accent, brandSubtext, type ThemeKind } from '@/ui/theme';

export type UiField = { name: string; value: string; inline?: boolean };

export type UiCard = {
  kind?: ThemeKind;
  title?: string;
  description?: string;
  fields?: UiField[];
  footer?: string;
  image?: string;
  thumbnail?: string;
  color?: ColorResolvable;
};

export type UiRow = ActionRowBuilder<MessageActionRowComponentBuilder>;

export type UiMessage = {
  cards: UiCard[];
  rows?: UiRow[];
  files?: AttachmentBuilder[];
  ephemeral?: boolean;
};

function heading(card: UiCard) {
  const parts: string[] = [];
  if (card.title) parts.push(`## ${card.title}`);
  if (card.description) parts.push(card.description);
  return parts.join('\n\n');
}

function fieldsBlock(fields: UiField[]) {
  return fields.map((field) => `**${field.name}**\n${field.value}`).join('\n\n');
}

export function buildCard(card: UiCard): ContainerBuilder {
  const container = new ContainerBuilder().setAccentColor(accent(card.kind ?? 'info', card.color));
  const head = heading(card);
  const fields = card.fields?.length ? fieldsBlock(card.fields) : '';
  const body = [head, fields].filter(Boolean).join('\n\n') || '—';

  if (card.thumbnail) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(body.slice(0, 4000)))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(card.thumbnail))
    );
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body.slice(0, 4000)));
  }

  if (card.image) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(card.image).setDescription(card.title || card.footer || 'Dozamigos')
      )
    );
  }

  container
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(brandSubtext(card.footer)));

  return container;
}

export function buildUiPayload(message: UiMessage): InteractionReplyOptions & InteractionEditReplyOptions {
  const containers = message.cards.slice(0, 10).map(buildCard);
  if (message.rows?.length) {
    const last = containers[containers.length - 1] ?? buildCard({});
    if (!containers.length) containers.push(last);
    for (const row of message.rows) last.addActionRowComponents(row);
  }
  return {
    components: containers,
    files: message.files?.length ? message.files : undefined,
    flags: message.ephemeral
      ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      : MessageFlags.IsComponentsV2
  };
}

type Repliable = {
  deferred: boolean;
  replied: boolean;
  editReply: (options: InteractionEditReplyOptions) => Promise<unknown>;
  reply: (options: InteractionReplyOptions) => Promise<unknown>;
  update?: (options: InteractionEditReplyOptions) => Promise<unknown>;
};

export async function replyUi(
  interaction: Repliable,
  message: UiMessage,
  mode: 'auto' | 'update' | 'reply' = 'auto'
) {
  const payload = buildUiPayload(message);
  if (mode === 'update' && interaction.update) return interaction.update(payload);
  if (mode === 'reply') return interaction.reply(payload);
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  if (interaction.update && !message.ephemeral) return interaction.update(payload);
  return interaction.reply(payload);
}
