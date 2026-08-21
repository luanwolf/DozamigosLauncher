import { brandSubtext, discordTime } from '@/ui/theme';
import { buildCard } from '@/ui/message';

if (!discordTime('2026-08-21T12:00:00Z', 'R').startsWith('<t:')) throw new Error('timestamp');
if (!brandSubtext('ping').includes('DOZAMIGOS')) throw new Error('brand');
if (!brandSubtext().startsWith('-#')) throw new Error('subtext');

const card = buildCard({
  title: 'Ping',
  description: 'ok',
  fields: [{ name: 'ms', value: '`12`' }],
  footer: 'gw'
});
const json = card.toJSON();
if (json.accent_color == null) throw new Error('accent');
if (!JSON.stringify(json).includes('Ping')) throw new Error('title');

process.stdout.write('ui.selfcheck ok\n');
