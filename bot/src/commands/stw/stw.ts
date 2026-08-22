import { SlashCommandBuilder } from 'discord.js';
import { renderGrid } from '@/canvas/grid';
import { askConfirm } from '@/confirm';
import {
  claimCompletedQuests,
  fetchFreeLlamas,
  fetchStwQuests,
  fetchStwResources,
  fetchVbucksAlerts,
  openLlamas
} from '@/fortnite/stw';
import { rateLimit, replyImage, requireAccount } from '@/utils/account';
import { sendError, sendInfo } from '@/utils/send-embed';
import { defineCommand } from '@/utils/type-guards';

export default defineCommand({
  data: new SlashCommandBuilder()
    .setName('stw')
    .setDescription('Save the World')
    .addSubcommand((s) => s.setName('recursos').setDescription('STW resources image'))
    .addSubcommand((s) => s.setName('alertas').setDescription('Mission alerts'))
    .addSubcommand((s) => s.setName('missoes').setDescription('Quests'))
    .addSubcommand((s) => s.setName('lhama').setDescription('Open free llamas'))
    .addSubcommand((s) => s.setName('resgatar').setDescription('Claim completed quests')),
  config: { category: 'stw' },
  run: async ({ interaction, t }) => {
    const account = await requireAccount(interaction);
    if (!account) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'recursos') {
      if (!rateLimit(interaction.user.id, 12_000)) return sendError(interaction, t('slowDown', { ns: 'errors' }));
      await interaction.deferReply();
      const { resources } = await fetchStwResources(account);
      if (!resources.length) return sendError(interaction, t('stw.emptyResources'));
      const buf = await renderGrid({
        title: t('stw.resourcesTitle'),
        subtitle: account.displayName,
        items: resources.map((r) => ({
          name: r.name,
          imageUrl: r.imageUrl,
          imageUrls: r.imageUrls,
          rarity: r.rarity,
          price: r.quantity.toLocaleString('pt-BR')
        })),
        cell: 160,
        maxCols: 10
      });
      return replyImage(interaction, buf, 'stw-recursos.webp');
    }

    if (sub === 'alertas') {
      await interaction.deferReply();
      const { alerts, totalVbucks } = await fetchVbucksAlerts(account);
      if (!alerts.length) {
        return sendInfo(interaction, {
          title: t('stw.alertsTitle'),
          description: t('stw.noVbucksAlerts')
        });
      }
      const now = new Date();
      const dateLong = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const dateShort = now.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const titleDate = dateLong.charAt(0).toUpperCase() + dateLong.slice(1);
      const lines = alerts.map(
        (a) =>
          `⚡ **[${a.powerLevel}]** • ${a.zone} - ${a.theater} - ${a.mission}\n│ 🪙 V-Bucks: **${a.vbucks}**`
      );
      return sendInfo(interaction, {
        title: t('stw.alertsTitleDated', { date: titleDate }),
        description: lines.join('\n\n'),
        color: '#2ecc71',
        footer: { text: t('stw.alertsFooter', { count: alerts.length, vbucks: totalVbucks, time: dateShort }) }
      });
    }

    if (sub === 'missoes') {
      await interaction.deferReply();
      const quests = await fetchStwQuests(account);
      const claimable = quests.filter((q) => q.state === 'Completed');
      const dailies = quests.filter((q) => q.bucket === 'daily' && q.state === 'Active').length;
      return sendInfo(interaction, {
        title: t('stw.questsTitle'),
        description: t('stw.quests', { claimable: claimable.length, dailies, total: quests.length })
      });
    }

    if (sub === 'lhama') {
      await interaction.deferReply();
      const packs = await fetchFreeLlamas(account);
      if (!packs.length) return sendError(interaction, t('stw.noLlama'));
      return askConfirm(interaction, {
        description: t('stw.llamaConfirm', { count: packs.length }),
        run: async () => {
          await openLlamas(account, packs.map((p) => p.id));
          return t('stw.llamaOk', { count: packs.length });
        }
      });
    }

    await interaction.deferReply();
    const quests = await fetchStwQuests(account);
    const claimable = quests.filter((q) => q.state === 'Completed');
    if (!claimable.length) return sendError(interaction, t('stw.nothingToClaim'));
    return askConfirm(interaction, {
      description: t('stw.claimConfirm', { count: claimable.length }),
      run: async () => {
        const n = await claimCompletedQuests(account, claimable.map((q) => q.id));
        return t('stw.claimOk', { count: n });
      }
    });
  }
});
