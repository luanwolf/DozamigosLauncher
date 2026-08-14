import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { composeMCP } from '@/core/mcp';
import {
  acceptFriend,
  addFriend,
  fetchUserByNameOrId,
  getAllDeviceAuths,
  getFriendsSummary,
  redeemCode,
  removeFriend
} from '@/core/social';
import {
  claimCardPacks,
  fetchAvailableCardPacks,
  getAffiliateCode,
  getDailyQuests,
  getVbucksBalance,
  rerollDailyQuest,
  setAffiliateCode
} from '@/core/stw';
import { EmbedColors } from '@/config/colors';
import { ASSETS } from '@/config/paths';
import { authConfirmButtons } from '@/ui/buttons';
import { buildStwShopPayload, vbucksAttachment, vbucksEmbed } from '@/ui/shop-presenter';
import { AttachmentBuilder, requireAccount, sendEpicError, sendToDm, truncate } from '@/utils/discord';

export const vbucksCommand = new SlashCommandBuilder().setName('vbucks').setDescription('Ver saldo de V-Bucks');

export const lhamasCommand = new SlashCommandBuilder().setName('lhamas').setDescription('Resgatar lhamas gratuitas STW');

export const missoesCommand = new SlashCommandBuilder()
  .setName('missoes')
  .setDescription('Missões diárias STW')
  .addStringOption((opt) =>
    opt.setName('reroll').setDescription('ID da missão para reroll (opcional)')
  );

export const lojaStwCommand = new SlashCommandBuilder().setName('loja-stw').setDescription('Loja STW / evento');

export const resgatarCommand = new SlashCommandBuilder()
  .setName('resgatar')
  .setDescription('Resgatar código Epic')
  .addStringOption((opt) => opt.setName('codigo').setDescription('Código').setRequired(true));

export const amigosCommand = new SlashCommandBuilder()
  .setName('amigos')
  .setDescription('Gerenciar amigos Epic')
  .addSubcommand((sub) => sub.setName('listar').setDescription('Listar amigos e pedidos'))
  .addSubcommand((sub) =>
    sub
      .setName('adicionar')
      .setDescription('Enviar pedido de amizade')
      .addStringOption((opt) => opt.setName('jogador').setDescription('Nome ou ID').setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName('remover')
      .setDescription('Remover amigo')
      .addStringOption((opt) => opt.setName('jogador').setDescription('Nome ou ID').setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName('aceitar')
      .setDescription('Aceitar pedido de amizade')
      .addStringOption((opt) => opt.setName('jogador').setDescription('Nome ou ID').setRequired(true))
  );

export const buscarCommand = new SlashCommandBuilder()
  .setName('buscar')
  .setDescription('Buscar jogador Epic')
  .addStringOption((opt) => opt.setName('jogador').setDescription('Nome ou ID').setRequired(true));

export const apoioCommand = new SlashCommandBuilder()
  .setName('apoio-criador')
  .setDescription('Apoie um criador / ver código atual')
  .addStringOption((opt) => opt.setName('codigo').setDescription('Código do criador (vazio para ver/remover)'));

export const authToolsCommand = new SlashCommandBuilder()
  .setName('auth')
  .setDescription('Ferramentas de autenticação Epic')
  .addSubcommand((sub) => sub.setName('exchange-code').setDescription('Gerar exchange code'))
  .addSubcommand((sub) => sub.setName('access-token').setDescription('Gerar access token (enviado por DM)'))
  .addSubcommand((sub) => sub.setName('device-auth-gerar').setDescription('Criar novo device auth (DM)'))
  .addSubcommand((sub) => sub.setName('device-auth-listar').setDescription('Listar device auths'));

export const mcpCommand = new SlashCommandBuilder()
  .setName('mcp')
  .setDescription('Executar operação MCP')
  .addStringOption((opt) =>
    opt
      .setName('operacao')
      .setDescription('Nome da operação (ex: QueryProfile)')
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('perfil')
      .setDescription('Profile ID')
      .setRequired(true)
      .addChoices(
        { name: 'athena', value: 'athena' },
        { name: 'campaign', value: 'campaign' },
        { name: 'common_core', value: 'common_core' },
        { name: 'creative', value: 'creative' },
        { name: 'collections', value: 'collections' }
      )
  )
  .addStringOption((opt) =>
    opt.setName('dados').setDescription('JSON do body (padrão: {})')
  );

export const commands = [
  vbucksCommand.toJSON(),
  lhamasCommand.toJSON(),
  missoesCommand.toJSON(),
  lojaStwCommand.toJSON(),
  resgatarCommand.toJSON(),
  amigosCommand.toJSON(),
  buscarCommand.toJSON(),
  apoioCommand.toJSON(),
  authToolsCommand.toJSON(),
  mcpCommand.toJSON()
];

export async function handleVbucks(interaction: ChatInputCommandInteraction) {
  const account = requireAccount(interaction);
  if (!account) return;
  await interaction.deferReply({ ephemeral: true });
  try {
    const balance = await getVbucksBalance(account);
    await interaction.editReply({
      embeds: [vbucksEmbed(account, balance)],
      files: [vbucksAttachment()]
    });
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}

export async function handleLhamas(interaction: ChatInputCommandInteraction) {
  const account = requireAccount(interaction);
  if (!account) return;
  await interaction.deferReply({ ephemeral: true });
  try {
    const packs = await fetchAvailableCardPacks(account);
    if (!packs.length) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🦙 Lhamas Gratuitas')
            .setDescription('Nenhuma llama gratuita disponível no momento.')
            .setColor(EmbedColors.stw)
        ]
      });
      return;
    }
    const claimed = await claimCardPacks(
      account,
      packs.map((p) => p.id)
    );
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🦙 Lhamas Gratuitas')
          .setDescription(`✅ **${claimed}** llama(s) resgatada(s) com sucesso!`)
          .setColor(EmbedColors.success)
          .setFooter({ text: account.displayName })
      ],
      files: [new AttachmentBuilder(ASSETS.gold, { name: 'gold.png' })]
    });
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}

