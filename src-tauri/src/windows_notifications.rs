//! Windows toast branding: registers AppUserModelID + Start Menu shortcut so
//! notifications show as "Dozamigos Launcher" instead of PowerShell (dev) or a
//! generic shell host.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};
use windows::core::{Interface, HSTRING};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, IPersistFile, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED};
use windows::Win32::UI::Shell::{
    IObjectWithAppUserModelID, IShellLinkW, SetCurrentProcessExplicitAppUserModelID, ShellLink,
};

const APP_USER_MODEL_ID: &str = if cfg!(debug_assertions) {
    "com.dozamigos-launcher.dev"
} else {
    "com.dozamigos-launcher.app"
};

pub fn init(app: &AppHandle) {
    let _ = register_process_app_id();
    let _ = ensure_start_menu_shortcut(app);
}

pub fn show(app: &AppHandle, title: &str, body: &str) -> Result<(), String> {
    let icon = resolve_icon_path(app);
    let mut toast = winrt_notification::Toast::new(APP_USER_MODEL_ID).title(title).text1(body);

    if let Some(icon_path) = icon.as_ref().filter(|p| p.is_file()) {
        let brand = if cfg!(debug_assertions) {
            "Dozamigos Dev"
        } else {
            "Dozamigos Launcher"
        };
        toast = toast.icon(icon_path, winrt_notification::IconCrop::Circular, brand);
    }

    toast.show().map_err(|e| format!("{e}"))
}

fn register_process_app_id() -> windows::core::Result<()> {
    unsafe { SetCurrentProcessExplicitAppUserModelID(&HSTRING::from(APP_USER_MODEL_ID)) }
}

fn ensure_start_menu_shortcut(app: &AppHandle) -> Result<(), String> {
    let exe = tauri::utils::platform::current_exe().map_err(|e| e.to_string())?;
    let shortcut_path = start_menu_shortcut_path()?;

    if let Some(parent) = shortcut_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let icon = resolve_icon_path(app);
    create_shell_link(&exe, &shortcut_path, icon.as_deref()).map_err(|e| e.to_string())
}

fn start_menu_shortcut_path() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir().ok_or_else(|| "Could not resolve AppData directory".to_string())?;
    let name = if cfg!(debug_assertions) {
        "Dozamigos Dev.lnk"
    } else {
        "Dozamigos Launcher.lnk"
    };
    Ok(data_dir
        .join("Microsoft")
        .join("Windows")
        .join("Start Menu")
        .join("Programs")
        .join(name))
}

fn create_shell_link(target: &Path, shortcut: &Path, icon: Option<&Path>) -> windows::core::Result<()> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

        let shell_link: IShellLinkW =
            CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)?;

        let target_wide = HSTRING::from(target.to_string_lossy().as_ref());
        shell_link.SetPath(&target_wide)?;

        if let Some(work_dir) = target.parent() {
            let work_wide = HSTRING::from(work_dir.to_string_lossy().as_ref());
            let _ = shell_link.SetWorkingDirectory(&work_wide);
        }

        if let Some(icon_path) = icon {
            let icon_wide = HSTRING::from(icon_path.to_string_lossy().as_ref());
            let _ = shell_link.SetIconLocation(&icon_wide, 0);
        }

        let app_model: IObjectWithAppUserModelID = shell_link.cast()?;
        app_model.SetAppID(&HSTRING::from(APP_USER_MODEL_ID))?;

        let persist: IPersistFile = shell_link.cast()?;
        let shortcut_wide = HSTRING::from(shortcut.to_string_lossy().as_ref());
        persist.Save(&shortcut_wide, true)?;

        Ok(())
    }
}

fn resolve_icon_path(app: &AppHandle) -> Option<PathBuf> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let icon = resource_dir.join("icons").join("icon.ico");
        if icon.is_file() {
            return Some(icon);
        }
    }

    let exe = tauri::utils::platform::current_exe().ok()?;
    let exe_dir = exe.parent()?;

    for candidate in [
        exe_dir.join("icons").join("icon.ico"),
        exe_dir.join("..").join("icons").join("icon.ico"),
        exe_dir
            .join("..")
            .join("..")
            .join("..")
            .join("icons")
            .join("icon.ico"),
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("icons").join("icon.ico"),
    ] {
        if candidate.is_file() {
            return Some(candidate);
        }
    }

    None
}
