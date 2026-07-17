import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function VariableValueCell({ value }: { value: string }) {
  const handleCopy = async () => {
    try {
      await window.api.util.copyText(value);
      toast.success("Value copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy value", {
        description: error instanceof Error ? error.message : String(error),
        position: "bottom-right",
      });
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-sm">{value}</span>
      <Button variant="ghost" size="icon-xs" onClick={handleCopy} aria-label="Copy value">
        <CopyIcon />
      </Button>
    </div>
  );
}
