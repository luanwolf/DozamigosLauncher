import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  OAuth2Scopes,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type APIApplicationCommandOption,
  type Client,
  type Locale,
  type StringSelectMenuInteraction
} from 'discord.js';
import i18next, { type TFunction } from 'i18next';
import { commands, type Command } from '@/loaders/command';
import { config } from '@/shared/config';
import { replyUi, type UiRow } from '@/ui/message';
import { resolveLanguage } from '@/utils/language';
import { sendError } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export const HELP_SELECT_ID = 'help:cmd';
const CATEGORY_ORDER = ['fortnite', 'conta', 'stw', 'bot'] as const;

function localized(
  opt: {
    name: string;
    description: string;
    name_localizations?: Partial<Record<string, string | null>> | null;
    description_localizations?: Partial<Record<string, string | null>> | null;
  },
  lang: Locale
) {
  return {
    name: opt.name_localizations?.[lang] || opt.name,
    description: opt.description_localizations?.[lang] || opt.description
  };
}

function commandLines(cmd: Command, lang: Locale): string[] {
  const json = cmd.data.toJSON();
  const root = localized(json, lang);
  const subs = (json.options ?? []).filter(
    (o): o is APIApplicationCommandOption & { type: ApplicationCommandOptionType.Subcommand } =>
      o.type === ApplicationCommandOptionType.Subcommand
  );
  if (!subs.length) return [`\`/${root.name}\` — ${root.description}`];
  return subs.map((sub) => {
    const item = localized(sub, lang);
    return `\`/${root.name} ${item.name}\` — ${item.description}`;
  });
}

function findCommand(query: string, lang: Locale) {
  const q = query.toLowerCase();
  return commands.find((c) => {
    if (c.config.botAdminsOnly) return false;
    const json = c.data.toJSON();
    return json.name === q || (json.name_localizations?.[lang] || '').toLowerCase() === q;
  });
}

function inviteUrl(client: Client) {
  return client.generateInvite({
    permissions: [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.SendMessagesInThreads,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.UseExternalEmojis
    ],
    scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands]
  });
}

function helpRows(client: Client, lang: Locale, t: TFunction<'commands'>) {
  const links = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(inviteUrl(client)).setLabel(t('help.links.invite')).setEmoji('🔗')
  );
  if (config.guilds.support.invite) {
    links.addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setURL(config.guilds.support.invite)
        .setLabel(t('help.links.supportServer'))
        .setEmoji('🛠')
    );
  }

  const publicCmds = [...commands.filter((c) => !c.config.botAdminsOnly).values()].slice(0, 25);
  const select = new StringSelectMenuBuilder()
    .setCustomId(HELP_SELECT_ID)
    .setPlaceholder(t('help.inspect'))
    .addOptions(
      publicCmds.map((c) => {
        const { name, description } = localized(c.data.toJSON(), lang);
        return new StringSelectMenuOptionBuilder()
          .setLabel(`/${name}`.slice(0, 100))
          .setValue(c.data.name)
          .setDescription(description.slice(0, 100));
      })
    );

  return [links, new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)] as UiRow[];
}

function catalogDescription(lang: Locale, t: TFunction<'commands'>) {
  const blocks = [t('help.embed.description')];
  for (const category of CATEGORY_ORDER) {
    const lines = [...commands.filter((c) => c.config.category === category && !c.config.botAdminsOnly).values()].flatMap(
      (c) => commandLines(c, lang)
    );
    if (!lines.length) continue;
    blocks.push(`**${t(`help.categories.${category}`)}**\n${lines.join('\n')}`);
  }
  return blocks.join('\n\n');
}

export async function handleHelpSelect(interaction: StringSelectMenuInteraction) {
  const lang = resolveLanguage(interaction.locale);
  const t = i18next.getFixedT(lang, 'commands');
  const name = interaction.values[0] ?? '';
  const cmd = findCommand(name, lang);
  if (!cmd) {
    return replyUi(
      interaction,
      { cards: [{ kind: 'error', description: t('help.commandNotFound', { name: `\`${name}\`` }) }], ephemeral: true },
      'reply'
    );
  }
  const { name: localName } = localized(cmd.data.toJSON(), lang);
  return replyUi(
    interaction,
    {
      cards: [
        {
          title: `/${localName}`,
          description: commandLines(cmd, lang).join('\n'),
          fields: [
            {
              name: t('help.details.title'),
              value: `**${t('help.details.category')}**: ${t(`help.categories.${cmd.config.category}`)}`
            }
          ],
          thumbnail: interaction.client.user.displayAvatarURL({ size: 256 })
        }
      ],
      rows: helpRows(interaction.client, lang, t)
    },
    'update'
  );
}

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View bot commands')
    .addStringOption((o) => o.setName('command').setDescription('Command').setAutocomplete(true)),
  config: {
    category: 'bot'
  },
  run: async ({ interaction, t }) => {
    const lang = resolveLanguage(interaction.locale);
    const commandName = interaction.options.getString('command');
    const avatar = interaction.client.user.displayAvatarURL({ size: 256 });
    const rows = helpRows(interaction.client, lang, t);

    if (commandName) {
      const cmd = findCommand(commandName, lang);
      if (!cmd) {
        return sendError(interaction, t('help.commandNotFound', { name: `\`${commandName}\`` }));
      }
      const { name } = localized(cmd.data.toJSON(), lang);
      return replyUi(interaction, {
        cards: [
          {
            title: `/${name}`,
            description: commandLines(cmd, lang).join('\n'),
            fields: [
              {
                name: t('help.details.title'),
                value: `**${t('help.details.category')}**: ${t(`help.categories.${cmd.config.category}`)}`
              }
            ],
            thumbnail: avatar
          }
        ],
        rows
      });
    }

    return replyUi(interaction, {
      cards: [
        {
          title: t('help.embed.title'),
          description: catalogDescription(lang, t),
          thumbnail: avatar
        }
      ],
      rows
    });
  },
  autocomplete: async ({ interaction }) => {
    const query = interaction.options.getFocused();
    const lang = resolveLanguage(interaction.locale);
    const filtered = query
      ? commands.filter((c) => {
          const json = c.data.toJSON();
          return (
            json.name.startsWith(query.toLowerCase()) ||
            (json.name_localizations?.[lang] || '').toLowerCase().startsWith(query.toLocaleLowerCase(lang))
          );
        })
      : commands.filter((c) => !c.config.botAdminsOnly);

    return interaction.respond(
      [...filtered.values()].slice(0, 25).map((c) => {
        const { name } = localized(c.data.toJSON(), lang);
        return { name, value: c.data.name };
      })
    );
  }
});
