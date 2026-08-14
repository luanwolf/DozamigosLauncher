import { invoke } from '@tauri-apps/api/core';
import { type } from '@tauri-apps/plugin-os';
import type { LegendaryLaunchData } from '$types/legendary';

export type GetDiskSpaceOptions = {
  dir: string;
};

export type GetDiskSpaceResult = {
  total: number;
  available: number;
};

export type SetTrayVisibilityOptions = {
  visible: boolean;
};

export type RunLegendaryOptions = {
  configPath: string;
  args: string[];
};

export type LegendaryStreamEvent = {
  stream_id: string;
  event_type: 'stdout' | 'stderr' | 'terminated' | 'error';
  data: string;
  code?: number;
  signal?: number;
};

export type RunLegendaryResult = {
  code: number | null;
  signal: number | null;
  stdout: string;
  stderr: string;
};

export type StartLegendaryStreamOptions = {
  configPath: string;
  args: string[];
  streamId: string;
};

// Stream ID
export type StartLegendaryStreamResult = string;

export type StopLegendaryStreamOptions = {
  streamId: string;
  forceKillAll?: boolean;
};

export type GetTrackedAppsResult = Array<{
  pid: number;
  app_id: string;
  is_running: boolean;
}>;

export type StopLegendaryStreamResult = boolean;

export type LaunchAppOptions = {
  launchData: LegendaryLaunchData & { game_id: string };
};

// PID
export type LaunchAppResult = number;

export type StopAppOptions = {
  appId: string;
};

// PID
export type StopAppResult = number;

export type UpdateDiscordRPCOptions = {
  details: string;
  state?: string;
};

export function getLocale() {
  return invoke<string>('get_locale');
}

export function getDiskSpace(options: GetDiskSpaceOptions) {
  return invoke<GetDiskSpaceResult>('get_disk_space', options);
}

export function setTrayVisibility(options: SetTrayVisibilityOptions) {
  const isMobile = type() === 'android' || type() === 'ios';
  if (isMobile) return;

  return invoke<void>('set_tray_visibility', options);
}

export function runLegendary(options: RunLegendaryOptions) {
  return invoke<RunLegendaryResult>('run_legendary', options);
}

export function startLegendaryStream(options: StartLegendaryStreamOptions) {
  return invoke<StartLegendaryStreamResult>('start_legendary_stream', options);
}

export function stopLegendaryStream(options: StopLegendaryStreamOptions) {
  return invoke<StopLegendaryStreamResult>('stop_legendary_stream', options);
}

export function launchApp(options: LaunchAppOptions) {
  return invoke<LaunchAppResult>('launch_app', options);
}

export function getTrackedApps() {
  return invoke<GetTrackedAppsResult>('get_tracked_apps');
}

export function stopApp(options: StopAppOptions) {
  return invoke<StopAppResult>('stop_app', options);
}

export function connectDiscordRPC() {
  return invoke<void>('connect_discord_rpc');
}

export function updateDiscordRPC(options: UpdateDiscordRPCOptions) {
  return invoke<void>('update_discord_rpc', options);
}

export function disconnectDiscordRPC() {
  return invoke<void>('disconnect_discord_rpc');
}
