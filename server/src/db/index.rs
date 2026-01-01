use anyhow::{Context, Result};
use deadpool_diesel::postgres::{Manager, Pool, Runtime};
use diesel::RunQueryDsl;
use tracing::info;

pub async fn establish_connection(database_url: &str) -> Result<Pool> {
    let manager = Manager::new(database_url, Runtime::Tokio1);
    let db_pool = Pool::builder(manager)
        .max_size(8)
        .build()
        .context("Failed to create database pool")?;

    info!("Testing database connection...");
    {
        let conn = db_pool
            .get()
            .await
            .context("Failed to get connection from pool")?;

        conn.interact(|conn| diesel::sql_query("SELECT 1").execute(conn))
            .await
            .map_err(|e| anyhow::anyhow!("Database interaction failed: {:?}", e))?
            .context("Failed to execute test query")?;
    }
    info!("Database connection successful!");
    Ok(db_pool)
}
