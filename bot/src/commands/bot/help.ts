import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  OAuth2Scopes,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type APIApplicationCommandOption,
  type Locale
} from 'discord.js';
import { commands, type Command } from '@/loaders/command';
import { config } from '@/shared/config';
import { resolveLanguage } from '@/utils/language';
import { sendError } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

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
    const embed = new EmbedBuilder()
      .setColor(config.embedColors.default)
      .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });

    if (commandName) {
      const cmd = findCommand(commandName, lang);
      if (!cmd) {
        return sendError(interaction, t('help.commandNotFound', { name: `\`${commandName}\`` }));
      }

      const json = cmd.data.toJSON();
      const { name } = localized(json, lang);
      embed
        .setTitle(`/${name}`)
        .setDescription(commandLines(cmd, lang).join('\n'))
        .setFields({
          name: t('help.details.title'),
          value: `**${t('help.details.category')}**: ${t(`help.categories.${cmd.config.category}`)}`
        });
    } else {
      const botInvite = interaction.client.generateInvite({
        permissions: [
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.UseExternalEmojis
        ],
        scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands]
      });

      embed.setTitle(t('help.embed.title')).setDescription(t('help.embed.description'));

      for (const category of CATEGORY_ORDER) {
        const lines = [...commands.filter((c) => c.config.category === category && !c.config.botAdminsOnly).values()].flatMap(
          (c) => commandLines(c, lang)
        );
        if (!lines.length) continue;
        embed.addFields({ name: t(`help.categories.${category}`), value: lines.join('\n') });
      }

      embed.addFields({
        name: t('help.links.title'),
        value: [
          config.guilds.support.invite ? `🛠 [${t('help.links.supportServer')}](${config.guilds.support.invite})` : '',
          `🔗 [${t('help.links.invite')}](${botInvite})`
        ]
          .filter(Boolean)
          .join('\n')
      });
    }

    return interaction.reply({ embeds: [embed] });
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
