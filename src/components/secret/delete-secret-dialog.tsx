import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SecretEntry } from "@/components/secret/columns";

interface DeleteSecretDialogProps {
  target: SecretEntry | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteSecretDialog({ target, onOpenChange, onConfirm }: DeleteSecretDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const label = target?.kind === "variable" ? "string" : "secret";

  return (
    <AlertDialog open={target !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {label}</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <span className="font-mono">/{target?.key}</span>. Any
            deployment referencing this {label} will fail until it's replaced.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={async () => {
              setIsDeleting(true);
              try {
                await onConfirm();
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
