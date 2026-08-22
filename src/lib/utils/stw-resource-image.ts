/** Gold/founders → /resources; seasonal tickets → /currency (gifs for a few unknown events). */
export function stwResourceImageUrl(id: string): string {
  const seasonal =
    id === 'campaign_event_currency' ||
    (id.startsWith('eventcurrency_') && id !== 'eventcurrency_scaling' && id !== 'eventcurrency_founders');
  const gif = id === 'campaign_event_currency' || id === 'eventcurrency_spring' || id === 'eventcurrency_summer';
  return `${seasonal ? '/currency' : '/resources'}/${id}.${gif ? 'gif' : 'png'}`;
}
