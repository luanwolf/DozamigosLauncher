import assert from 'node:assert/strict';
import { mergeStyles, parseCosmeticPreview } from './shop-preview-video';

// Trimmed from a live fortnite.gg item page (Renegade Raider).
const html = `<div class='modal-l'><video class='item-video' muted loop autoplay playsinline='playsinline' data-id='899' data-v='4' src='https://fnggcdn.com/items/899/video.mp4?4'></video></div>
<div id='style-variants'><div class='style-title'>STYLE<span class='style-name'>DEFAULT</span></div><div>
<div class='style-variant active' data-idx='1' onclick='itemStyle(this,"DEFAULT")'><img src='/img/items/899/style-1.jpg?4'></div>
<div class='style-variant' data-idx='2' onclick='itemStyle(this,"CHECKERED")'><img src='/img/items/899/style-2.jpg?4'></div>
<div class='style-variant' data-idx='3' onclick='itemStyle(this,"BLACK &amp; GOLD")'><img src='/img/items/899/style-3.jpg?4'></div>
</div></div>`;

const preview = parseCosmeticPreview(html);

assert.equal(preview.video, 'https://fnggcdn.com/items/899/video.mp4?4');
assert.equal(preview.styles.length, 3);
// The first style is the turntable itself, the others get their own clip.
assert.equal(preview.styles[0]!.video, 'https://fnggcdn.com/items/899/video.mp4?4');
assert.equal(preview.styles[1]!.video, 'https://fnggcdn.com/items/899/video-2.mp4?4');
assert.equal(preview.styles[2]!.name, 'BLACK & GOLD');
assert.equal(preview.styles[0]!.image, 'https://fortnite.gg/img/items/899/style-1.jpg?4');

// Lil Tecca: three channels, so a selection is the whole index vector.
const multiChannel = `<video class='item-video' data-id='23836' data-v='1'></video>
<div id='style-variants'><div class='style-title'>STYLE</div><div>
<div class='style-variant active' data-idx='1' onclick='itemStyle(this,"LIL TECCA")'><img src='/img/items/23836/style-1.jpg?1'></div>
<div class='style-variant' data-idx='2' onclick='itemStyle(this,"RANSOM TOON STYLE")'><img src='/img/items/23836/style-2.jpg?1'></div></div>
<div class='style-title'>SCARF</div><div>
<div class='style-variant active' data-idx='1' onclick='itemStyle(this,"ON")'><img src='/img/items/23836/style-3.jpg?1'></div>
<div class='style-variant' data-idx='2' onclick='itemStyle(this,"OFF")'><img src='/img/items/23836/style-4.jpg?1'></div></div>
<div class='style-title'>GLASSES</div><div>
<div class='style-variant active' data-idx='1' onclick='itemStyle(this,"ON")'><img src='/img/items/23836/style-5.jpg?1'></div>
<div class='style-variant' data-idx='2' onclick='itemStyle(this,"OFF")'><img src='/img/items/23836/style-6.jpg?1'></div></div></div>`;

const combined = parseCosmeticPreview(multiChannel);

assert.equal(combined.styles.length, 6);
assert.equal(combined.styles[0]!.video, 'https://fnggcdn.com/items/23836/video.mp4?1');
assert.equal(combined.styles[1]!.video, 'https://fnggcdn.com/items/23836/video-2-1-1.mp4?1');
assert.equal(combined.styles[3]!.video, 'https://fnggcdn.com/items/23836/video-1-2-1.mp4?1');
assert.equal(combined.styles[5]!.video, 'https://fnggcdn.com/items/23836/video-1-1-2.mp4?1');

// Catalog thumbnails keep their own name/image and borrow the clip by position.
const catalog = Array.from({ length: 6 }, (_, i) => ({ name: `estilo ${i}`, image: `epic-${i}.png` }));
const merged = mergeStyles(catalog, combined);

assert.equal(merged[1]!.image, 'epic-1.png');
assert.equal(merged[1]!.video, 'https://fnggcdn.com/items/23836/video-2-1-1.mp4?1');
// Mismatched lists can't be paired, so no clip is guessed.
assert.deepEqual(mergeStyles(catalog.slice(0, 2), combined), catalog.slice(0, 2));

// A 404 page has no player at all.
assert.deepEqual(parseCosmeticPreview('<h1>Page Not Found</h1>'), { video: null, styles: [] });

console.log('shop-preview-video.selfcheck: ok');