export async function handleMissoes(interaction: ChatInputCommandInteraction) {
  const account = requireAccount(interaction);
  if (!account) return;
  await interaction.deferReply({ ephemeral: true });
  try {
    const rerollId = interaction.options.getString('reroll');
    if (rerollId) {
      await rerollDailyQuest(account, rerollId);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('📋 Missões Diárias STW')
            .setDescription(`✅ Missão rerollada.\n\`${rerollId}\``)
            .setColor(EmbedColors.success)
        ]
      });
      return;
    }
    const { rerolls, quests } = await getDailyQuests(account);
    const embed = new EmbedBuilder()
      .setTitle('📋 Missões Diárias — Save the World')
      .setColor(EmbedColors.stw)
      .setFooter({ text: `${account.displayName} · Use /missoes reroll:<id>` })
      .addFields({ name: '🔄 Rerolls', value: String(rerolls), inline: true });

    if (quests.length) {
      for (const q of quests.slice(0, 6)) {
        const name = q.templateId.replace('Quest:', '').replace(/_/g, ' ');
        embed.addFields({
          name: `${name} (${q.progress}%)`,
          value: `\`${q.id}\``,
          inline: false
        });
      }
      if (quests.length > 6) embed.setDescription(`+${quests.length - 6} missões não exibidas`);
    } else {
      embed.setDescription('Nenhuma missão ativa.');
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}

export async function handleLojaStw(interaction: ChatInputCommandInteraction) {
  const account = requireAccount(interaction);
  if (!account) return;
  await interaction.deferReply({ ephemeral: true });
  try {
    await interaction.editReply(await buildStwShopPayload(account, 'pt'));
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}

export async function handleResgatar(interaction: ChatInputCommandInteraction) {
  const account = requireAccount(interaction);
  if (!account) return;
  await interaction.deferReply({ ephemeral: true });
  try {
    const code = interaction.options.getString('codigo', true);
    const result = await redeemCode(account, code);
    const items = result.fulfillmentResults?.map((r) => r.entitlementName).join(', ') || 'Sucesso';
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎟️ Código Resgatado')
          .setDescription(`✅ ${items}`)
          .setColor(EmbedColors.success)
          .setFooter({ text: account.displayName })
      ]
    });
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}

