import type { ButtonInteraction } from 'discord.js';
import { decodeId } from '@/ui/buttons';
import { buildAlertsPayload } from '@/ui/embeds';
import { buildBrShopPayload, buildStwShopPayload } from '@/ui/shop-presenter';
import { getActiveAccount } from '@/storage/accounts';
import { searchCosmetic } from '@/core/shop';
import { EmbedBuilder } from 'discord.js';
import { EmbedColors, brItemColor } from '@/config/colors';
import { cosmeticNavButtons } from '@/ui/buttons';
import { getAccessToken, getExchangeCode } from '@/core/auth-session';
import { createDeviceAuth } from '@/core/social';
import { sendToDm } from '@/utils/discord';

export async function handleButton(interaction: ButtonInteraction) {
  const parts = decodeId(interaction.customId);
  if (!parts?.length) return;

  const kind = parts[0];

  if (kind === 'br' && parts[2] === 'refresh') {
    await interaction.deferUpdate();
    const locale = parts[1] ?? 'pt';
    await interaction.editReply(await buildBrShopPayload(locale));
    return;
  }

  if (kind === 'stw' && parts[2] === 'refresh') {
    const account = getActiveAccount(interaction.user.id);
    if (!account) {
      await interaction.reply({ content: '❌ Faça login com `/login`.', ephemeral: true });
      return;
    }
    await interaction.deferUpdate();
    await interaction.editReply(await buildStwShopPayload(account, parts[1] ?? 'pt'));
    return;
  }

  if (kind === 'al' && parts[2] === 'refresh') {
    await interaction.deferUpdate();
    await interaction.editReply(await buildAlertsPayload());
    return;
  }

  if (kind === 'cos') {
    await interaction.deferUpdate();
    const query = decodeURIComponent(parts[1] ?? '');
    const index = Number.parseInt(parts[2] ?? '0', 10) || 0;
    const results = await searchCosmetic(query);
    const item = results[index];
    if (!item) {
      await interaction.editReply({ content: 'Cosmético não encontrado.', embeds: [], components: [] });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle(item.name)
      .setDescription(item.description ?? '_Sem descrição_')
      .setColor(Number.parseInt(brItemColor(item.rarity.value).replace('#', ''), 16) || EmbedColors.br)
      .addFields(
        { name: 'Tipo', value: item.type.displayValue, inline: true },
        { name: 'Raridade', value: item.rarity.displayValue, inline: true },
        { name: 'ID', value: `\`${item.id}\``, inline: false }
      )
      .setFooter({ text: `${index + 1}/${results.length}` });
    if (item.images.featured ?? item.images.icon) embed.setImage(item.images.featured ?? item.images.icon!);
    await interaction.editReply({ embeds: [embed], components: cosmeticNavButtons(query, index, results.length) });
    return;
  }

  if (kind === 'auth') {
    const action = parts[1];
    const userId = parts[2];
    const confirm = parts[3];

    if (interaction.user.id !== userId) {
      await interaction.reply({ content: '❌ Apenas quem solicitou pode confirmar.', ephemeral: true });
      return;
    }

    if (confirm === 'no') {
      await interaction.update({ content: 'Cancelado.', embeds: [], components: [] });
      return;
    }

    const account = getActiveAccount(userId);
    if (!account) {
      await interaction.update({ content: '❌ Sessão expirada. Faça login novamente.', embeds: [], components: [] });
      return;
    }

    await interaction.deferUpdate();

    if (action === 'token') {
      const token = await getAccessToken(account);
      const sent = await sendToDm(interaction.user, `Access token — **${account.displayName}**:\n\`${token}\``);
      await interaction.editReply({
        content: sent ? '✅ Token enviado por DM.' : '❌ Ative DMs para receber o token.',
        embeds: [],
        components: []
      });
    } else if (action === 'exchange') {
      const code = await getExchangeCode(account);
      const sent = await sendToDm(interaction.user, `Exchange code — **${account.displayName}**:\n\`${code}\``);
      await interaction.editReply({
        content: sent ? '✅ Exchange code enviado por DM.' : `Código: \`${code}\``,
        embeds: [],
        components: []
      });
    } else if (action === 'device') {
      const auth = await createDeviceAuth(account);
      const json = JSON.stringify({ accountId: auth.accountId, deviceId: auth.deviceId, secret: auth.secret }, null, 2);
      const sent = await sendToDm(interaction.user, `Device auth — **${account.displayName}**:\n\`\`\`json\n${json}\n\`\`\``);
      await interaction.editReply({
        content: sent ? '✅ Device auth enviado por DM.' : '❌ Ative DMs para receber.',
        embeds: [],
        components: []
      });
    }
  }
}
