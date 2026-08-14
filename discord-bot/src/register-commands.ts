import { REST, Routes } from 'discord.js';
import { allCommands } from '@/commands/index';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('DISCORD_TOKEN e DISCORD_CLIENT_ID são obrigatórios.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

if (guildId) {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: allCommands });
  console.log(`✅ ${allCommands.length} comandos registrados no servidor ${guildId}`);
} else {
  await rest.put(Routes.applicationCommands(clientId), { body: allCommands });
  console.log(`✅ ${allCommands.length} comandos registrados globalmente (pode levar até 1h)`);
}
