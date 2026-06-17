// Tauri entry point. The dashboard is a pure web frontend that talks to Supabase
// Edge Functions over HTTPS — no privileged native commands are exposed, which
// keeps the attack surface minimal. The shell plugin is included only so the
// frontend can open external links (RevenueCat, Supabase dashboard) in the
// system browser if needed.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running bluprint-admin");
}
