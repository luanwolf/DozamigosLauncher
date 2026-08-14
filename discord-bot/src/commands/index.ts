import type { ChatInputCommandInteraction } from 'discord.js';
import * as auth from '@/commands/auth';
import * as account from '@/commands/account';
import * as publicCmds from '@/commands/public';

const handlers: Record<string, (interaction: ChatInputCommandInteraction) => Promise<void>> = {
  login: auth.handleLogin,
  contas: auth.handleContas,
  loja: publicCmds.handleLoja,
  status: publicCmds.handleStatus,
  alertas: publicCmds.handleAlertas,
  cosmetic: publicCmds.handleCosmetic,
  vbucks: account.handleVbucks,
  lhamas: account.handleLhamas,
  missoes: account.handleMissoes,
  'loja-stw': account.handleLojaStw,
  resgatar: account.handleResgatar,
  amigos: account.handleAmigos,
  buscar: account.handleBuscar,
  'apoio-criador': account.handleApoio,
  auth: account.handleAuthTools,
  mcp: account.handleMcp
};

export const allCommands = [...auth.commands, ...publicCmds.commands, ...account.commands];

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  const handler = handlers[interaction.commandName];
  if (!handler) {
    await interaction.reply({ content: 'Comando desconhecido.', ephemeral: true });
    return;
  }
  await handler(interaction);
}
