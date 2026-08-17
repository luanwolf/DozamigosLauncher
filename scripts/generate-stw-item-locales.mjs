import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const resources = JSON.parse(readFileSync(join(root, 'src/lib/data/resources.json'), 'utf8'));
const ingredients = JSON.parse(readFileSync(join(root, 'src/lib/data/ingredients.json'), 'utf8'));

/** In-game STW display names (not machine-translated). */
const byEnglish = {
  'Pure Drop of Rain': {
    de: 'Reiner Regentropfen',
    es: 'Gota de lluvia pura',
    fr: 'Goutte de pluie pure',
    'pt-br': 'Gota de Chuva Pura',
    tr: 'Saf Yağmur Damlası'
  },
  'Lightning in a Bottle': {
    de: 'Blitz in der Flasche',
    es: 'Relámpago en una botella',
    fr: 'Foudre en bouteille',
    'pt-br': 'Relâmpago Engarrafado',
    tr: 'Şişedeki Yıldırım'
  },
  'Eye of the Storm': {
    de: 'Auge des Sturms',
    es: 'Ojo de la tormenta',
    fr: "Œil de la tempête",
    'pt-br': 'Olho da Tempestade',
    tr: 'Fırtınanın Gözü'
  },
  'Storm Shard': {
    de: 'Sturmsplitter',
    es: 'Fragmento de tormenta',
    fr: 'Éclat de tempête',
    'pt-br': 'Estilhaço da Tempestade',
    tr: 'Fırtına Parçası'
  },
  'Rare Flux': {
    de: 'Seltener Flux',
    es: 'Flujo raro',
    fr: 'Flux rare',
    'pt-br': 'Fluxo Raro',
    tr: 'Nadir Akı'
  },
  'Epic Flux': {
    de: 'Epischer Flux',
    es: 'Flujo épico',
    fr: 'Flux épique',
    'pt-br': 'Fluxo Épico',
    tr: 'Destansı Akı'
  },
  'Legendary Flux': {
    de: 'Legendärer Flux',
    es: 'Flujo legendario',
    fr: 'Flux légendaire',
    'pt-br': 'Fluxo Lendário',
    tr: 'Efsanevi Akı'
  },
  'Training Manual': {
    de: 'Trainingshandbuch',
    es: 'Manual de entrenamiento',
    fr: "Manuel d'entraînement",
    'pt-br': 'Manual de Treinamento',
    tr: 'Eğitim Kitabı'
  },
  'Schematic Manual': {
    de: 'Bauplan-Handbuch',
    es: 'Manual de esquemas',
    fr: 'Manuel de schémas',
    'pt-br': 'Manual de Esquemas',
    tr: 'Şema Kitabı'
  },
  'Trap Designs': {
    de: 'Fallenentwürfe',
    es: 'Diseños de trampas',
    fr: 'Plans de pièges',
    'pt-br': 'Projetos de Armadilhas',
    tr: 'Tuzak Tasarımları'
  },
  'Weapon Designs': {
    de: 'Waffenentwürfe',
    es: 'Diseños de armas',
    fr: "Plans d'armes",
    'pt-br': 'Projetos de Armas',
    tr: 'Silah Tasarımları'
  },
  Gold: {
    de: 'Gold',
    es: 'Oro',
    fr: 'Or',
    'pt-br': 'Ouro',
    tr: 'Altın'
  },
  'RE-PERK!': {
    de: 'RE-PERK!',
    es: 'RE-PERK!',
    fr: 'RE-PERK!',
    'pt-br': 'RE-PERK!',
    tr: 'RE-PERK!'
  },
  'Core RE-PERK!': {
    de: 'Kern-RE-PERK!',
    es: 'RE-PERK! central',
    fr: 'RE-PERK! principal',
    'pt-br': 'RE-PERK! Principal',
    tr: 'Çekirdek RE-PERK!'
  },
  'Uncommon PERK-UP!': {
    de: 'Ungewöhnliches PERK-UP!',
    es: 'PERK-UP! poco común',
    fr: 'PERK-UP! inhabituel',
    'pt-br': 'PERK-UP! Incomum',
    tr: 'Sıradışı PERK-UP!'
  },
  'Rare PERK-UP!': {
    de: 'Seltenes PERK-UP!',
    es: 'PERK-UP! raro',
    fr: 'PERK-UP! rare',
    'pt-br': 'PERK-UP! Raro',
    tr: 'Nadir PERK-UP!'
  },
  'Epic PERK-UP!': {
    de: 'Episches PERK-UP!',
    es: 'PERK-UP! épico',
    fr: 'PERK-UP! épique',
    'pt-br': 'PERK-UP! Épico',
    tr: 'Destansı PERK-UP!'
  },
  'Legendary PERK-UP!': {
    de: 'Legendäres PERK-UP!',
    es: 'PERK-UP! legendario',
    fr: 'PERK-UP! légendaire',
    'pt-br': 'PERK-UP! Lendário',
    tr: 'Efsanevi PERK-UP!'
  },
  'AMP-UP!': {
    de: 'AMP-UP!',
    es: 'AMP-UP!',
    fr: 'AMP-UP!',
    'pt-br': 'AMP-UP!',
    tr: 'AMP-UP!'
  },
  'FIRE-UP!': {
    de: 'FIRE-UP!',
    es: 'FIRE-UP!',
    fr: 'FIRE-UP!',
    'pt-br': 'FIRE-UP!',
    tr: 'FIRE-UP!'
  },
  'FROST-UP!': {
    de: 'FROST-UP!',
    es: 'FROST-UP!',
    fr: 'FROST-UP!',
    'pt-br': 'FROST-UP!',
    tr: 'FROST-UP!'
  },
  'Hero Recruitment Voucher': {
    de: 'Helden-Rekrutierungsgutschein',
    es: 'Vale de reclutamiento de héroe',
    fr: 'Bon de recrutement de héros',
    'pt-br': 'Vale de Recrutamento de Herói',
    tr: 'Kahraman Alım Kuponu'
  },
  'Weapon Research Voucher': {
    de: 'Waffenforschungsgutschein',
    es: 'Vale de investigación de armas',
    fr: "Bon de recherche d'armes",
    'pt-br': 'Vale de Pesquisa de Armas',
    tr: 'Silah Araştırma Kuponu'
  },
  'Upgrade Llama Token': {
    de: 'Upgrade-Lama-Token',
    es: 'Ficha de llama de mejora',
    fr: 'Jeton de lama améliorée',
    'pt-br': 'Ficha de Llama de Melhoria',
    tr: 'Yükseltme Laması Jetonu'
  },
  'Mini Reward Llama': {
    de: 'Mini-Belohnungslama',
    es: 'Mini llama de recompensa',
    fr: 'Mini lama de récompense',
    'pt-br': 'Lhama de Recompensa Mini',
    tr: 'Mini Ödül Laması'
  },
  'V-Bucks': {
    de: 'V-Bucks',
    es: 'V-Bucks',
    fr: 'V-Bucks',
    'pt-br': 'V-Bucks',
    tr: 'V-Bucks'
  },
  'X-Ray Llama Token': {
    de: 'Röntgen-Lama-Token',
    es: 'Ficha de llama de rayos X',
    fr: 'Jeton de lama rayons X',
    'pt-br': 'Ficha de Llama Raio-X',
    tr: 'X-Ray Laması Jetonu'
  },
  'Hero XP': {
    de: 'Helden-EP',
    es: 'PE de héroe',
    fr: 'PX de héros',
    'pt-br': 'XP de Herói',
    tr: 'Kahraman TP'
  },
  'People XP': {
    de: 'Personen-EP',
    es: 'PE de personas',
    fr: 'PX de personnes',
    'pt-br': 'XP de Pessoas',
    tr: 'Kişi TP'
  },
  'Schematic XP': {
    de: 'Bauplan-EP',
    es: 'PE de esquema',
    fr: 'PX de schéma',
    'pt-br': 'XP de Esquema',
    tr: 'Şema TP'
  },
  'Survivor XP': {
    de: 'Überlebenden-EP',
    es: 'PE de superviviente',
    fr: 'PX de survivant',
    'pt-br': 'XP de Sobrevivente',
    tr: 'Hayatta Kalan TP'
  },
  'Venture XP': {
    de: 'Abenteuer-EP',
    es: 'PE de aventura',
    fr: "PX d'aventure",
    'pt-br': 'XP de Aventura',
    tr: 'Macera TP'
  },
  'Hero Supercharger': {
    de: 'Helden-Superlader',
    es: 'Supercargador de héroe',
    fr: 'Superchargeur de héros',
    'pt-br': 'Supercarregador de Herói',
    tr: 'Kahraman Süper Şarjörü'
  },
  'Survivor Supercharger': {
    de: 'Überlebenden-Superlader',
    es: 'Supercargador de superviviente',
    fr: 'Superchargeur de survivant',
    'pt-br': 'Supercarregador de Sobrevivente',
    tr: 'Hayatta Kalan Süper Şarjörü'
  },
  'Trap Supercharger': {
    de: 'Fallen-Superlader',
    es: 'Supercargador de trampa',
    fr: 'Superchargeur de piège',
    'pt-br': 'Supercarregador de Armadilha',
    tr: 'Tuzak Süper Şarjörü'
  },
  'Weapon Supercharger': {
    de: 'Waffen-Superlader',
    es: 'Supercargador de arma',
    fr: "Superchargeur d'arme",
    'pt-br': 'Supercarregador de Arma',
    tr: 'Silah Süper Şarjörü'
  },
  'Daily Coins': {
    de: 'Tagesmünzen',
    es: 'Monedas diarias',
    fr: 'Pièces quotidiennes',
    'pt-br': 'Moedas Diárias',
    tr: 'Günlük Paralar'
  },
  "Founder's Coins": {
    de: 'Gründermünzen',
    es: 'Monedas de fundador',
    fr: 'Pièces de fondateur',
    'pt-br': 'Moedas de Fundador',
    tr: 'Kurucu Paraları'
  },
  'Currency of the Season': {
    de: 'Währung der Saison',
    es: 'Moneda de la temporada',
    fr: 'Monnaie de la saison',
    'pt-br': 'Moeda da Temporada',
    tr: 'Sezon Parası'
  },
  'Pirate Tickets': {
    de: 'Piraten-Tickets',
    es: 'Tickets pirata',
    fr: 'Tickets pirate',
    'pt-br': 'Tickets de Pirata',
    tr: 'Korsan Biletleri'
  },
  'Blockbuster Tickets': {
    de: 'Blockbuster-Tickets',
    es: 'Tickets Blockbuster',
    fr: 'Tickets Blockbuster',
    'pt-br': 'Tickets Blockbuster',
    tr: 'Blockbuster Biletleri'
  },
  'Fortnitemares Candy': {
    de: 'Fortnitemares-Süßigkeiten',
    es: 'Dulces de Fortnitemares',
    fr: 'Bonbons Fortnitemares',
    'pt-br': 'Doces de Fortnitemares',
    tr: 'Fortnitemares Şekeri'
  },
  'Lunar Tickets': {
    de: 'Lunar-Tickets',
    es: 'Tickets lunares',
    fr: 'Tickets lunaires',
    'pt-br': 'Tickets Lunares',
    tr: 'Ay Biletleri'
  },
  'Road Trip Tickets': {
    de: 'Road-Trip-Tickets',
    es: 'Tickets de viaje por carretera',
    fr: 'Tickets road trip',
    'pt-br': 'Tickets de Viagem',
    tr: 'Yolculuk Biletleri'
  },
  'Snowflake Tickets': {
    de: 'Schneeflocken-Tickets',
    es: 'Tickets de copo de nieve',
    fr: 'Tickets flocon de neige',
    'pt-br': 'Tickets de Floco de Neve',
    tr: 'Kar Tanesi Biletleri'
  },
  'Spring Tickets': {
    de: 'Frühlings-Tickets',
    es: 'Tickets de primavera',
    fr: 'Tickets de printemps',
    'pt-br': 'Tickets de Primavera',
    tr: 'Bahar Biletleri'
  },
  'Summer Tickets': {
    de: 'Sommer-Tickets',
    es: 'Tickets de verano',
    fr: "Tickets d'été",
    'pt-br': 'Tickets de Verão',
    tr: 'Yaz Biletleri'
  },
  'Legendary Troll Stash Llama Token': {
    de: 'Legendärer Troll-Stash-Lama-Token',
    es: 'Ficha de llama del alijo del trol legendario',
    fr: 'Jeton de lama du butin du troll légendaire',
    'pt-br': 'Ficha de Lhama do Baú do Troll Lendário',
    tr: 'Efsanevi Trol Stash Laması Jetonu'
  },
  'Legendary Troll Stash Llama': {
    de: 'Legendäres Troll-Stash-Lama',
    es: 'Llama del alijo del trol legendario',
    fr: 'Lama du butin du troll légendaire',
    'pt-br': 'Lhama de Esconderijo Lendário dos Trolls',
    tr: 'Efsanevi Trol Stash Laması'
  },
  'Legendary Troll Loot Truck... Llama': {
    de: 'Legendäres Troll-Loot-Truck-Lama',
    es: 'Llama camión de botín del trol legendario',
    fr: 'Lama camion de butin du troll légendaire',
    'pt-br': 'Lhama-caminhão Lendária de Saque de Trolls',
    tr: 'Efsanevi Trol Yağma Kamyonu Laması'
  },
  'Legendary Troll Loot Truck Llama': {
    de: 'Legendäres Troll-Loot-Truck-Lama',
    es: 'Llama camión de botín del trol legendario',
    fr: 'Lama camion de butin du troll légendaire',
    'pt-br': 'Lhama-caminhão Lendária de Saque de Trolls',
    tr: 'Efsanevi Trol Yağma Kamyonu Laması'
  },
  'Epic Lead': {
    de: 'Epischer Anführer',
    es: 'Líder épico',
    fr: 'Chef épique',
    'pt-br': 'Líder Épico',
    tr: 'Destansı Lider'
  },
  'Lead Survivor': {
    de: 'Anführer-Überlebender',
    es: 'Superviviente líder',
    fr: 'Survivant chef',
    'pt-br': 'Líder Sobrevivente',
    tr: 'Lider Hayatta Kalan'
  },
  'Rare Defender Token': {
    de: 'Seltener Verteidiger-Token',
    es: 'Ficha de defensor raro',
    fr: 'Jeton de défenseur rare',
    'pt-br': 'Ficha de Defensor Raro',
    tr: 'Nadir Savunucu Jetonu'
  },
  'Epic Defender Token': {
    de: 'Epischer Verteidiger-Token',
    es: 'Ficha de defensor épico',
    fr: 'Jeton de défenseur épique',
    'pt-br': 'Ficha de Defensor Épico',
    tr: 'Destansı Savunucu Jetonu'
  },
  'Legendary Defender Token': {
    de: 'Legendärer Verteidiger-Token',
    es: 'Ficha de defensor legendario',
    fr: 'Jeton de défenseur légendaire',
    'pt-br': 'Ficha de Defensor Lendário',
    tr: 'Efsanevi Savunucu Jetonu'
  },
  'Rare Hero Token': {
    de: 'Seltener Helden-Token',
    es: 'Ficha de héroe raro',
    fr: 'Jeton de héros rare',
    'pt-br': 'Ficha de Herói Raro',
    tr: 'Nadir Kahraman Jetonu'
  },
  'Epic Hero Token': {
    de: 'Epischer Helden-Token',
    es: 'Ficha de héroe épico',
    fr: 'Jeton de héros épique',
    'pt-br': 'Ficha de Herói Épico',
    tr: 'Destansı Kahraman Jetonu'
  },
  'Legendary Hero Token': {
    de: 'Legendärer Helden-Token',
    es: 'Ficha de héroe legendario',
    fr: 'Jeton de héros légendaire',
    'pt-br': 'Ficha de Herói Lendário',
    tr: 'Efsanevi Kahraman Jetonu'
  },
  'Rare Lead Survivor Token': {
    de: 'Seltener Anführer-Überlebenden-Token',
    es: 'Ficha de superviviente líder raro',
    fr: 'Jeton de survivant chef rare',
    'pt-br': 'Ficha de Sobrevivente Líder Raro',
    tr: 'Nadir Lider Hayatta Kalan Jetonu'
  },
  'Epic Lead Survivor Token': {
    de: 'Epischer Anführer-Überlebenden-Token',
    es: 'Ficha de superviviente líder épico',
    fr: 'Jeton de survivant chef épique',
    'pt-br': 'Ficha de Sobrevivente Líder Épico',
    tr: 'Destansı Lider Hayatta Kalan Jetonu'
  },
  'Legendary Lead Survivor Token': {
    de: 'Legendärer Anführer-Überlebenden-Token',
    es: 'Ficha de superviviente líder legendario',
    fr: 'Jeton de survivant chef légendaire',
    'pt-br': 'Ficha de Sobrevivente Líder Lendário',
    tr: 'Efsanevi Lider Hayatta Kalan Jetonu'
  },
  'Rare Melee Weapon Token': {
    de: 'Seltener Nahkampfwaffen-Token',
    es: 'Ficha de arma cuerpo a cuerpo rara',
    fr: 'Jeton d\'arme de mêlée rare',
    'pt-br': 'Ficha de Arma Corpo a Corpo Rara',
    tr: 'Nadir Yakın Dövüş Silahı Jetonu'
  },
  'Epic Melee Weapon Token': {
    de: 'Epischer Nahkampfwaffen-Token',
    es: 'Ficha de arma cuerpo a cuerpo épica',
    fr: 'Jeton d\'arme de mêlée épique',
    'pt-br': 'Ficha de Arma Corpo a Corpo Épica',
    tr: 'Destansı Yakın Dövüş Silahı Jetonu'
  },
  'Legendary Melee Weapon Token': {
    de: 'Legendärer Nahkampfwaffen-Token',
    es: 'Ficha de arma cuerpo a cuerpo legendaria',
    fr: 'Jeton d\'arme de mêlée légendaire',
    'pt-br': 'Ficha de Arma Corpo a Corpo Lendária',
    tr: 'Efsanevi Yakın Dövüş Silahı Jetonu'
  },
  'Rare Ranged Weapon Token': {
    de: 'Seltener Fernkampfwaffen-Token',
    es: 'Ficha de arma a distancia rara',
    fr: 'Jeton d\'arme à distance rare',
    'pt-br': 'Ficha de Arma de Longo Alcance Rara',
    tr: 'Nadir Menzilli Silah Jetonu'
  },
  'Epic Ranged Weapon Token': {
    de: 'Epischer Fernkampfwaffen-Token',
    es: 'Ficha de arma a distancia épica',
    fr: 'Jeton d\'arme à distance épique',
    'pt-br': 'Ficha de Arma de Longo Alcance Épica',
    tr: 'Destansı Menzilli Silah Jetonu'
  },
  'Legendary Ranged Weapon Token': {
    de: 'Legendärer Fernkampfwaffen-Token',
    es: 'Ficha de arma a distancia legendaria',
    fr: 'Jeton d\'arme à distance légendaire',
    'pt-br': 'Ficha de Arma de Longo Alcance Lendária',
    tr: 'Efsanevi Menzilli Silah Jetonu'
  },
  'Rare Schematic Weapon Token': {
    de: 'Seltener Bauplanwaffen-Token',
    es: 'Ficha de arma de esquema rara',
    fr: 'Jeton d\'arme de schéma rare',
    'pt-br': 'Ficha de Arma de Esquema Rara',
    tr: 'Nadir Şema Silahı Jetonu'
  },
  'Epic Schematic Weapon Token': {
    de: 'Epischer Bauplanwaffen-Token',
    es: 'Ficha de arma de esquema épica',
    fr: 'Jeton d\'arme de schéma épique',
    'pt-br': 'Ficha de Arma de Esquema Épica',
    tr: 'Destansı Şema Silahı Jetonu'
  },
  'Legendary Schematic Weapon Token': {
    de: 'Legendärer Bauplanwaffen-Token',
    es: 'Ficha de arma de esquema legendaria',
    fr: 'Jeton d\'arme de schéma légendaire',
    'pt-br': 'Ficha de Arma de Esquema Lendária',
    tr: 'Efsanevi Şema Silahı Jetonu'
  },
  'Rare Trap Token': {
    de: 'Seltener Fallen-Token',
    es: 'Ficha de trampa rara',
    fr: 'Jeton de piège rare',
    'pt-br': 'Ficha de Armadilha Rara',
    tr: 'Nadir Tuzak Jetonu'
  },
  'Epic Trap Token': {
    de: 'Epischer Fallen-Token',
    es: 'Ficha de trampa épica',
    fr: 'Jeton de piège épique',
    'pt-br': 'Ficha de Armadilha Épica',
    tr: 'Destansı Tuzak Jetonu'
  },
  'Legendary Trap Token': {
    de: 'Legendärer Fallen-Token',
    es: 'Ficha de trampa legendaria',
    fr: 'Jeton de piège légendaire',
    'pt-br': 'Ficha de Armadilha Lendária',
    tr: 'Efsanevi Tuzak Jetonu'
  },
  'Rare Weapon Token': {
    de: 'Seltener Waffen-Token',
    es: 'Ficha de arma rara',
    fr: 'Jeton d\'arme rare',
    'pt-br': 'Ficha de Arma Rara',
    tr: 'Nadir Silah Jetonu'
  },
  'Epic Weapon Token': {
    de: 'Epischer Waffen-Token',
    es: 'Ficha de arma épica',
    fr: 'Jeton d\'arme épique',
    'pt-br': 'Ficha de Arma Épica',
    tr: 'Destansı Silah Jetonu'
  },
  'Legendary Weapon Token': {
    de: 'Legendärer Waffen-Token',
    es: 'Ficha de arma legendaria',
    fr: 'Jeton d\'arme légendaire',
    'pt-br': 'Ficha de Arma Lendária',
    tr: 'Efsanevi Silah Jetonu'
  },
  'Rare Survivor Token': {
    de: 'Seltener Überlebenden-Token',
    es: 'Ficha de superviviente raro',
    fr: 'Jeton de survivant rare',
    'pt-br': 'Ficha de Sobrevivente Raro',
    tr: 'Nadir Hayatta Kalan Jetonu'
  },
  'Epic Survivor Token': {
    de: 'Epischer Überlebenden-Token',
    es: 'Ficha de superviviente épico',
    fr: 'Jeton de survivant épique',
    'pt-br': 'Ficha de Sobrevivente Épico',
    tr: 'Destansı Hayatta Kalan Jetonu'
  },
  'Legendary Survivor Token': {
    de: 'Legendärer Überlebenden-Token',
    es: 'Ficha de superviviente legendario',
    fr: 'Jeton de survivant légendaire',
    'pt-br': 'Ficha de Sobrevivente Lendário',
    tr: 'Efsanevi Hayatta Kalan Jetonu'
  },
  'XP Boost': {
    de: 'EP-Boost',
    es: 'Impulso de PE',
    fr: 'Boost de PX',
    'pt-br': 'Impulso de XP',
    tr: 'TP Takviyesi'
  },
  'Teammate XP Boost': {
    de: 'Team-EP-Boost',
    es: 'Impulso de PE para compañero',
    fr: 'Boost de PX pour coéquipier',
    'pt-br': 'Impulso de XP para Colega de Equipe',
    tr: 'Takım Arkadaşı TP Takviyesi'
  },
  Wood: {
    de: 'Holz',
    es: 'Madera',
    fr: 'Bois',
    'pt-br': 'Madeira',
    tr: 'Odun'
  },
  Stone: {
    de: 'Stein',
    es: 'Piedra',
    fr: 'Pierre',
    'pt-br': 'Pedra',
    tr: 'Taş'
  },
  Metal: {
    de: 'Metall',
    es: 'Metal',
    fr: 'Métal',
    'pt-br': 'Metal',
    tr: 'Metal'
  },
  Bacon: {
    de: 'Speck',
    es: 'Tocino',
    fr: 'Bacon',
    'pt-br': 'Bacon',
    tr: 'Pastırma'
  },
  Batteries: {
    de: 'Batterien',
    es: 'Baterías',
    fr: 'Piles',
    'pt-br': 'Baterias',
    tr: 'Piller'
  },
  'Blast Powder': {
    de: 'Sprengpulver',
    es: 'Pólvora',
    fr: 'Poudre explosive',
    'pt-br': 'Pó Explosivo',
    tr: 'Patlayıcı Toz'
  },
  'Quartz Crystal': {
    de: 'Quarzkristall',
    es: 'Cristal de cuarzo',
    fr: 'Cristal de quartz',
    'pt-br': 'Cristal de Quartzo',
    tr: 'Kuvars Kristali'
  },
  'Duct Tape': {
    de: 'Klebeband',
    es: 'Cinta adhesiva',
    fr: 'Ruban adhésif',
    'pt-br': 'Fita Adesiva',
    tr: 'Bant'
  },
  Flowers: {
    de: 'Blumen',
    es: 'Flores',
    fr: 'Fleurs',
    'pt-br': 'Flores',
    tr: 'Çiçekler'
  },
  'Fibrous Herbs': {
    de: 'Faserkräuter',
    es: 'Hierbas fibrosas',
    fr: 'Herbes fibreuses',
    'pt-br': 'Ervas Fibrosas',
    tr: 'Lifli Otlar'
  },
  "Nuts 'n' Bolts": {
    de: 'Schrauben und Muttern',
    es: 'Tuercas y tornillos',
    fr: 'Écrous et boulons',
    'pt-br': 'Porcas e Parafusos',
    tr: 'Somun ve Civata'
  },
  'Rough Ore': {
    de: 'Roherz',
    es: 'Mineral bruto',
    fr: 'Minerai brut',
    'pt-br': 'Minério Bruto',
    tr: 'Ham Cevher'
  },
  Coal: {
    de: 'Kohle',
    es: 'Carbón',
    fr: 'Charbon',
    'pt-br': 'Carvão',
    tr: 'Kömür'
  },
  'Rotating Gizmo': {
    de: 'Rotierendes Gizmo',
    es: 'Artilugio giratorio',
    fr: 'Gadget rotatif',
    'pt-br': 'Engenhoca Giratória',
    tr: 'Dönen Gizmo'
  },
  'Active Powercell': {
    de: 'Aktive Kraftzelle',
    es: 'Célula de energía activa',
    fr: 'Cellule d\'énergie active',
    'pt-br': 'Célula de Energia Ativa',
    tr: 'Aktif Güç Hücresi'
  },
  'Adhesive Resin': {
    de: 'Klebeharz',
    es: 'Resina adhesiva',
    fr: 'Résine adhésive',
    'pt-br': 'Resina Adesiva',
    tr: 'Yapışkan Reçine'
  },
  'Rusty Mechanical Parts': {
    de: 'Rostige mechanische Teile',
    es: 'Piezas mecánicas oxidadas',
    fr: 'Pièces mécaniques rouillées',
    'pt-br': 'Peças Mecânicas Enferrujadas',
    tr: 'Paslı Mekanik Parçalar'
  },
  'Simple Mechanical Parts': {
    de: 'Einfache mechanische Teile',
    es: 'Piezas mecánicas simples',
    fr: 'Pièces mécaniques simples',
    'pt-br': 'Peças Mecânicas Simples',
    tr: 'Basit Mekanik Parçalar'
  },
  'Sturdy Mechanical Parts': {
    de: 'Robuste mechanische Teile',
    es: 'Piezas mecánicas resistentes',
    fr: 'Pièces mécaniques robustes',
    'pt-br': 'Peças Mecânicas Resistentes',
    tr: 'Sağlam Mekanik Parçalar'
  },
  'Sleek Mechanical Parts': {
    de: 'Elegante mechanische Teile',
    es: 'Piezas mecánicas elegantes',
    fr: 'Pièces mécaniques élégantes',
    'pt-br': 'Peças Mecânicas Elegantes',
    tr: 'Şık Mekanik Parçalar'
  },
  'Efficient Mechanical Parts': {
    de: 'Effiziente mechanische Teile',
    es: 'Piezas mecánicas eficientes',
    fr: 'Pièces mécaniques efficaces',
    'pt-br': 'Peças Mecânicas Eficientes',
    tr: 'Verimli Mekanik Parçalar'
  },
  'Vindertech Mechanical Parts': {
    de: 'Vindertech-Mechanikteile',
    es: 'Piezas mecánicas Vindertech',
    fr: 'Pièces mécaniques Vindertech',
    'pt-br': 'Peças Mecânicas Vindertech',
    tr: 'Vindertech Mekanik Parçalar'
  },
  'Copper Ore': {
    de: 'Kupfererz',
    es: 'Mineral de cobre',
    fr: 'Minerai de cuivre',
    'pt-br': 'Minério de Cobre',
    tr: 'Bakır Cevheri'
  },
  'Silver Ore': {
    de: 'Silbererz',
    es: 'Mineral de plata',
    fr: 'Minerai d\'argent',
    'pt-br': 'Minério de Prata',
    tr: 'Gümüş Cevheri'
  },
  'Malachite Ore': {
    de: 'Malachiterz',
    es: 'Mineral de malaquita',
    fr: 'Minerai de malachite',
    'pt-br': 'Minério de Malaquita',
    tr: 'Malakit Cevheri'
  },
  'Obsidian Ore': {
    de: 'Obsidianerz',
    es: 'Mineral de obsidiana',
    fr: 'Minerai d\'obsidienne',
    'pt-br': 'Minério de Obsidiana',
    tr: 'Obsidyen Cevheri'
  },
  'Shadowshard Ore': {
    de: 'SchattenSplitter-Erz',
    es: 'Mineral de esquirla sombría',
    fr: 'Minerai d\'éclat d\'ombre',
    'pt-br': 'Minério de Estilhaço Sombrio',
    tr: 'Gölge Parçası Cevheri'
  },
  'Brightcore Ore': {
    de: 'Hellkern-Erz',
    es: 'Mineral de núcleo brillante',
    fr: 'Minerai de noyau brillant',
    'pt-br': 'Minério de Núcleo Brilhante',
    tr: 'Parlak Çekirdek Cevheri'
  },
  'Sunbeam Crystal': {
    de: 'Sonnenstrahl-Kristall',
    es: 'Cristal de rayo solar',
    fr: 'Cristal de rayon solaire',
    'pt-br': 'Cristal de Raio Solar',
    tr: 'Güneş Işını Kristali'
  },
  'Rough Mineral Powder': {
    de: 'Rohes Mineralpulver',
    es: 'Polvo mineral bruto',
    fr: 'Poudre minérale brute',
    'pt-br': 'Pó Mineral Bruto',
    tr: 'Ham Mineral Tozu'
  },
  'Simple Mineral Powder': {
    de: 'Einfaches Mineralpulver',
    es: 'Polvo mineral simple',
    fr: 'Poudre minérale simple',
    'pt-br': 'Pó Mineral Simples',
    tr: 'Basit Mineral Tozu'
  },
  'Fine-grain Mineral Powder': {
    de: 'Feinkörniges Mineralpulver',
    es: 'Polvo mineral de grano fino',
    fr: 'Poudre minérale à grain fin',
    'pt-br': 'Pó Mineral de Grão Fino',
    tr: 'İnce Taneli Mineral Tozu'
  },
  'Chat-black Mineral Powder': {
    de: 'Kohlschwarzes Mineralpulver',
    es: 'Polvo mineral negro vivo',
    fr: 'Poudre minérale noire vive',
    'pt-br': 'Pó Mineral Negro-vivo',
    tr: 'Simsiyah Mineral Tozu'
  },
  'Oxidized Mineral Powder': {
    de: 'Oxidiertes Mineralpulver',
    es: 'Polvo mineral oxidado',
    fr: 'Poudre minérale oxydée',
    'pt-br': 'Pó Mineral Oxidado',
    tr: 'Oksitlenmiş Mineral Tozu'
  },
  'Spectral Mineral Powder': {
    de: 'Spektrales Mineralpulver',
    es: 'Polvo mineral espectral',
    fr: 'Poudre minérale spectrale',
    'pt-br': 'Pó Mineral Espectral',
    tr: 'Spektral Mineral Tozu'
  },
  'Spectrolite Ore': {
    de: 'Spektrolit-Erz',
    es: 'Mineral de espectrolita',
    fr: 'Minerai de spectrolite',
    'pt-br': 'Minério de Espectrolita',
    tr: 'Spektrolit Cevheri'
  },
  'Moonglow Crystal': {
    de: 'Mondglanz-Kristall',
    es: 'Cristal de brillo lunar',
    fr: 'Cristal de clair de lune',
    'pt-br': 'Cristal de Brilho Lunar',
    tr: 'Ay Işığı Kristali'
  },
  'Rainbow Crystal': {
    de: 'Regenbogen-Kristall',
    es: 'Cristal arcoíris',
    fr: 'Cristal arc-en-ciel',
    'pt-br': 'Cristal Arco-íris',
    tr: 'Gökkuşağı Kristali'
  },
  Honey: {
    de: 'Honig',
    es: 'Miel',
    fr: 'Miel',
    'pt-br': 'Mel',
    tr: 'Bal'
  }
};

