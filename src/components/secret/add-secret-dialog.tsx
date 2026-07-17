import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

const SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;

const formSchema = z.object({
  kind: z.enum(["secret", "variable"]),
  path: z
    .string()
    .min(1, { error: "path is mandatory" })
    .refine((value) => !value.startsWith("/") && !value.endsWith("/"), {
      error: "path must not start or end with '/'",
    })
    .refine((value) => value.split("/").every((segment) => SEGMENT_PATTERN.test(segment)), {
      error: "each path segment may only contain letters, numbers, '_', '-', or '.'",
    }),
  value: z.string().min(1, { error: "value is mandatory" }),
});

interface AddSecretDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  onCreated: () => void;
}

export function AddSecretDialog({ open, onOpenChange, serverId, onCreated }: AddSecretDialogProps) {
  const form = useForm({
    defaultValues: {
      kind: "secret" as "secret" | "variable",
      path: "",
      value: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        if (value.kind === "secret") {
          await window.api.secret.create(serverId, value.path, value.value);
        } else {
          await window.api.variable.create(serverId, value.path, value.value);
        }
        form.reset();
        onOpenChange(false);
        onCreated();
      } catch (error) {
        toast.error(`Failed to add ${value.kind}`, {
          description: error instanceof Error ? error.message : String(error),
          position: "bottom-right",
        });
      }
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && form.state.isSubmitting) return;
        onOpenChange(next);
        if (!next) form.reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add entry</DialogTitle>
          <DialogDescription>
            Entries are referenced by their path when deploying software. Secrets are encrypted
            at rest; plain strings are stored as-is.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-secret-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Subscribe
            selector={(state) => state.isSubmitting}
            children={(isSubmitting) => (
              <fieldset disabled={isSubmitting} className="contents">
                <FieldGroup>
                  <form.Field
                    name="kind"
                    children={(field) => (
                      <Field orientation="horizontal">
                        <FieldLabel htmlFor={field.name}>
                          {field.state.value === "secret" ? "Secret" : "Plain string"}
                        </FieldLabel>
                        <Switch
                          id={field.name}
                          checked={field.state.value === "variable"}
                          onCheckedChange={(checked) =>
                            field.handleChange(checked ? "variable" : "secret")
                          }
                        />
                      </Field>
                    )}
                  />
                  <form.Field
                    name="path"
                    children={(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Path</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="project/name"
                            autoComplete="off"
                          />
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      );
                    }}
                  />
                  <form.Field
                    name="value"
                    children={(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Value</FieldLabel>
                          <Textarea
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            autoComplete="off"
                            className="font-mono"
                          />
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      );
                    }}
                  />
                </FieldGroup>
              </fieldset>
            )}
          />
        </form>

        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <DialogFooter>
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" form="add-secret-form" disabled={isSubmitting}>
                {isSubmitting && <Loader2Icon className="animate-spin" />}
                {isSubmitting ? "Adding..." : "Add entry"}
              </Button>
            </DialogFooter>
          )}
        />
      </DialogContent>
    </Dialog>
  );
}
