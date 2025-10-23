// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::process::{Command, Child};
use std::sync::Mutex;

// State to track dev server process
struct DevServerState {
    process: Mutex<Option<Child>>,
}

#[tauri::command]
async fn open_folder_dialog(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri::api::dialog::blocking::FileDialogBuilder;
    
    let folder = FileDialogBuilder::new()
        .pick_folder();
    
    match folder {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("No folder selected".to_string()),
    }
}

#[tauri::command]
async fn start_dev_server(
    repo_path: String,
    state: tauri::State<'_, DevServerState>,
) -> Result<u16, String> {
    // Detect package manager and start dev server
    let pm = if std::path::Path::new(&format!("{}/pnpm-lock.yaml", repo_path)).exists() {
        "pnpm"
    } else if std::path::Path::new(&format!("{}/yarn.lock", repo_path)).exists() {
        "yarn"
    } else {
        "npm"
    };

    let child = Command::new(pm)
        .args(&["run", "dev"])
        .current_dir(&repo_path)
        .spawn()
        .map_err(|e| format!("Failed to start dev server: {}", e))?;

    let mut process_lock = state.process.lock().unwrap();
    *process_lock = Some(child);

    // For M0, assume port 3001 (hardcoded)
    // In production, parse output to detect actual port
    Ok(3001)
}

#[tauri::command]
async fn stop_dev_server(state: tauri::State<'_, DevServerState>) -> Result<(), String> {
    let mut process_lock = state.process.lock().unwrap();
    
    if let Some(mut child) = process_lock.take() {
        child.kill().map_err(|e| format!("Failed to stop dev server: {}", e))?;
    }
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(DevServerState {
            process: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            open_folder_dialog,
            start_dev_server,
            stop_dev_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

