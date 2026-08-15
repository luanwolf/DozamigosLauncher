import BadgeDollarSignIcon from '@lucide/svelte/icons/badge-dollar-sign';
import BellIcon from '@lucide/svelte/icons/bell';
import ChartColumnIcon from '@lucide/svelte/icons/chart-column';
import CircleUserIcon from '@lucide/svelte/icons/circle-user';
import CloudLightningIcon from '@lucide/svelte/icons/cloud-lightning';
import CoinsIcon from '@lucide/svelte/icons/coins';
import CrosshairIcon from '@lucide/svelte/icons/crosshair';
import DownloadIcon from '@lucide/svelte/icons/download';
import EyeIcon from '@lucide/svelte/icons/eye';
import FileTextIcon from '@lucide/svelte/icons/file-text';
import FolderArchiveIcon from '@lucide/svelte/icons/folder-archive';
import GiftIcon from '@lucide/svelte/icons/gift';
import HeartHandshakeIcon from '@lucide/svelte/icons/heart-handshake';
import HomeIcon from '@lucide/svelte/icons/home';
import LibraryIcon from '@lucide/svelte/icons/library';
import ListChecksIcon from '@lucide/svelte/icons/list-checks';
import MapIcon from '@lucide/svelte/icons/map';
import MapPinnedIcon from '@lucide/svelte/icons/map-pinned';
import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
import RadarIcon from '@lucide/svelte/icons/radar';
import ServerIcon from '@lucide/svelte/icons/server';
import SettingsIcon from '@lucide/svelte/icons/settings';
import ShirtIcon from '@lucide/svelte/icons/shirt';
import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag';
import SparklesIcon from '@lucide/svelte/icons/sparkles';
import ShieldIcon from '@lucide/svelte/icons/shield';
import TagIcon from '@lucide/svelte/icons/tag';
import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
import UserXIcon from '@lucide/svelte/icons/user-x';
import UsersIcon from '@lucide/svelte/icons/users';
import ZapIcon from '@lucide/svelte/icons/zap';
import CarTaxiFrontIcon from '@lucide/svelte/icons/car-taxi-front';
import { platform } from '@tauri-apps/plugin-os';
import type { LucideIcon } from '$types/lucide';

export type NavItem = {
  id: string;
  href: string;
  icon: LucideIcon;
  requiresLogin: boolean;
};

export type NavZone = {
  id: string;
  href: string;
  icon: LucideIcon;
  hidden: boolean;
  deck: boolean;
  items: NavItem[];
};

