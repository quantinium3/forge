use anyhow::{Context, Result};
use diesel_async::pooled_connection::deadpool::Pool;
use diesel_async::pooled_connection::AsyncDieselConnectionManager;
use diesel_async::{AsyncPgConnection, RunQueryDsl};
use tracing::info;

pub type DbPool = Pool<AsyncPgConnection>;

pub async fn establish_connection(database_url: &str) -> Result<DbPool> {
    info!("Creating database connection pool...");

    let config = AsyncDieselConnectionManager::<AsyncPgConnection>::new(database_url);
    let pool = Pool::builder(config)
        .max_size(8)
        .build()
        .context("Failed to create database pool")?;

    info!("Testing database connection...");

    let mut conn = pool
        .get()
        .await
        .context("Failed to get connection from pool")?;

    diesel::sql_query("SELECT 1")
        .execute(&mut conn)
        .await
        .context("Failed to execute test query")?;

    info!("Database connection successful!");

    Ok(pool)
}
