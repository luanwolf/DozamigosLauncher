#[cfg(windows)]
use {
    crate::app_monitor,
    crate::legendary,
    crate::types::{AppState, CommandOutput, DiskSpace, LaunchData, TrackedApp},
    fs2, shlex,
    std::path::Path,
    tauri_plugin_shell::ShellExt,
};

#[cfg(desktop)]
use {
    crate::discord_rpc,
    crate::system_tray,
    tauri::AppHandle,
};

use tauri::command;

#[command]
pub fn get_locale() -> String {
    sys_locale::get_locale()
        .and_then(|locale| locale.split(['_', '-']).next().map(|s| s.to_string()))
        .unwrap_or_else(|| "".to_string())
}

#[cfg(windows)]
#[command]
pub fn get_disk_space(dir: String) -> Result<DiskSpace, String> {
    let path = Path::new(&dir);

    match (fs2::total_space(path), fs2::available_space(path)) {
        (Ok(total), Ok(available)) => {
            let disk_space = DiskSpace { total, available };

            Ok(disk_space)
        }
        (Err(e), _) | (_, Err(e)) => Err(e.to_string()),
    }
}

#[cfg(desktop)]
#[command]
pub fn set_tray_visibility(app: AppHandle, visible: bool) -> bool {
    system_tray::set_visibility(app, visible)
}

#[cfg(windows)]
#[command]
pub fn get_tracked_apps() -> Result<Vec<TrackedApp>, String> {
    app_monitor::get_tracked_apps()
}

#[cfg(windows)]
#[command]
pub async fn launch_app(app: AppHandle, launch_data: LaunchData) -> Result<u32, String> {
    if !launch_data.pre_launch_command.is_empty() {
        let pre_launch_result = execute_pre_launch_command(&app, &launch_data).await;
        if let Err(e) = pre_launch_result {
            return Err(format!("Pre-launch command failed: {}", e));
        }
    }

    let pid = launch_application(&app, &launch_data).await?;

    app_monitor::track_app(pid, &launch_data.game_id);
    app_monitor::emit_app_state_changed(&app, pid, &launch_data.game_id, AppState::Running);

    Ok(pid)
}

#[cfg(windows)]
#[command]
pub async fn stop_app(_app: AppHandle, app_id: String) -> Result<bool, String> {
    app_monitor::stop_app(&app_id)
}

#[cfg(desktop)]
#[command]
pub async fn connect_discord_rpc() {
    discord_rpc::connect("1428475599290241046");
}

#[cfg(desktop)]
#[command]
pub async fn update_discord_rpc(details: Option<String>, state: Option<String>) {
    discord_rpc::update_activity(details.as_deref(), state.as_deref())
}

#[cfg(desktop)]
#[command]
pub async fn disconnect_discord_rpc() {
    discord_rpc::disconnect()
}

#[cfg(windows)]
#[command]
pub async fn run_legendary(
    app: AppHandle,
    config_path: String,
    args: Vec<String>,
) -> Result<CommandOutput, String> {
    legendary::run_legendary(&app, &config_path, &args).await
}

#[cfg(windows)]
#[command]
pub async fn start_legendary_stream(
    app: AppHandle,
    config_path: String,
    stream_id: String,
    args: Vec<String>,
) -> Result<String, String> {
    legendary::start_legendary_stream(&app, &config_path, &stream_id, &args).await
}

#[cfg(windows)]
#[command]
pub async fn stop_legendary_stream(
    stream_id: String,
    force_kill_all: bool,
) -> Result<bool, String> {
    legendary::stop_legendary_stream(&stream_id, force_kill_all).await
}

#[cfg(windows)]
async fn execute_pre_launch_command(
    app: &AppHandle,
    launch_data: &LaunchData,
) -> Result<(), String> {
    let shell = app.shell();

    let command_parts = shlex::split(&launch_data.pre_launch_command)
        .ok_or_else(|| "Invalid command format".to_string())?;

    if command_parts.is_empty() {
        return Ok(());
    }

    let program = &command_parts[0];
    let args = if command_parts.len() > 1 {
        command_parts[1..].to_vec()
    } else {
        vec![]
    };

    let mut command = shell.command(program).args(args);

    if !launch_data.working_directory.is_empty()
        && Path::new(&launch_data.working_directory).exists()
    {
        command = command.current_dir(&launch_data.working_directory);
    }

    for (key, value) in &launch_data.environment {
        command = command.env(key, value);
    }

    if launch_data.pre_launch_wait {
        let (mut rx, _child) = command.spawn().map_err(|e| e.to_string())?;

        while let Some(event) = rx.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                    if payload.code.unwrap_or(1) != 0 {
                        return Err(format!(
                            "Pre-launch command exited with code: {:?}",
                            payload.code
                        ));
                    }
                    return Ok(());
                }
                tauri_plugin_shell::process::CommandEvent::Error(error) => {
                    return Err(format!("Pre-launch command error: {}", error));
                }
                _ => continue,
            }
        }
    } else {
        let (_rx, _child) = command.spawn().map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[cfg(windows)]
async fn launch_application(app: &AppHandle, launch_data: &LaunchData) -> Result<u32, String> {
    let shell = app.shell();

    let executable_path = Path::new(&launch_data.game_directory).join(&launch_data.game_executable);

    if !executable_path.exists() {
        return Err(format!(
            "App executable not found: {}",
            executable_path.display()
        ));
    }

    let mut command = shell
        .command(executable_path.to_string_lossy().to_string())
        .args(&launch_data.game_parameters)
        .args(&launch_data.user_parameters)
        .args(&launch_data.egl_parameters);

    if !launch_data.working_directory.is_empty()
        && Path::new(&launch_data.working_directory).exists()
    {
        command = command.current_dir(&launch_data.working_directory);
    }

    for (key, value) in &launch_data.environment {
        command = command.env(key, value);
    }

    let (_rx, child) = command.spawn().map_err(|e| e.to_string())?;

    let pid = child.pid();

    Ok(pid)
}

#[cfg(windows)]
#[command]
pub fn send_native_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    crate::windows_notifications::show(&app, &title, &body)
}

