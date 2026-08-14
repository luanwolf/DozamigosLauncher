use crate::types::{AppState, AppStateEvent, TrackedApp};
use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};
use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, System};
use tauri::{AppHandle, Emitter};
use tokio::time::{sleep, Duration};

static TRACKED_APPS: LazyLock<Mutex<HashMap<u32, TrackedApp>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

pub fn get_tracked_apps() -> Result<Vec<TrackedApp>, String> {
    let apps = TRACKED_APPS
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    Ok(apps.values().cloned().collect())
}

pub fn track_app(pid: u32, app_id: &str) {
    let app = TrackedApp {
        pid,
        app_id: app_id.to_string(),
        is_running: true,
    };

    let mut apps = TRACKED_APPS.lock().unwrap();
    apps.insert(pid, app);
}

pub fn emit_app_state_changed(app: &AppHandle, pid: u32, app_id: &str, state: AppState) {
    let event = AppStateEvent {
        pid,
        app_id: app_id.to_string(),
        state,
    };

    let _ = app.emit("app_state_changed", &event);
}

pub fn stop_app(app_id: &str) -> Result<bool, String> {
    let mut apps = TRACKED_APPS.lock().unwrap();
    if let Some(tracked_app) = apps.values_mut().find(|a| a.app_id == app_id) {
        let pid = tracked_app.pid;
        let mut system = System::new();

        system.refresh_processes_specifics(
            ProcessesToUpdate::Some(&[Pid::from_u32(pid)]),
            true,
            ProcessRefreshKind::nothing(),
        );

        if let Some(process) = system.process(Pid::from_u32(pid)) {
            process.kill();
        }

        Ok(true)
    } else {
        Err(format!("App with ID '{}' not found", app_id))
    }
}

pub fn start_monitoring(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut system = System::new();

        loop {
            sleep(Duration::from_secs(2)).await;

            system.refresh_processes_specifics(
                ProcessesToUpdate::All,
                true,
                ProcessRefreshKind::nothing(),
            );

            let fortnite_process = system
                .processes()
                .values()
                .find(|process| process.name() == "FortniteClient-Win64-Shipping.exe");

            if let Some(fn_process) = fortnite_process {
                let fn_pid = fn_process.pid().as_u32();

                let mut apps = TRACKED_APPS.lock().unwrap();
                if !apps.contains_key(&fn_pid) {
                    apps.insert(
                        fn_pid,
                        TrackedApp {
                            pid: fn_pid,
                            app_id: "Fortnite".to_string(),
                            is_running: false,
                        },
                    );
                }

                drop(apps);
            }

            let tracked_pids: Vec<u32> = {
                let apps = TRACKED_APPS.lock().unwrap();
                apps.keys().cloned().collect()
            };

            if tracked_pids.is_empty() {
                continue;
            }

            let mut pids_to_remove = Vec::new();

            for pid in tracked_pids {
                let process_exists = system.process(Pid::from_u32(pid)).is_some();

                if process_exists {
                    let mut apps = TRACKED_APPS.lock().unwrap();
                    if let Some(tracked_app) = apps.get_mut(&pid) {
                        if !tracked_app.is_running {
                            tracked_app.is_running = true;
                            emit_app_state_changed(
                                &app,
                                pid,
                                &tracked_app.app_id,
                                AppState::Running,
                            );
                        }
                    }
                } else {
                    let should_emit = {
                        let mut apps = TRACKED_APPS.lock().unwrap();
                        if let Some(tracked_app) = apps.get_mut(&pid) {
                            if tracked_app.is_running {
                                tracked_app.is_running = false;
                                emit_app_state_changed(
                                    &app,
                                    pid,
                                    &tracked_app.app_id,
                                    AppState::Stopped,
                                );
                                true
                            } else {
                                false
                            }
                        } else {
                            false
                        }
                    };

                    if should_emit {
                        pids_to_remove.push(pid);
                    }
                }
            }

            if !pids_to_remove.is_empty() {
                tauri::async_runtime::spawn(async move {
                    sleep(Duration::from_secs(1)).await;
                    let mut apps = TRACKED_APPS.lock().unwrap();
                    for pid in pids_to_remove {
                        apps.remove(&pid);
                    }
                });
            }
        }
    });
}
