import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const heroLocales = JSON.parse(readFileSync(join(root, 'src/lib/data/stw-hero-locales.json'), 'utf8'));

/** Mirrors src/lib/utils/stw-hero-locale.ts (longest match first). */
const PT_BR_PHRASES = [
  ['Support Specialist', 'Especialista de Apoio'],
  ['Special Forces', 'Forças Especiais'],
  ['Rescue Trooper', 'Soldado de Resgate'],
  ['Shock Specialist', 'Especialista em Choque'],
  ['Explosive Expert', 'Especialista em Explosivos'],
  ['Birthday Brigade', 'Brigada de Aniversário'],
  ['Ghoul Trooper', 'Soldado Carniçal'],
  ['Rabbit Raider', 'Coelho Saqueador'],
  ['Guardian Knox', 'Guardião Knox'],
  ['Super Shredder', 'Super Retalhador'],
  ['First Raider', 'Primeiro Saqueador'],
  ['Power BASE', 'BASE Poderosa'],
  ['Mega BASE', 'MEGA BASE'],
  ['Last Word', 'Última Palavra'],
  ['Redline', 'Linha Vermelha'],
  ['Wildcat', 'Gata Selvagem'],
  ['Constructor', 'Construtor'],
  ['Demolitionist', 'Demolidor'],
  ['Siegebreaker', 'Quebra-Cerco'],
  ['Trailblazer', 'Desbravadora'],
  ['Pathfinder', 'Desbravador'],
  ['Centurion', 'Centurião'],
  ['Outlander', 'Forasteiro'],
  ['Freebooter', 'Flibusteiro'],
  ['Typewriter', 'Máquina de Escrever'],
  ['Breaching', 'Arrombador'],
  ['Thrasher', 'Destruidor'],
  ['Guardian', 'Guardião'],
  ['Soldier', 'Soldado'],
  ['Sergeant', 'Sargento'],
  ['Colonel', 'Coronel'],
  ['Brainiac', 'Cérebro'],
  ['Founder', 'Fundador'],
  ['Ramirez', 'Ramirez'],
  ['Jonesy', 'Jonesy'],
  ['Banshee', 'Banshee'],
  ['Hawk', 'Falcão'],
  ['Penny', 'Penny'],
  ['Ninja', 'Ninja'],
  ['Tank', 'Tanque']
];

function translateHeroName(english) {
  let result = english;
  for (const [from, to] of PT_BR_PHRASES) {
    result = result.replaceAll(from, to);
  }
  return result;
}

for (const [key, entry] of Object.entries(heroLocales)) {
  if (!entry.en) continue;
  entry['pt-br'] = translateHeroName(entry.en);
}

writeFileSync(join(root, 'src/lib/data/stw-hero-locales.json'), `${JSON.stringify(heroLocales, null, 2)}\n`);
console.log(`Updated ${Object.keys(heroLocales).length} hero locale entries with pt-br`);
