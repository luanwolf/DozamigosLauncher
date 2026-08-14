import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { EmbedColors } from '@/config/colors';
import { fetchParsedWorldInfo } from '@/core/world-info';
import { renderMissionAlertsImage } from '@/images/mission-alerts-image';
import { buildMissionAlertSections, getOverviewSections } from '@/stw/mission-alerts-data';
import { refreshButton } from '@/ui/buttons';

export async function buildAlertsPayload() {
  const parsed = await fetchParsedWorldInfo();
  const data = buildMissionAlertSections(parsed);
  const sections = getOverviewSections(data);

  const summary = `${data.totalVbucks} V-Bucks · ${data.totalSurvivors} Survivors · ${data.totalUpgradeLlamas} Llama Tokens · ${data.totalPerkUp} Perk-up`;

  const buffer = await renderMissionAlertsImage(sections, summary, {
    totalVbucks: data.totalVbucks,
    totalSurvivors: data.totalSurvivors,
    totalUpgradeLlamas: data.totalUpgradeLlamas,
    totalPerkUp: data.totalPerkUp
  });
  const attachment = new AttachmentBuilder(buffer, { name: 'alertas-stw.png' });

  const embed = new EmbedBuilder()
    .setColor(EmbedColors.stw)
    .setTitle('🔔 Alertas de Missão — Save the World')
    .setDescription(summary)
    .setImage('attachment://alertas-stw.png')
    .setFooter({ text: 'Reset diário às 00:00 UTC' })
    .setTimestamp();

  return {
    embeds: [embed],
    files: [attachment],
    components: [refreshButton('al')]
  };
}

export { buildAlertsPayload as buildAlertsImagePayload };
