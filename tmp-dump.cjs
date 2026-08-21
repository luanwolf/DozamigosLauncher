const fs = require('fs');
const p = 'src/routes/br-stw/sprites/+page.svelte';
let s = fs.readFileSync(p, 'utf8');

const fetchIdx = s.indexOf('fetchSpriteProgress(account)');
console.log(JSON.stringify(s.slice(fetchIdx - 250, fetchIdx + 350)));
