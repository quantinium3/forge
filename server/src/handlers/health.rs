use crate::AppState;
use crate::error::{AppError, AppResult};
use axum::{Json, extract::State};
use diesel_async::RunQueryDsl;
use serde::Serialize;
use tracing::error;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
}

pub async fn health(State(state): State<AppState>) -> AppResult<Json<HealthResponse>> {
    let mut conn = state
        .db_pool
        .get()
        .await
        .map_err(|_| AppError::DatabaseConnectionError)?;

    diesel::sql_query("SELECT 1")
        .execute(&mut conn)
        .await
        .map_err(|e| {
            error!("Database health check failed: {}", e);
            AppError::DatabaseError(e)
        })?;

    Ok(Json(HealthResponse {
        status: "Ok".to_string(),
    }))
}
