import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DELETE_CONFIRMATION_TEXT = "delete";

interface DeleteServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => Promise<void>;
}

export function DeleteServerDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: DeleteServerDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setConfirmText("");
      }}
    >
      <DialogContent className="rounded-sm">
        <DialogHeader>
          <DialogTitle>Delete server{selectedCount > 1 ? "s" : ""}</DialogTitle>
          <DialogDescription>
            This will permanently delete {selectedCount} selected server
            {selectedCount > 1 ? "s" : ""}. Type "{DELETE_CONFIRMATION_TEXT}" to
            confirm.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={DELETE_CONFIRMATION_TEXT}
          autoFocus
          className="rounded-sm"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={confirmText !== DELETE_CONFIRMATION_TEXT || isDeleting}
            onClick={async () => {
              setIsDeleting(true);
              try {
                await onConfirm();
              } finally {
                setIsDeleting(false);
                setConfirmText("");
              }
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
