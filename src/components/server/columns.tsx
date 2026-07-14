import { ColumnDef } from "@tanstack/react-table";
import { type SelectServer } from "@electron/db/schema/server";

export const serverColumns: ColumnDef<SelectServer> = [
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    
  }
];
