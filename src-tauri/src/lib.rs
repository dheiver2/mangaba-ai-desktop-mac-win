use tauri::Manager;

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![app_version])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_title("Mangaba AI")?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error ao iniciar Mangaba AI");
}
