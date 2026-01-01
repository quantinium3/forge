use anyhow::{Context, Result};
use axum::{Router, routing::get, serve};
use deadpool_diesel::postgres::Pool;
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer};
use tracing::{Level, info};
use tracing_subscriber::{fmt::time::ChronoUtc, layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod handlers;

#[derive(Clone)]
pub struct AppState {
    config: Arc<config::Config>,
    db_pool: Pool,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_timer(ChronoUtc::new("%F %T %a %:z%Z %s".to_string())),
        )
        .init();

    let config = Arc::new(config::Config::new()?);
    let database_url: String = format!(
        "postgres://{}:{}@{}:{}/{}",
        config.database.user,
        config.database.password,
        config.database.host,
        config.database.port,
        config.database.database
    );

    let db_pool = db::index::establish_connection(&database_url).await?;

    let state = AppState {
        config: config.clone(),
        db_pool,
    };

    let addr = SocketAddr::from((
        config
            .server
            .host
            .parse::<IpAddr>()
            .context("Invalid server host IP Address")?,
        config.server.port,
    ));
    let listener = TcpListener::bind(addr)
        .await
        .with_context(|| format!("Failed to bind to {addr}"))?;

    let app = Router::new()
        .route("/health", get(handlers::health::health))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        )
        .with_state(state);

    info!("listening on http://{}", addr);
    serve(listener, app)
        .with_graceful_shutdown(shutdown())
        .await
        .context("Server shutdown")?;
    Ok(())
}

async fn shutdown() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            info!("received Ctrl+C signal, shutting down gracefully");
        },
        _ = terminate => {
            info!("received SIGTERM signal, shutting down gracefully");
        },
    }
    info!("shutting down server");
}
