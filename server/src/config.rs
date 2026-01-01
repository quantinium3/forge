use anyhow::{Context, Result};
use dotenvy::dotenv;
use serde::Deserialize;
use std::env;

#[derive(Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
}

#[derive(Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Deserialize)]
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub database: String,
}

impl Config {
    pub fn new() -> Result<Self> {
        dotenv().ok();

        let server = ServerConfig {
            host: env::var("FORGE_SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: Self::parse_port("FORGE_SERVER_PORT", "3000")?,
        };

        let database = DatabaseConfig {
            host: env::var("FORGE_DATABASE_HOST").unwrap_or_else(|_| "localhost".to_string()),
            port: Self::parse_port("FORGE_DATABASE_PORT", "5432")?,
            username: Self::require_var("FORGE_DATABASE_USERNAME")?,
            password: Self::require_var("FORGE_DATABASE_PASSWORD")?,
            database: Self::require_var("FORGE_DATABASE_NAME")?,
        };

        Ok(Config { server, database })
    }

    fn require_var(name: &str) -> Result<String> {
        env::var(name).context(format!("Missing required environment variable: {}", name))
    }

    fn parse_port(name: &str, default: &str) -> Result<u16> {
        let port_str = env::var(name).unwrap_or_else(|_| default.to_string());
        port_str
            .parse::<u16>()
            .context(format!("{} must be a valid port number (0-65535)", name))
    }
}
