import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MoreHorizontalIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SelectServer } from "@electron/db/schema/server";

export function ServerRowActions({ server }: { server: SelectServer }) {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await toast
        .promise(window.api.server.refresh(server.id), {
          loading: `Refreshing kuznets on ${server.name}...`,
          success: `kuznets refreshed on ${server.name}`,
          error: (error) =>
            error instanceof Error ? error.message : String(error),
        })
        .unwrap();
    } catch {
      // surfaced via the toast above
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            navigate({ to: "/server/$id", params: { id: server.id } })
          }
        >
          View details
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={server.status !== "success" || refreshing}
          onClick={handleRefresh}
        >
          <RefreshCwIcon className={refreshing ? "animate-spin" : undefined} />
          Refresh server
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