#[cfg(windows)]
fn epic_launcher_candidates() -> Vec<std::path::PathBuf> {
    use std::path::PathBuf;

    let mut paths = Vec::new();

    // Protocol handler: "C:\...\EpicGamesLauncher.exe" %1
    if let Some(exe) = read_epic_protocol_exe() {
        paths.push(exe);
    }

    let program_files = std::env::var_os("ProgramFiles").map(PathBuf::from);
    let program_files_x86 = std::env::var_os("ProgramFiles(x86)").map(PathBuf::from);
    for root in [program_files_x86, program_files].into_iter().flatten() {
        paths.push(
            root.join("Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe"),
        );
        paths.push(
            root.join("Epic Games\\Launcher\\Portal\\Binaries\\Win32\\EpicGamesLauncher.exe"),
        );
    }

    paths
}

#[cfg(windows)]
fn read_epic_protocol_exe() -> Option<std::path::PathBuf> {
    use std::os::windows::ffi::OsStringExt;
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::ERROR_SUCCESS;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY_CLASSES_ROOT, KEY_READ, REG_VALUE_TYPE,
    };

    let subkey: Vec<u16> = "com.epicgames.launcher\\shell\\open\\command\0"
        .encode_utf16()
        .collect();

    unsafe {
        let mut hkey = std::mem::zeroed();
        if RegOpenKeyExW(
            HKEY_CLASSES_ROOT,
            PCWSTR(subkey.as_ptr()),
            Some(0),
            KEY_READ,
            &mut hkey,
        ) != ERROR_SUCCESS
        {
            return None;
        }

        let mut kind = REG_VALUE_TYPE::default();
        let mut size = 0u32;
        let _ = RegQueryValueExW(hkey, PCWSTR::null(), None, Some(&mut kind), None, Some(&mut size));

        if size == 0 {
            let _ = RegCloseKey(hkey);
            return None;
        }

        let mut buf = vec![0u8; size as usize];
        let status = RegQueryValueExW(
            hkey,
            PCWSTR::null(),
            None,
            Some(&mut kind),
            Some(buf.as_mut_ptr()),
            Some(&mut size),
        );
        let _ = RegCloseKey(hkey);
        if status != ERROR_SUCCESS {
            return None;
        }

        let wide: Vec<u16> = buf
            .chunks_exact(2)
            .map(|c| u16::from_le_bytes([c[0], c[1]]))
            .take_while(|c| *c != 0)
            .collect();
        let value = std::ffi::OsString::from_wide(&wide)
            .to_string_lossy()
            .to_string();

        // "D:\Epic Games\...\EpicGamesLauncher.exe" %1
        let trimmed = value.trim();
        let exe = if let Some(rest) = trimmed.strip_prefix('"') {
            rest.split('"').next().unwrap_or("").to_string()
        } else {
            trimmed.split_whitespace().next().unwrap_or("").to_string()
        };

        let path = std::path::PathBuf::from(exe);
        path.is_file().then_some(path)
    }
}

/// Opens a custom URL protocol via the OS (e.g. Epic Games Launcher deep links).
/// When Epic is closed, protocol-only opens often no-op — launch the exe with the URI.
#[cfg(windows)]
#[command]
pub fn open_protocol_url(url: String) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    if !(url.starts_with("com.epicgames.launcher://")
        || url.starts_with("https://")
        || url.starts_with("http://"))
    {
        return Err("unsupported url scheme".into());
    }

    if url.starts_with("com.epicgames.launcher://") {
        for exe in epic_launcher_candidates() {
            if !exe.is_file() {
                continue;
            }
            // Starts Epic if closed, and hands it the deep link when already running.
            match std::process::Command::new(&exe).arg(&url).spawn() {
                Ok(_) => return Ok(()),
                Err(_) => continue,
            }
        }
    }

    let open: Vec<u16> = std::ffi::OsStr::new("open")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let wide: Vec<u16> = std::ffi::OsStr::new(&url)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let result = unsafe {
        ShellExecuteW(
            Some(HWND::default()),
            PCWSTR(open.as_ptr()),
            PCWSTR(wide.as_ptr()),
            PCWSTR::null(),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };

    if (result.0 as usize) <= 32 {
        return Err(format!("failed to open url (ShellExecute={})", result.0 as usize));
    }
    Ok(())
}
