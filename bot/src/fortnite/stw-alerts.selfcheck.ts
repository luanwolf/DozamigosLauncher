import { parseVbucksAlerts } from '@/fortnite/stw';

const TWINE = 'D9A801C5444D1C74D1B7DAB5C7C12C5B';

const none = parseVbucksAlerts({ theaters: [], missions: [], missionAlerts: [] });
if (none.length) throw new Error('empty world should have no alerts');

const alerts = parseVbucksAlerts({
  theaters: [
    {
      uniqueId: TWINE,
      tiles: [{ zoneTheme: '/Game/World/BP_ZT_TheIndustrialPark.BP_ZT_TheIndustrialPark_C' }],
      regions: [
        {
          uniqueId: 'twine-mid',
          tileIndices: [0],
          missionData: { difficultyWeights: [{ difficultyInfo: { rowName: 'Theater_Nightmare_Zone4' } }] }
        }
      ]
    }
  ],
  missions: [
    {
      theaterId: TWINE,
      availableMissions: [
        {
          tileIndex: 0,
          missionGenerator: '/Game/Fortnite/MissionGen_3Gates.MissionGen_3Gates_C',
          missionRewards: { items: [] }
        }
      ]
    }
  ],
  missionAlerts: [
    {
      theaterId: TWINE,
      availableMissionAlerts: [
        {
          tileIndex: 0,
          missionAlertRewards: { items: [{ itemType: 'AccountResource:currency_mtxswap', quantity: 50 }] }
        },
        {
          tileIndex: 0,
          missionAlertRewards: { items: [{ itemType: 'AccountResource:heroxp', quantity: 99 }] }
        }
      ]
    }
  ]
});

if (alerts.length !== 1) throw new Error(`count ${alerts.length}`);
const [alert] = alerts;
if (alert?.vbucks !== 50) throw new Error(`vbucks ${alert?.vbucks}`);
if (alert?.powerLevel !== 94) throw new Error(`pl ${alert?.powerLevel}`);
if (alert?.theater !== 'Twine Peaks') throw new Error(`theater ${alert?.theater}`);
if (alert?.zone !== 'Parque Industrial') throw new Error(`zone ${alert?.zone}`);
if (!alert?.mission.includes('Categoria 3')) throw new Error(`mission ${alert?.mission}`);

process.stdout.write('stw-alerts.selfcheck ok\n');
