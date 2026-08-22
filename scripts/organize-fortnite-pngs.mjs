import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Projetos/Fortnite/FModelDump';
const OUT = 'D:/Projetos/Fortnite/Organizado';

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.png$/i.test(e.name)) acc.push(p);
  }
  return acc;
}

function norm(rel) {
  return rel.replace(/\\/g, '/');
}

function category(rel) {
  const s = norm(rel).toLowerCase();

  // Creative islands / devices — keep separate (majority of dump)
  if (s.includes('/gamefeatures/fne/') || s.includes('/gamefeatures/fne')) return '90_creative_fne';
  if (s.includes('/cr_legacy/')) return '91_creative_legacy';
  if (s.includes('/gamefeatures/creative') || s.includes('/creative/devices'))
    return '92_creative';
  if (s.includes('/playsets/')) return '93_playsets';

  // STW
  if (s.includes('/heroes/') || s.includes('/hero/') || s.includes('heroloadingscreen') || s.includes('/soldier/') && s.includes('stw'))
    return '01_herois';
  if (s.includes('/survivors/') || s.includes('/survivor/') || s.includes('/workers/'))
    return '02_sobreviventes';
  if (s.includes('/defenders/') || s.includes('/defender/')) return '03_defensores';
  if (s.includes('/traps/') || s.includes('/trap/')) return '05_armadilhas';
  if (s.includes('/gadgets/') || s.includes('/gadget/')) return '06_gadgets';
  if (
    s.includes('/schematic') ||
    (s.includes('/weapons/') && !s.includes('pickaxe')) ||
    s.includes('/rangedweapons/') ||
    s.includes('/meleeweapons/')
  )
    return '04_armas_stw';

  // BR cosmetics / characters
  if (
    s.includes('/characters/player') ||
    s.includes('/characters/') ||
    s.includes('/outfits/') ||
    s.includes('/bodies/') ||
    s.includes('/heads/') ||
    s.includes('athenacharacter')
  )
    return '10_skins';
  if (
    s.includes('/backpack') ||
    s.includes('/backbling') ||
    s.includes('/fort_backpacks') ||
    s.includes('/pets/') ||
    s.includes('/petcarrier') ||
    s.includes('/cosmeticcompanions')
  )
    return '11_mochilas';
  if (s.includes('/pickaxe') || s.includes('/harvesting') || s.includes('/fort_melee/pickaxe'))
    return '12_picaretas';
  if (s.includes('/glider')) return '13_planadores';
  if (s.includes('/emote') || s.includes('/dance')) return '14_emotes';
  if (s.includes('/wrap')) return '15_envoltorios';
  if (s.includes('/contrail') || s.includes('/skydiving') || s.includes('/trails/'))
    return '16_contrails';
  if (s.includes('/shoe') || s.includes('/kicks/')) return '17_tenis';
  if (s.includes('/spray')) return '18_sprays';
  if (s.includes('/banner')) return '19_banners';
  if (s.includes('/loading') || s.includes('/loadingscreen')) return '20_telas_carregamento';
  if (s.includes('/music') || s.includes('/lobbymusic')) return '21_musicas';
  if (s.includes('/toy') || s.includes('/toys/')) return '22_brinquedos';
  if (s.includes('/emoji') || s.includes('/emoticons')) return '23_emojis';
  if (s.includes('/brcosmetics/')) return '25_cosmeticos_br';
  if (s.includes('/athena/items') || s.includes('/athena/cosmetics')) return '26_athena_itens';
  if (s.includes('/athena/')) return '27_athena_outros';
  if (s.includes('/2dassets/')) return '30_2d_assets';
  if (s.includes('/ui/') || s.includes('/icons/') || s.includes('/icon/')) return '31_ui_icones';
  if (s.includes('/items/')) return '33_itens';
  if (s.includes('/plugins/')) return '34_plugins_outros';
  return '99_outros';
}

function uniqueName(destDir, base) {
  let name = base;
  let i = 2;
  while (fs.existsSync(path.join(destDir, name))) {
    const ext = path.extname(base);
    const stem = path.basename(base, ext);
    name = `${stem}__${i}${ext}`;
    i++;
  }
  return name;
}

function linkOrCopy(src, dest) {
  try {
    fs.linkSync(src, dest); // same drive: no extra disk
    return 'link';
  } catch {
    fs.copyFileSync(src, dest);
    return 'copy';
  }
}

const mode = process.argv[2] || 'run';
const files = walk(ROOT);
console.log('total pngs:', files.length);

const counts = Object.create(null);
const plan = [];
for (const f of files) {
  const rel = path.relative(ROOT, f);
  const cat = category(rel);
  counts[cat] = (counts[cat] || 0) + 1;
  plan.push({ f, cat });
}

console.log('\npor categoria:');
for (const [k, v] of Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${k}: ${v}`);
}

if (mode === 'preview') {
  console.log('\npreview only');
  process.exit(0);
}

if (fs.existsSync(OUT)) {
  console.log('\nlimpando Organizado antigo...');
  fs.rmSync(OUT, { recursive: true, force: true });
}
fs.mkdirSync(OUT, { recursive: true });

let linked = 0;
let copied = 0;
let skipped = 0;
const t0 = Date.now();

for (const { f, cat } of plan) {
  const destDir = path.join(OUT, cat);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, uniqueName(destDir, path.basename(f)));
  try {
    const how = linkOrCopy(f, dest);
    if (how === 'link') linked++;
    else copied++;
  } catch {
    skipped++;
  }
  const done = linked + copied;
  if (done % 5000 === 0) {
    const sec = ((Date.now() - t0) / 1000).toFixed(0);
    process.stdout.write(`\rdone ${done}/${plan.length} (link=${linked} copy=${copied}) ${sec}s   `);
  }
}

console.log(
  `\nfinished: linked=${linked} copied=${copied} skipped=${skipped} in ${((Date.now() - t0) / 1000).toFixed(0)}s`
);
console.log('pasta:', OUT);
