import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface ServerToolbarProps {
  selectedCount: number;
  onDeleteClick: () => void;
}

export function ServerToolbar({
  selectedCount,
  onDeleteClick,
}: ServerToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">Server</h3>
      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <Button variant="destructive" onClick={onDeleteClick}>
            Delete server{selectedCount > 1 ? "s" : ""}
          </Button>
        )}
        <Button render={<Link to="/server/new" />}>Add server</Button>
      </div>
    </div>
  );
}
