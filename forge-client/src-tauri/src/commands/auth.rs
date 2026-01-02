#[tauri::command]
pub fn sign_in(email: String, password: String) -> Result<String, String> {
    if email.is_empty() || password.is_empty() {
        return Err("Username, email, and password are required".to_string());
    }

    Ok("Signed in".to_string())
}

#[tauri::command]
pub fn sign_up(username: String, email: String, password: String) -> Result<String, String> {
    if username.is_empty() || email.is_empty() || password.is_empty() {
        return Err("Username, email, and password are required".to_string());
    }

    Ok("Signed up".to_string())
}
