import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import { FolderOpenIcon } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import type { RestartPolicy } from "@electron/lib/kuznets";

const RESTART_POLICIES: RestartPolicy[] = ["unless-stopped", "always", "on-failure", "no"];

const port = z.number().int().min(1).max(65535);

const formSchema = z
  .object({
    kind: z.enum(["registry", "static"]),
    // Doubles as the docker container name, which the daemon restricts.
    name: z
      .string()
      .min(1, { error: "name is mandatory" })
      .regex(/^[A-Za-z0-9][A-Za-z0-9_.-]*$/, {
        error: "must start with a letter or digit, then letters, digits, '_', '.', or '-'",
      }),
    image: z.string(),
    assetsDir: z.string(),
    spaFallback: z.boolean(),
    containerPort: z.union([port, z.literal("")]),
    hostPort: z.union([port, z.literal("")]),
    restartPolicy: z.enum(["unless-stopped", "always", "on-failure", "no"]),
    envPrefix: z.string(),
  })
  .refine((value) => value.kind !== "registry" || value.image.trim() !== "", {
    error: "image is mandatory",
    path: ["image"],
  })
  .refine((value) => value.kind !== "static" || value.assetsDir.trim() !== "", {
    error: "pick a folder to deploy",
    path: ["assetsDir"],
  })
  // Static sites always listen on 80 inside the container, so only a registry
  // image needs the port spelled out before it can be published.
  .refine(
    (value) => !(value.kind === "registry" && value.hostPort !== "" && value.containerPort === ""),
    { error: "container port is required to publish a host port", path: ["containerPort"] },
  );

export type DeploySubmission =
  | {
      kind: "registry";
      name: string;
      image: string;
      containerPort: number | null;
      hostPort: number | null;
      envPrefix: string | null;
      restartPolicy: RestartPolicy;
    }
  | {
      kind: "static";
      name: string;
      assetsDir: string;
      spaFallback: boolean;
      hostPort: number | null;
      envPrefix: string | null;
      restartPolicy: RestartPolicy;
    };

interface AddDeploymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: DeploySubmission) => void;
}

export function AddDeploymentDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddDeploymentDialogProps) {
  const form = useForm({
    defaultValues: {
      kind: "registry" as "registry" | "static",
      name: "",
      image: "",
      assetsDir: "",
      spaFallback: true,
      containerPort: "" as number | "",
      hostPort: "" as number | "",
      restartPolicy: "unless-stopped" as RestartPolicy,
      envPrefix: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    // Building and shipping an image takes minutes, so the dialog hands the work
    // off and closes rather than holding a modal open over it.
    onSubmit: async ({ value }) => {
      const shared = {
        name: value.name,
        hostPort: value.hostPort === "" ? null : Number(value.hostPort),
        envPrefix: value.envPrefix.trim() === "" ? null : value.envPrefix.trim(),
        restartPolicy: value.restartPolicy,
      };

      onSubmit(
        value.kind === "registry"
          ? {
              kind: "registry",
              ...shared,
              image: value.image.trim(),
              containerPort: value.containerPort === "" ? null : Number(value.containerPort),
            }
          : {
              kind: "static",
              ...shared,
              assetsDir: value.assetsDir,
              spaFallback: value.spaFallback,
            },
      );

      form.reset();
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) form.reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New deployment</DialogTitle>
          <DialogDescription>
            Secrets and strings under the env prefix are injected as environment variables.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-deployment-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              name="kind"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Source</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(value as "registry" | "static")
                    }
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registry">Registry image</SelectItem>
                      <SelectItem value="static">Static assets</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <form.Field
              name="name"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="my-app"
                      autoComplete="off"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />

            <form.Subscribe
              selector={(state) => state.values.kind}
              children={(kind) =>
                kind === "registry" ? (
                  <>
                    <form.Field
                      name="image"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched && !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Image</FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.value)}
                              aria-invalid={isInvalid}
                              placeholder="nginx:alpine"
                              autoComplete="off"
                              className="font-mono"
                            />
                            <FieldDescription>Defaults to the :latest tag.</FieldDescription>
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          </Field>
                        );
                      }}
                    />
                    <form.Field
                      name="containerPort"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched && !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Container port</FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              type="number"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(
                                  e.target.value === "" ? "" : Number(e.target.value),
                                )
                              }
                              aria-invalid={isInvalid}
                              placeholder="80"
                            />
                            <FieldDescription>Port the app listens on.</FieldDescription>
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          </Field>
                        );
                      }}
                    />
                  </>
                ) : (
                  <>
                    <form.Field
                      name="assetsDir"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched && !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Folder</FieldLabel>
                            <InputGroup>
                              <InputGroupInput
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                                aria-invalid={isInvalid}
                                placeholder="/home/you/site/dist"
                                autoComplete="off"
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                  type="button"
                                  onClick={async () => {
                                    const dir = await window.api.util.openDirectory();
                                    if (dir) field.handleChange(dir);
                                  }}
                                >
                                  <FolderOpenIcon />
                                  Browse
                                </InputGroupButton>
                              </InputGroupAddon>
                            </InputGroup>
                            <FieldDescription>
                              Built into an nginx image on this machine, then shipped to the
                              server.
                            </FieldDescription>
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          </Field>
                        );
                      }}
                    />
                    <form.Field
                      name="spaFallback"
                      children={(field) => (
                        <Field orientation="horizontal">
                          <FieldLabel htmlFor={field.name}>Single-page app</FieldLabel>
                          <Switch
                            id={field.name}
                            checked={field.state.value}
                            onCheckedChange={(checked) => field.handleChange(checked)}
                          />
                          <FieldDescription>
                            Serve index.html for unknown paths so client-side routing works.
                          </FieldDescription>
                        </Field>
                      )}
                    />
                  </>
                )
              }
            />

            <form.Field
              name="hostPort"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Host port</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      aria-invalid={isInvalid}
                      placeholder="8080"
                    />
                    <FieldDescription>
                      Publish on the server's IP. Leave blank to keep it internal.
                    </FieldDescription>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />

            <form.Field
              name="restartPolicy"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Restart policy</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value as RestartPolicy)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESTART_POLICIES.map((policy) => (
                        <SelectItem key={policy} value={policy}>
                          {policy}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {/* Subscribed rather than reading form.state directly, which is not
                reactive and would leave the placeholder stale as the name is typed. */}
            <form.Subscribe
              selector={(state) => state.values.name}
              children={(name) => (
                <form.Field
                  name="envPrefix"
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Env prefix <span className="text-muted-foreground">(optional)</span>
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={name || "my-app"}
                        autoComplete="off"
                        className="font-mono"
                      />
                      <FieldDescription>
                        Secrets and strings under this path become env vars. Defaults to the
                        deployment name.
                      </FieldDescription>
                    </Field>
                  )}
                />
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-deployment-form">
            Deploy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
