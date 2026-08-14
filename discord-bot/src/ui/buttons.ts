import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const PREFIX = 'sf';

export function encodeId(parts: (string | number)[]): string {
  return [PREFIX, ...parts.map(String)].join(':');
}

export function decodeId(customId: string): string[] | null {
  const parts = customId.split(':');
  if (parts[0] !== PREFIX) return null;
  return parts.slice(1);
}

export function refreshButton(kind: 'br' | 'stw' | 'al', locale = 'pt'): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(encodeId([kind, locale, 'refresh']))
      .setLabel('🔄 Atualizar')
      .setStyle(ButtonStyle.Success)
  );
}

export function authConfirmButtons(action: string, userId: string): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(encodeId(['auth', action, userId, 'yes']))
        .setLabel('Confirmar')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(encodeId(['auth', action, userId, 'no']))
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function cosmeticNavButtons(query: string, index: number, total: number): ActionRowBuilder<ButtonBuilder>[] {
  const q = encodeURIComponent(query.slice(0, 40));
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(encodeId(['cos', q, index - 1]))
        .setLabel('◀')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index <= 0),
      new ButtonBuilder()
        .setCustomId(encodeId(['cos', q, index + 1]))
        .setLabel('▶')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index >= total - 1)
    )
  ];
}
