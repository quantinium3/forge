use axum::{
    Json,
    extract::{FromRequest, Request},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Serialize, de::DeserializeOwned};
use validator::Validate;

#[derive(Serialize)]
pub struct ValidationErrorResponse {
    pub error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

pub struct ValidatedJson<T>(pub T);

impl<T, S> FromRequest<S> for ValidatedJson<T>
where
    T: DeserializeOwned + Validate,
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        let Json(value) = Json::<T>::from_request(req, state)
            .await
            .map_err(|e| {
                (
                    StatusCode::BAD_REQUEST,
                    Json(ValidationErrorResponse {
                        error: "Invalid JSON".to_string(),
                        details: Some(serde_json::json!({ "message": e.body_text() })),
                    }),
                )
                    .into_response()
            })?;

        value.validate().map_err(|e| {
            (
                StatusCode::BAD_REQUEST,
                Json(ValidationErrorResponse {
                    error: "Validation failed".to_string(),
                    details: serde_json::to_value(e).ok(),
                }),
            )
                .into_response()
        })?;

        Ok(ValidatedJson(value))
    }
}