export async function handleAmigos(interaction: ChatInputCommandInteraction) {
  const account = requireAccount(interaction);
  if (!account) return;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  try {
    if (sub === 'listar') {
      const summary = await getFriendsSummary(account);
      const embed = new EmbedBuilder()
        .setTitle('👥 Amigos Epic')
        .setColor(EmbedColors.info)
        .setFooter({ text: account.displayName })
        .addFields(
          { name: 'Amigos', value: String(summary.friends.length), inline: true },
          { name: 'Recebidos', value: String(summary.incoming.length), inline: true },
          { name: 'Enviados', value: String(summary.outgoing.length), inline: true },
          { name: 'Bloqueados', value: String(summary.blocklist.length), inline: true }
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const jogador = interaction.options.getString('jogador', true);
    const target = await fetchUserByNameOrId(account, jogador);

    const actionEmbed = (title: string, desc: string) =>
      new EmbedBuilder().setTitle(title).setDescription(desc).setColor(EmbedColors.success);

    if (sub === 'adicionar') {
      await addFriend(account, target.accountId);
      await interaction.editReply({ embeds: [actionEmbed('👥 Amigos', `✅ Pedido enviado para **${target.displayName}**`)] });
    } else if (sub === 'remover') {
      await removeFriend(account, target.accountId);
      await interaction.editReply({ embeds: [actionEmbed('👥 Amigos', `✅ **${target.displayName}** removido`)] });
    } else if (sub === 'aceitar') {
      await acceptFriend(account, target.accountId);
      await interaction.editReply({ embeds: [actionEmbed('👥 Amigos', `✅ Pedido de **${target.displayName}** aceito`)] });
    }
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}

export async function handleBuscar(interaction: ChatInputCommandInteraction) {
  const account = requireAccount(interaction);
  if (!account) return;
  await interaction.deferReply({ ephemeral: true });
  try {
    const jogador = interaction.options.getString('jogador', true);
    const target = await fetchUserByNameOrId(account, jogador);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🔍 Jogador Encontrado')
          .addFields(
            { name: 'Nome', value: target.displayName, inline: true },
            { name: 'Account ID', value: `\`${target.accountId}\``, inline: false }
          )
          .setColor(EmbedColors.info)
      ]
    });
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}

export async function handleApoio(interaction: ChatInputCommandInteraction) {
  const account = requireAccount(interaction);
  if (!account) return;
  await interaction.deferReply({ ephemeral: true });
  try {
    const code = interaction.options.getString('codigo');
    if (code === null || code === undefined) {
      const current = await getAffiliateCode(account);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🤝 Apoie um Criador')
            .setDescription(current ? `Código atual: **${current}**` : 'Nenhum criador definido.')
            .setColor(EmbedColors.br)
        ]
      });
      return;
    }
    await setAffiliateCode(account, code);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🤝 Apoie um Criador')
          .setDescription(code ? `✅ Criador definido: **${code}**` : '✅ Código removido.')
          .setColor(EmbedColors.success)
      ]
    });
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}

export async function handleAuthTools(interaction: ChatInputCommandInteraction) {
  const account = requireAccount(interaction);
  if (!account) return;
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  try {
    if (sub === 'exchange-code') {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🔑 Exchange Code')
            .setDescription('Gerar exchange code expõe acesso à conta. **Confirme** para receber por DM.')
            .setColor(EmbedColors.warning)
        ],
        components: authConfirmButtons('exchange', interaction.user.id)
      });
    } else if (sub === 'access-token') {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🔑 Access Token')
            .setDescription('O token dá acesso total à conta Epic. **Confirme** para receber por DM.')
            .setColor(EmbedColors.warning)
        ],
        components: authConfirmButtons('token', interaction.user.id)
      });
    } else if (sub === 'device-auth-gerar') {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('📱 Device Auth')
            .setDescription('Um device auth permite login persistente. **Confirme** para gerar e receber por DM.')
            .setColor(EmbedColors.warning)
        ],
        components: authConfirmButtons('device', interaction.user.id)
      });
    } else if (sub === 'device-auth-listar') {
      const auths = await getAllDeviceAuths(account);
      const embed = new EmbedBuilder()
        .setTitle('📱 Device Auths')
        .setColor(EmbedColors.info)
        .setDescription(
          auths.length
            ? auths.map((a) => `• \`${a.deviceId.slice(0, 12)}…\` — ${new Date(a.created.dateTime).toLocaleString('pt-BR')}`).join('\n')
            : 'Nenhum device auth registrado.'
        );
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}

export async function handleMcp(interaction: ChatInputCommandInteraction) {
  const account = requireAccount(interaction);
  if (!account) return;
  await interaction.deferReply({ ephemeral: true });

  try {
    const operation = interaction.options.getString('operacao', true);
    const profile = interaction.options.getString('perfil', true);
    const rawData = interaction.options.getString('dados') ?? '{}';
    const data = JSON.parse(rawData) as Record<string, unknown>;
    const result = await composeMCP(account, operation, profile as never, data);
    const json = JSON.stringify(result, null, 2);
    if (json.length > 1900) {
      await interaction.editReply('Resposta muito grande. Enviando por DM...');
      await sendToDm(interaction.user, `\`\`\`json\n${json.slice(0, 1900)}\n\`\`\``);
    } else {
      await interaction.editReply(`\`\`\`json\n${json}\n\`\`\``);
    }
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}
