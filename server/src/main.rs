use anyhow::{Context, Result};
use axum::{Router, routing::get, serve};
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::{fmt::time::ChronoUtc, layer::SubscriberExt, util::SubscriberInitExt};

mod config;

#[tokio::main]
async fn main() -> Result<()> {
    let config = Arc::new(config::Config::new()?);
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_timer(ChronoUtc::new("%F %T %a %:z%Z %s".to_string())),
        )
        .init();

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
        .route("/", get(index))
        .layer(TraceLayer::new_for_http())
        .with_state(config);

    info!("listening on http://{}", addr);
    serve(listener, app)
        .with_graceful_shutdown(shutdown())
        .await
        .context("Server shutdown")?;
    Ok(())
}

async fn index() -> &'static str {
    "Hello, world!"
}

async fn shutdown() {
    tokio::signal::ctrl_c()
        .await
        .expect("failed to listen for shutdown signal");
    info!("shutting down server");
}
