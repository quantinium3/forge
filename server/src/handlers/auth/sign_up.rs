use crate::AppState;
use axum::{Json, extract::State, response::Response};
use serde::Deserialize;

#[derive(Deserialize)]
struct SignUpRequest {
    username: String,
    email: String,
    password: String,
}
pub async fn sign_up(
    State(state): State<AppState>,
    Json(body): Json<SignUpRequest>,
) -> impl Response {
}
