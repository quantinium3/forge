/**
 * Loopback only. The kuznets API has no authentication of its own -- it trusts
 * whoever can reach it, and reaching it is meant to require SSH. Forge always
 * arrives through an SSH tunnel that terminates at the server's own loopback
 * (see tunnel-manager), so binding wider would expose the whole API -- including
 * plaintext secret reads and arbitrary container creation as root -- to anyone
 * who can route to the port.
 */
export const KUZNETS_APP_HOST = "127.0.0.1";
export const KUZNETS_APP_PORT = "6967";
export const KUZNETS_DATA_DIR = "/var/lib/kuznets";
export const KUZNETS_DB_PATH = `${KUZNETS_DATA_DIR}/kuznets.db`;
export const KUZNETS_MASTER_KEY_PATH = `${KUZNETS_DATA_DIR}/master.key`;

export function buildKuznetsUnitFile(): string {
  return [
    "[Unit]",
    "Description=Kuznets server",
    "After=network.target",
    "",
    "[Service]",
    `Environment=APP_HOST=${KUZNETS_APP_HOST}`,
    `Environment=APP_PORT=${KUZNETS_APP_PORT}`,
    `Environment=DATABASE_URL=sqlite://${KUZNETS_DB_PATH}`,
    `Environment=MASTER_KEY_PATH=${KUZNETS_MASTER_KEY_PATH}`,
    "ExecStart=/usr/local/bin/kuznets",
    "Restart=on-failure",
    "RestartSec=2",
    "User=root",
    "",
    "[Install]",
    "WantedBy=multi-user.target",
    "",
  ].join("\n");
}
