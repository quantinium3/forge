import { DataTable } from "@/components/server/data-table";
import { createFileRoute } from "@tanstack/react-router";
import { serverColumns } from "@/components/server/columns";
import type { SelectServer } from "@electron/db/schema/server";

const data: SelectServer[] = [
  {
    id: "server_1",
    name: "prod-web-1",
    address: "10.0.0.12",
    username: "deploy",
    sshPort: 22,
    privateKeyPath: "/home/deploy/.ssh/id_ed25519",
    passphrase: null,
    status: "success",
    createdAt: new Date("2026-06-01T10:00:00Z"),
    updatedAt: new Date("2026-06-01T10:00:00Z"),
  },
  {
    id: "server_2",
    name: "staging-api",
    address: "10.0.0.20",
    username: "deploy",
    sshPort: 22,
    privateKeyPath: "/home/deploy/.ssh/id_ed25519",
    passphrase: null,
    status: "initializing",
    createdAt: new Date("2026-07-01T09:30:00Z"),
    updatedAt: new Date("2026-07-01T09:30:00Z"),
  },
  {
    id: "server_3",
    name: "db-replica-2",
    address: "10.0.0.31",
    username: "postgres",
    sshPort: 2222,
    privateKeyPath: "/home/deploy/.ssh/id_ed25519",
    passphrase: null,
    status: "failed",
    createdAt: new Date("2026-05-15T14:20:00Z"),
    updatedAt: new Date("2026-07-10T08:05:00Z"),
  },
];

export const Route = createFileRoute("/server/")({
  component: ServerPage,
});

function ServerPage() {
  return (
    <div className="p-2">
      <h3 className="text-lg font-semibold">Server</h3>
      <DataTable columns={serverColumns} data={data} />
    </div>
  );
}
