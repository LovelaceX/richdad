use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

// Window control commands
#[tauri::command]
fn minimize_window(window: tauri::Window) {
    window.minimize().unwrap();
}

#[tauri::command]
fn maximize_window(window: tauri::Window) {
    if window.is_maximized().unwrap() {
        window.unmaximize().unwrap();
    } else {
        window.maximize().unwrap();
    }
}

#[tauri::command]
fn close_window(window: tauri::Window) {
    window.close().unwrap();
}

#[tauri::command]
fn is_maximized(window: tauri::Window) -> bool {
    window.is_maximized().unwrap()
}

#[tauri::command]
fn create_new_window(app: AppHandle) -> Result<(), String> {
    let window_count = app.webview_windows().len();
    let label = format!("richdad_{}", window_count);

    WebviewWindowBuilder::new(&app, label, WebviewUrl::App("/".into()))
        .title("RichDad")
        .inner_size(1600.0, 1000.0)
        .min_inner_size(1200.0, 800.0)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            minimize_window,
            maximize_window,
            close_window,
            is_maximized,
            create_new_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
