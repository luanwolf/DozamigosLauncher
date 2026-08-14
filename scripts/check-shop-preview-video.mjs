/** ponytail: fails if fortnite.gg → fnggcdn turntable scrape breaks */
const VIDEO_RE = /https:\/\/fnggcdn\.com\/items\/\d+\/video\.mp4(?:\?[^"'\\\s]*)?/i;
const id = 'Character_DrapeUltra';

const html = await fetch(`https://fortnite.gg/cosmetics?id=${encodeURIComponent(id)}`, {
  headers: { 'User-Agent': 'facebookexternalhit/1.1' }
}).then((r) => r.text());

const url = html.match(VIDEO_RE)?.[0];
if (!url) {
  console.error('no video url in fortnite.gg page');
  process.exit(1);
}

const media = await fetch(url, { headers: { Range: 'bytes=0-16' } });
const ct = media.headers.get('content-type') || '';
if (!(media.status === 200 || media.status === 206) || !ct.includes('video')) {
  console.error('cdn video not playable', media.status, ct, url);
  process.exit(1);
}

console.log('ok', url);
