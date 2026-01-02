use crate::AppState;
use crate::consts::PASSWORD_REGEX;
use crate::db::models::auth::NewUser;
use crate::error::{AppError, AppResult};
use crate::utils::ValidatedJson;
use axum::{Json, extract::State};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

#[derive(Deserialize, Validate)]
pub struct SignUpRequest {
    #[validate(length(min = 3, max = 32))]
    username: String,
    #[validate(email)]
    email: String,
    #[validate(length(min = 8), regex(path = *PASSWORD_REGEX, message = "Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character"))]
    password: String,
}

pub async fn sign_up(
    State(state): State<AppState>,
    ValidatedJson(body): ValidatedJson<SignUpRequest>,
) -> AppResult<Json<&'static str>> {
    let mut conn = state
        .db_pool
        .get()
        .await
        .map_err(|_| AppError::DatabaseConnectionError)?;

    use crate::db::{models::auth::User, schema::users};
    use diesel::dsl::count_star;
    use diesel::prelude::*;
    use diesel_async::RunQueryDsl;

    let users_count = users::table
        .select(count_star())
        .first::<i64>(&mut conn)
        .await?;

    match users_count == 0 {
        // create admin user
        true => {
            let new_user = NewUser {
                id: Uuid::now_v7(),
                username: &body.username,
                email: &body.email,
            };
            diesel::insert_into(users::table)
                .values(&new_user)
                .returning(User::as_returning())
                .get_result::<User>(&mut conn)
                .await?;
        }
        // create normal user
        false => {}
    }

    Ok(Json("Sign up endpoint - not yet implemented"))
}
