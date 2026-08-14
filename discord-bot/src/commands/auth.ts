import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord.js';
import { epicLoginAuthorizationCodeUrl, loginWithDeviceAuth, loginWithEpicCode } from '@/core/authentication';
import { addAccount, clearAccounts, getUserAccounts, removeAccount, setActiveAccount } from '@/storage/accounts';
import { sendEpicError } from '@/utils/discord';

export const loginCommand = new SlashCommandBuilder()
  .setName('login')
  .setDescription('Conectar conta Epic Games')
  .addSubcommand((sub) =>
    sub
      .setName('codigo')
      .setDescription('Login com código de autorização Epic')
      .addStringOption((opt) => opt.setName('codigo').setDescription('Código de 32 caracteres').setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName('device')
      .setDescription('Login com device auth (JSON)')
      .addStringOption((opt) =>
        opt
          .setName('dados')
          .setDescription('JSON: {"accountId","deviceId","secret","displayName"?}')
          .setRequired(true)
      )
  )
  .addSubcommand((sub) => sub.setName('url').setDescription('Obter URL de login Epic'));

export const contasCommand = new SlashCommandBuilder()
  .setName('contas')
  .setDescription('Gerenciar contas Epic vinculadas')
  .addSubcommand((sub) => sub.setName('listar').setDescription('Listar contas conectadas'))
  .addSubcommand((sub) =>
    sub
      .setName('ativar')
      .setDescription('Definir conta ativa')
      .addStringOption((opt) => opt.setName('account_id').setDescription('ID da conta (32 chars)').setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName('remover')
      .setDescription('Remover uma conta')
      .addStringOption((opt) => opt.setName('account_id').setDescription('ID da conta').setRequired(true))
  )
  .addSubcommand((sub) => sub.setName('logout').setDescription('Remover todas as contas'));

export const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  loginCommand.toJSON(),
  contasCommand.toJSON()
];

export async function handleLogin(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'url') {
    await interaction.reply({
      content: `🔗 Faça login na Epic e copie o código:\n${epicLoginAuthorizationCodeUrl}\n\nDepois use \`/login codigo\` com o código obtido.`,
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    if (sub === 'codigo') {
      const code = interaction.options.getString('codigo', true);
      const account = await loginWithEpicCode(code);
      addAccount(interaction.user.id, account);
      await interaction.editReply(`✅ Login realizado como **${account.displayName}** (\`${account.accountId}\`)`);
    } else if (sub === 'device') {
      const raw = interaction.options.getString('dados', true);
      const parsed = JSON.parse(raw) as {
        accountId: string;
        deviceId: string;
        secret: string;
        displayName?: string;
      };
      const account = await loginWithDeviceAuth(parsed, parsed.displayName);
      addAccount(interaction.user.id, { ...account, displayName: parsed.displayName || account.displayName });
      await interaction.editReply(`✅ Login realizado como **${account.displayName}**`);
    }
  } catch (error) {
    await sendEpicError(interaction, error);
  }
}

export async function handleContas(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  if (sub === 'listar') {
    const user = getUserAccounts(userId);
    if (!user.accounts.length) {
      await interaction.reply({ content: 'Nenhuma conta conectada. Use `/login`.', ephemeral: true });
      return;
    }
    const lines = user.accounts.map((a) => {
      const active = a.accountId === (user.activeAccountId ?? user.accounts[0].accountId);
      return `${active ? '⭐' : '•'} **${a.displayName}** — \`${a.accountId}\``;
    });
    await interaction.reply({ content: lines.join('\n'), ephemeral: true });
    return;
  }

  if (sub === 'ativar') {
    const accountId = interaction.options.getString('account_id', true);
    const ok = setActiveAccount(userId, accountId);
    await interaction.reply({
      content: ok ? `✅ Conta \`${accountId}\` definida como ativa.` : '❌ Conta não encontrada.',
      ephemeral: true
    });
    return;
  }

  if (sub === 'remover') {
    const accountId = interaction.options.getString('account_id', true);
    const ok = removeAccount(userId, accountId);
    await interaction.reply({
      content: ok ? `✅ Conta \`${accountId}\` removida.` : '❌ Conta não encontrada.',
      ephemeral: true
    });
    return;
  }

  if (sub === 'logout') {
    clearAccounts(userId);
    await interaction.reply({ content: '✅ Todas as contas foram removidas.', ephemeral: true });
  }
}
