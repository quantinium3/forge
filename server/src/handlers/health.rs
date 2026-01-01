use crate::AppState;
use axum::{extract::State, http::StatusCode, response::IntoResponse};
use diesel::RunQueryDsl;
use tracing::error;

pub async fn health(State(state): State<AppState>) -> impl IntoResponse {
    let conn = match state.db_pool.get().await {
        Ok(c) => c,
        Err(e) => {
            error!("Health check failed to get DB connection: {}", e);
            return (StatusCode::SERVICE_UNAVAILABLE, "DB_CONNECTION_ERROR");
        }
    };

    let result = conn
        .interact(|c| {
            diesel::select(diesel::dsl::sql::<diesel::sql_types::Integer>("1")).get_result::<i32>(c)
        })
        .await;

    match result {
        Ok(Ok(_)) => (StatusCode::OK, "OK"),
        _ => {
            error!("Health check DB query failed");
            (StatusCode::SERVICE_UNAVAILABLE, "DB_QUERY_ERROR")
        }
    }
}