/** Dozamigos zone map — primary IA for the app shell. */
export const NavZones = Object.freeze([
  {
    id: 'deck',
    href: '/inicio',
    icon: HomeIcon,
    hidden: false,
    deck: true,
    items: [
      {
        id: 'home',
        href: '/inicio',
        icon: HomeIcon,
        requiresLogin: false
      }
    ]
  },
  {
    id: 'battleRoyale',
    href: '/br-stw/item-shop',
    icon: CrosshairIcon,
    hidden: false,
    deck: false,
    items: [
      {
        id: 'itemShop',
        href: '/br-stw/item-shop',
        icon: ShoppingBagIcon,
        requiresLogin: false
      },
      {
        id: 'specialOffers',
        href: '/br-stw/special-offers',
        icon: BadgeDollarSignIcon,
        requiresLogin: false
      },
      {
        id: 'sprites',
        href: '/br-stw/sprites',
        icon: SparklesIcon,
        requiresLogin: false
      },
      {
        id: 'locker',
        href: '/br-stw/locker',
        icon: ShirtIcon,
        requiresLogin: true
      },
      {
        id: 'brStats',
        href: '/br-stw/stats',
        icon: ChartColumnIcon,
        requiresLogin: true
      },
      {
        id: 'buyVbucks',
        href: '/br-stw/buy-vbucks',
        icon: CoinsIcon,
        requiresLogin: true
      },
      {
        id: 'earnedXP',
        href: '/br-stw/earned-xp',
        icon: TrendingUpIcon,
        requiresLogin: true
      },
      {
        id: 'supportCreator',
        href: '/br-stw/support-creator',
        icon: HeartHandshakeIcon,
        requiresLogin: true
      },
      {
        id: 'brMap',
        href: '/br-stw/map',
        icon: MapIcon,
        requiresLogin: false
      },
      {
        id: 'serverStatus',
        href: '/br-stw/server-status',
        icon: ServerIcon,
        requiresLogin: false
      },
      {
        id: 'leaks',
        href: '/br-stw/vazamentos',
        icon: EyeIcon,
        requiresLogin: false
      }
    ]
  },
  {
    id: 'saveTheWorld',
    href: '/br-stw/stw-mission-alerts',
    icon: CloudLightningIcon,
    hidden: false,
    deck: false,
    items: [
      {
        id: 'stwMissionAlerts',
        href: '/br-stw/stw-mission-alerts',
        icon: BellIcon,
        requiresLogin: false
      },
      {
        id: 'freeLlamas',
        href: '/br-stw/free-llamas',
        icon: GiftIcon,
        requiresLogin: true
      },
      {
        id: 'stwStore',
        href: '/br-stw/stw-store',
        icon: CoinsIcon,
        requiresLogin: true
      },
      {
        id: 'dailyQuests',
        href: '/br-stw/daily-quests',
        icon: ListChecksIcon,
        requiresLogin: true
      },
      {
        id: 'saveQuests',
        href: '/br-stw/save-quests',
        icon: MapPinnedIcon,
        requiresLogin: true
      },
      {
        id: 'stwParty',
        href: '/br-stw/party',
        icon: UsersIcon,
        requiresLogin: true
      },
      {
        id: 'taxiService',
        href: '/br-stw/taxi-service',
        icon: CarTaxiFrontIcon,
        requiresLogin: true
      },
      {
        id: 'xpBoosts',
        href: '/br-stw/xp-boosts',
        icon: ZapIcon,
        requiresLogin: true
      },
      {
        id: 'ssdUnlock',
        href: '/br-stw/ssd-unlock',
        icon: ShieldIcon,
        requiresLogin: true
      },
      {
        id: 'matchmakingTrack',
        href: '/br-stw/matchmaking-track',
        icon: RadarIcon,
        requiresLogin: true
      },
      {
        id: 'worldInfoVault',
        href: '/br-stw/world-info',
        icon: FolderArchiveIcon,
        requiresLogin: false
      },
      {
        id: 'autoKick',
        href: '/br-stw/auto-kick',
        icon: UserXIcon,
        requiresLogin: true
      }
    ]
  },
  {
    id: 'account',
    href: '/account-management/account',
    icon: CircleUserIcon,
    hidden: false,
    deck: false,
    items: [
      {
        id: 'accountHub',
        href: '/account-management/account',
        icon: CircleUserIcon,
        requiresLogin: true
      },
      {
        id: 'vbucksInformation',
        href: '/account-management/vbucks',
        icon: CoinsIcon,
        requiresLogin: true
      },
      {
        id: 'deviceAuth',
        href: '/authentication/device-auth',
        icon: MonitorSmartphone,
        requiresLogin: true
      },
      {
        id: 'eula',
        href: '/account-management/eula',
        icon: FileTextIcon,
        requiresLogin: true
      },
      {
        id: 'settings',
        href: '/settings',
        icon: SettingsIcon,
        requiresLogin: false
      }
    ]
  },
  {
    id: 'epicLibrary',
    href: '/downloader/library',
    icon: LibraryIcon,
    hidden: platform() !== 'windows',
    deck: false,
    items: [
      {
        id: 'library',
        href: '/downloader/library',
        icon: LibraryIcon,
        requiresLogin: true
      },
      {
        id: 'downloads',
        href: '/downloader/downloads',
        icon: DownloadIcon,
        requiresLogin: true
      },
      {
        id: 'freeGames',
        href: '/downloader/free-games',
        icon: TagIcon,
        requiresLogin: true
      }
    ]
  }
] as const satisfies readonly NavZone[]);

/** Flat list for settings toggles + route guards (same shape as before). */
export const SidebarCategories = NavZones;
export const SidebarItems = Object.freeze(NavZones.flatMap((zone) => [...zone.items]));

export type SidebarCategory = (typeof NavZones)[number];
export type SidebarItem = SidebarCategory['items'][number];

export function zoneForPath(pathname: string): (typeof NavZones)[number] {
  if (pathname === '/' || pathname.startsWith('/inicio')) {
    return NavZones[0];
  }

  for (const zone of NavZones) {
    if (zone.deck) continue;
    if (zone.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      return zone;
    }
  }

  if (pathname.startsWith('/settings')) return NavZones.find((z) => z.id === 'account') ?? NavZones[0];
  if (pathname.startsWith('/downloader')) {
    return NavZones.find((z) => z.id === 'epicLibrary') ?? NavZones[0];
  }
  if (pathname.startsWith('/account-management') || pathname.startsWith('/authentication')) {
    return NavZones.find((z) => z.id === 'account') ?? NavZones[0];
  }
  if (pathname.startsWith('/br-stw')) {
    return NavZones.find((z) => z.id === 'battleRoyale') ?? NavZones[0];
  }

  return NavZones[0];
}
