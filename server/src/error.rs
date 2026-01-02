use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use std::fmt::Debug;
use thiserror::Error;
use tracing::{debug, error};

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Invalid Credentials")]
    InvalidCredentials,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("Token Expired")]
    TokenExpired,

    #[error("Resource Not found: {0}")]
    NotFound(String),

    #[error("Resource Already Exists: {0}")]
    Conflict(String),

    #[error("Validation Error: {0}")]
    ValidationError(String),

    #[error("Bad Request: {0}")]
    BadRequest(String),

    #[error("Too Many Requests")]
    TooManyRequests,

    #[error("Payload Too Large")]
    PayloadTooLarge,

    #[error("Database Error")]
    DatabaseError(#[from] diesel::result::Error),

    #[error("Database Connection Error")]
    DatabaseConnectionError,

    #[error("Internal Server Error: {0}")]
    InternalServerError(String),
}

#[derive(Serialize)]
pub struct ErrorResponse {
    error: ErrorBody,
}

#[derive(Serialize)]
pub struct ErrorBody {
    code: &'static str,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<serde_json::Value>,
}

impl AppError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::InvalidCredentials | Self::Unauthorized | Self::TokenExpired => {
                StatusCode::UNAUTHORIZED
            }
            Self::Forbidden => StatusCode::FORBIDDEN,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::Conflict(_) => StatusCode::CONFLICT,
            Self::ValidationError(_) | Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::TooManyRequests => StatusCode::TOO_MANY_REQUESTS,
            Self::PayloadTooLarge => StatusCode::PAYLOAD_TOO_LARGE,
            Self::DatabaseError(_) | Self::DatabaseConnectionError => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
            Self::InternalServerError(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_code(&self) -> &'static str {
        match self {
            Self::InvalidCredentials => "INVALID_CREDENTIALS",
            Self::Unauthorized => "UNAUTHORIZED",
            Self::Forbidden => "FORBIDDEN",
            Self::TokenExpired => "TOKEN_EXPIRED",
            Self::NotFound(_) => "NOT_FOUND",
            Self::Conflict(_) => "CONFLICT",
            Self::ValidationError(_) => "VALIDATION_ERROR",
            Self::BadRequest(_) => "BAD_REQUEST",
            Self::TooManyRequests => "TOO_MANY_REQUESTS",
            Self::PayloadTooLarge => "PAYLOAD_TOO_LARGE",
            Self::DatabaseError(_) => "DATABASE_ERROR",
            Self::DatabaseConnectionError => "DATABASE_CONNECTION_ERROR",
            Self::InternalServerError(_) => "INTERNAL_SERVER_ERROR",
        }
    }

    fn client_message(&self) -> String {
        match self {
            Self::InvalidCredentials => "Invalid credentials".into(),
            Self::Unauthorized => "Authentication required".into(),
            Self::Forbidden => "Access denied".into(),
            Self::TokenExpired => "Token has expired".into(),
            Self::NotFound(resource) => format!("{} not found", resource),
            Self::Conflict(msg) => msg.clone(),
            Self::ValidationError(msg) => msg.clone(),
            Self::BadRequest(msg) => msg.clone(),
            Self::TooManyRequests => "Too many requests, please try again later".into(),
            Self::PayloadTooLarge => "Request payload is too large".into(),

            Self::DatabaseError(_)
            | Self::DatabaseConnectionError
            | Self::InternalServerError(_) => "An internal error occurred".into(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match &self {
            Self::DatabaseError(e) => {
                error!(error = %e, "Database error");
            }
            Self::DatabaseConnectionError => {
                error!("Database connection pool exhausted");
            }
            Self::InternalServerError(msg) => {
                error!(error = %msg, "Internal error");
            }
            _ => {
                debug!(error = %self, "Client error");
            }
        }

        let status = self.status_code();
        let body = ErrorResponse {
            error: ErrorBody {
                code: self.error_code(),
                message: self.client_message(),
                details: None,
            },
        };

        (status, Json(body)).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;

pub trait ResultExt<T> {
    fn not_found(self, resource: &str) -> AppResult<T>;
    fn validation_err(self, msg: &str) -> AppResult<T>;
}

impl<T, E: Debug> ResultExt<T> for Result<T, E> {
    fn not_found(self, resource: &str) -> AppResult<T> {
        self.map_err(|_| AppError::NotFound(resource.into()))
    }

    fn validation_err(self, msg: &str) -> AppResult<T> {
        self.map_err(|_| AppError::ValidationError(msg.into()))
    }
}