const locales = {};

function addEntry(id, englishName) {
  const entry = { en: englishName, ...(byEnglish[englishName] ?? {}) };
  locales[id] = entry;
  if (byEnglish[englishName]) {
    locales[`name:${englishName}`] = entry;
  }
}

for (const [id, data] of Object.entries(resources)) {
  addEntry(id, data.name);
}

for (const [id, data] of Object.entries(ingredients)) {
  addEntry(id, data.name);
}

for (const [englishName, loc] of Object.entries(byEnglish)) {
  locales[`name:${englishName}`] ??= { en: englishName, ...loc };
}

const GAME_STRINGS_URL =
  'https://raw.githubusercontent.com/PRO100KatYT/SaveTheWorldClaimer/main/stringlist.json';

function mergeGameName(key, en, pt) {
  if (!key || !en || !pt) return;
  const existing = locales[key];
  if (!existing) locales[key] = { en, 'pt-br': pt };
  else if (!existing['pt-br']) existing['pt-br'] = pt;

  const nameKey = `name:${en}`;
  const named = locales[nameKey];
  if (!named) locales[nameKey] = { en, 'pt-br': pt };
  else if (!named['pt-br']) named['pt-br'] = pt;
}

try {
  const response = await fetch(GAME_STRINGS_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const dump = await response.json();
  const items = dump.Items ?? {};
  for (const [templateId, item] of Object.entries(items)) {
    const prefix = String(templateId).split(':')[0];
    if (!['CardPack', 'Worker', 'Hero', 'Defender', 'AccountResource'].includes(prefix)) continue;
    const en = item?.name?.en;
    const pt = item?.name?.['pt-BR'];
    mergeGameName(String(templateId).replace(/^[^:]+:/, ''), en, pt);
    mergeGameName(String(templateId), en, pt);
  }
  console.log(`Merged game strings from ${GAME_STRINGS_URL}`);
} catch (error) {
  console.warn(`Skipped live STW string dump: ${error instanceof Error ? error.message : error}`);
}

writeFileSync(join(root, 'src/lib/data/stw-item-locales.json'), `${JSON.stringify(locales, null, 2)}\n`);
console.log(`Wrote ${Object.keys(locales).length} locale entries`);
