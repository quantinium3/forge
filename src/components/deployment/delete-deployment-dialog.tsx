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
import type { Deployment } from "@electron/lib/kuznets";

interface DeleteDeploymentDialogProps {
  target: Deployment | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteDeploymentDialog({
  target,
  onOpenChange,
  onConfirm,
}: DeleteDeploymentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <AlertDialog open={target !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete deployment</AlertDialogTitle>
          <AlertDialogDescription>
            This stops and removes the <span className="font-mono">{target?.name}</span>{" "}
            container and everything written inside it. Its secrets and strings are kept.
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
