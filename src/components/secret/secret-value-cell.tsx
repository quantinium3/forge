import { useState } from "react";
import { CopyIcon, EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface SecretValueCellProps {
  serverId: string;
  secretKey: string;
}

export function SecretValueCell({ serverId, secretKey }: SecretValueCellProps) {
  const [value, setValue] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);

  const ensureValue = async () => {
    if (value !== null) return value;
    const result = await window.api.secret.reveal(serverId, secretKey);
    setValue(result.value);
    return result.value;
  };

  const handleToggleReveal = async () => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    setLoading(true);
    try {
      await ensureValue();
      setRevealed(true);
    } catch (error) {
      toast.error("Failed to reveal secret", {
        description: error instanceof Error ? error.message : String(error),
        position: "bottom-right",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    setLoading(true);
    try {
      const resolved = await ensureValue();
      await window.api.util.copyText(resolved);
      toast.success("Secret value copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy secret", {
        description: error instanceof Error ? error.message : String(error),
        position: "bottom-right",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-sm text-muted-foreground">
        {revealed && value !== null ? value : "••••••••"}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={loading}
        onClick={handleToggleReveal}
        aria-label={revealed ? "Hide value" : "Reveal value"}
      >
        {loading ? (
          <Loader2Icon className="animate-spin" />
        ) : revealed ? (
          <EyeOffIcon />
        ) : (
          <EyeIcon />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={loading}
        onClick={handleCopy}
        aria-label="Copy value"
      >
        <CopyIcon />
      </Button>
    </div>
  );
}
