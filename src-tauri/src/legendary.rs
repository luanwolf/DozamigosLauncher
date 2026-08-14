use crate::types::{CommandOutput, EventType, StreamEvent};
use std::collections::HashMap;
use std::os::windows::process::CommandExt;
use std::process::Command;
use std::sync::{LazyLock, Mutex};
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

static ACTIVE_STREAMS: LazyLock<Mutex<HashMap<String, CommandChild>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

pub async fn run_legendary(
    app: &AppHandle,
    config_path: &str,
    args: &[String],
) -> Result<CommandOutput, String> {
    let sidecar = create_legendary_sidecar(app, config_path, args)?;
    let (mut rx, _child) = sidecar.spawn().map_err(|e| e.to_string())?;

    let mut stdout = String::new();
    let mut stderr = String::new();

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                stdout.push_str(&String::from_utf8_lossy(&bytes));
            }
            CommandEvent::Stderr(bytes) => {
                stderr.push_str(&String::from_utf8_lossy(&bytes));
            }
            CommandEvent::Terminated(payload) => {
                return Ok(CommandOutput {
                    code: payload.code,
                    signal: payload.signal,
                    stdout: stdout.trim().to_string(),
                    stderr: stderr.trim().to_string(),
                });
            }
            CommandEvent::Error(error) => {
                return Err(format!("Command error: {}", error));
            }
            _ => continue,
        }
    }

    Ok(CommandOutput {
        code: None,
        signal: None,
        stdout: stdout.trim().to_string(),
        stderr: stderr.trim().to_string(),
    })
}

pub async fn start_legendary_stream(
    app: &AppHandle,
    config_path: &str,
    stream_id: &str,
    args: &[String],
) -> Result<String, String> {
    let sidecar = create_legendary_sidecar(app, config_path, args)?;
    let (mut rx, child) = sidecar.spawn().map_err(|e| e.to_string())?;

    {
        let mut streams = ACTIVE_STREAMS.lock().unwrap();
        streams.insert(stream_id.to_string(), child);
    }

    let stream_id_clone = stream_id.to_string();
    let app_clone = app.clone();

    tauri::async_runtime::spawn(async move {
        let event_name = format!("legendary_stream:{}", stream_id_clone);

        while let Some(event) = rx.recv().await {
            let stream_event = match event {
                CommandEvent::Stdout(bytes) => StreamEvent {
                    stream_id: stream_id_clone.clone(),
                    event_type: EventType::Stdout,
                    data: String::from_utf8_lossy(&bytes).to_string(),
                    code: None,
                    signal: None,
                },
                CommandEvent::Stderr(bytes) => StreamEvent {
                    stream_id: stream_id_clone.clone(),
                    event_type: EventType::Stderr,
                    data: String::from_utf8_lossy(&bytes).to_string(),
                    code: None,
                    signal: None,
                },
                CommandEvent::Terminated(payload) => {
                    let event = StreamEvent {
                        stream_id: stream_id_clone.clone(),
                        event_type: EventType::Terminated,
                        data: String::new(),
                        code: payload.code,
                        signal: payload.signal,
                    };

                    {
                        let mut streams = ACTIVE_STREAMS.lock().unwrap();
                        streams.remove(&stream_id_clone);
                    }

                    let _ = app_clone.emit(&event_name, &event);
                    break;
                }
                CommandEvent::Error(error) => {
                    let event = StreamEvent {
                        stream_id: stream_id_clone.clone(),
                        event_type: EventType::Error,
                        data: error,
                        code: None,
                        signal: None,
                    };

                    {
                        let mut streams = ACTIVE_STREAMS.lock().unwrap();
                        streams.remove(&stream_id_clone);
                    }

                    let _ = app_clone.emit(&event_name, &event);
                    break;
                }
                _ => continue,
            };

            let _ = app_clone.emit(&event_name, &stream_event);
        }
    });

    Ok(stream_id.to_string())
}

pub async fn stop_legendary_stream(stream_id: &str, force_kill_all: bool) -> Result<bool, String> {
    if force_kill_all {
        kill_legendary_processes();
        Ok(true)
    } else {
        let child = {
            let mut streams = ACTIVE_STREAMS.lock().unwrap();
            streams.remove(stream_id)
        };

        if let Some(child) = child {
            match child.kill() {
                Ok(_) => Ok(true),
                Err(e) => Err(format!("Failed to kill process: {}", e)),
            }
        } else {
            Ok(false)
        }
    }
}

fn create_legendary_sidecar(
    app: &AppHandle,
    config_path: &str,
    args: &[String],
) -> Result<tauri_plugin_shell::process::Command, String> {
    Ok(app
        .shell()
        .sidecar("legendary")
        .map_err(|e| e.to_string())?
        .args(args)
        .env("LEGENDARY_CONFIG_PATH", config_path))
}

pub fn kill_legendary_processes() {
    {
        let streams = ACTIVE_STREAMS.lock().unwrap();
        if streams.is_empty() {
            return;
        }
    }

    let _ = Command::new("taskkill")
        .args(&["/F", "/IM", "legendary.exe"])
        .creation_flags(0x08000000)
        .output();

    {
        let mut streams = ACTIVE_STREAMS.lock().unwrap();
        streams.clear();
    }
}
