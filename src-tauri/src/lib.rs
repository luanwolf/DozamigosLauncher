use tauri::generate_handler;
#[cfg(desktop)]
use tauri::{LogicalSize, Manager};
use tauri_plugin_prevent_default::{Builder as PreventDefaultBuilder, Flags, KeyboardShortcut};

#[cfg(windows)]
mod app_monitor;
#[cfg(windows)]
mod legendary;
#[cfg(windows)]
mod windows_notifications;

mod commands;
#[cfg(desktop)]
mod discord_rpc;
#[cfg(desktop)]
mod system_tray;
mod types;

use commands::*;

const PREFERRED_WINDOW_WIDTH: f64 = 1400.0;
const PREFERRED_WINDOW_HEIGHT: f64 = 910.0;
const FALLBACK_WINDOW_WIDTH: f64 = 800.0;
const FALLBACK_WINDOW_HEIGHT: f64 = 600.0;

/// 1400×910 centered on screens taller than 910 logical px; otherwise 800×600.
#[cfg(desktop)]
fn apply_startup_window_size(app: &tauri::App) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let (width, height) = window
        .current_monitor()
        .ok()
        .flatten()
        .map(|monitor| {
            // Compare in logical px: set_size below is logical, monitor.size() is physical.
            let size = monitor.size().to_logical::<f64>(monitor.scale_factor());
            if size.height > PREFERRED_WINDOW_HEIGHT && size.width >= PREFERRED_WINDOW_WIDTH {
                (PREFERRED_WINDOW_WIDTH, PREFERRED_WINDOW_HEIGHT)
            } else {
                (FALLBACK_WINDOW_WIDTH, FALLBACK_WINDOW_HEIGHT)
            }
        })
        .unwrap_or((FALLBACK_WINDOW_WIDTH, FALLBACK_WINDOW_HEIGHT));

    let _ = window.set_size(LogicalSize::new(width, height));
    let _ = window.center();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(desktop)]
    let mut builder = tauri::Builder::default();

    #[cfg(not(desktop))]
    let builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_shell::init());

        // ponytail: omit in debug so `tauri dev` can run beside an installed build
        #[cfg(not(debug_assertions))]
        {
            builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                let _ = app
                    .get_webview_window("main")
                    .expect("no main window")
                    .set_focus();
            }));
        }

        builder = builder
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                None,
            ))
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init())
            .setup(|app| {
                apply_startup_window_size(app);

                #[cfg(windows)]
                {
                    windows_notifications::init(app.handle());
                    app_monitor::start_monitoring(app.handle().clone());
                }

                Ok(())
            });
    }

    #[cfg(windows)]
    {
        builder = builder.on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let _ = legendary::kill_legendary_processes();
            }
        });
    }

    let prevent = PreventDefaultBuilder::new()
        .shortcut(KeyboardShortcut::new("F5"))
        .with_flags(Flags::all().difference(Flags::RELOAD | Flags::DEV_TOOLS))
        .build();

    builder
        .invoke_handler(generate_handler![
            get_locale,
            #[cfg(windows)] run_legendary,
            #[cfg(windows)] start_legendary_stream,
            #[cfg(windows)] stop_legendary_stream,
            #[cfg(windows)] launch_app,
            #[cfg(windows)] stop_app,
            #[cfg(windows)] get_tracked_apps,
            #[cfg(windows)] get_disk_space,
            #[cfg(windows)] send_native_notification,
            #[cfg(windows)] open_protocol_url,
            #[cfg(desktop)] connect_discord_rpc,
            #[cfg(desktop)] update_discord_rpc,
            #[cfg(desktop)] disconnect_discord_rpc,
            #[cfg(desktop)] set_tray_visibility
        ])
        .plugin(prevent)
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_websocket::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
