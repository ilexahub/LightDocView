use std::path::{Path, PathBuf};
use tauri::ipc::Response;

const ALLOWED: &[&str] = &["docx", "xlsx", "xls", "doc"];

fn allowed_ext(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            ALLOWED
                .iter()
                .any(|allowed| ext.eq_ignore_ascii_case(allowed))
        })
        .unwrap_or(false)
}

fn looks_like_path(value: &str) -> bool {
    let path = Path::new(value);
    !value.starts_with('-') && (path.is_file() || allowed_ext(path))
}

#[tauri::command]
fn read_document(path: String) -> Result<Response, String> {
    if path.contains('\0') {
        return Err("Некорректный путь к файлу.".into());
    }
    let path = PathBuf::from(path);
    if !allowed_ext(&path) {
        return Err(
            "Формат не поддерживается. Откройте файл .docx, .xlsx, .xls или .doc."
                .into(),
        );
    }
    let data = std::fs::read(&path).map_err(|err| {
        format!("Не удалось прочитать файл: {err}")
    })?;
    Ok(Response::new(data))
}

#[tauri::command]
fn launch_paths() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|arg| looks_like_path(arg))
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_document, launch_paths])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
