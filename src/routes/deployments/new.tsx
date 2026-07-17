import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FolderOpenIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { EnvEditor, type EnvChoice } from "@/components/deployment/env-editor";
import { pollOperation } from "@/lib/operations";
import type { EnvMapping, Operation, RestartPolicy } from "@electron/lib/kuznets";

const RESTART_POLICIES: RestartPolicy[] = ["unless-stopped", "always", "on-failure", "no"];

const port = z.number().int().min(1).max(65535);

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

const formSchema = z
  .object({
    kind: z.enum(["registry", "static"]),
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
    env: z.array(
      z.object({
        name: z.string().regex(ENV_NAME, {
          error: "must start with a letter or '_', then letters, digits, or '_'",
        }),
        source: z.enum(["secret", "variable"]),
        key: z.string().min(1, { error: "choose a value" }),
      }),
    ),
  })
  .refine((value) => value.kind !== "registry" || value.image.trim() !== "", {
    error: "image is mandatory",
    path: ["image"],
  })
  .refine((value) => value.kind !== "static" || value.assetsDir.trim() !== "", {
    error: "pick a folder to deploy",
    path: ["assetsDir"],
  })
  // Static sites always listen on 80, so only a registry image needs its port
  // spelled out before it can be published.
  .refine(
    (value) => !(value.kind === "registry" && value.hostPort !== "" && value.containerPort === ""),
    { error: "container port is required to publish a host port", path: ["containerPort"] },
  )
  .refine((value) => new Set(value.env.map((e) => e.name)).size === value.env.length, {
    error: "each environment variable can only be bound once",
    path: ["env"],
  });

const searchSchema = z.object({
  serverId: z.string(),
});

export const Route = createFileRoute("/deployments/new")({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { serverId } }) => ({ serverId }),
  // Both stores share one namespace, so they are offered as one list of values.
  loader: async ({ deps: { serverId } }) => {
    const [secrets, variables] = await Promise.all([
      window.api.secret.list(serverId),
      window.api.variable.list(serverId),
    ]);

    const choices: EnvChoice[] = [
      ...secrets.map((secret) => ({ key: secret.key, source: "secret" as const })),
      ...variables.map((variable) => ({ key: variable.key, source: "variable" as const })),
    ].sort((a, b) => a.key.localeCompare(b.key));

    return { choices };
  },
  component: NewDeploymentPage,
});

function NewDeploymentPage() {
  const { serverId } = Route.useSearch();
  const { choices } = Route.useLoaderData();
  const navigate = useNavigate();

  /**
   * Static builds run locally and take minutes, so one toast follows the whole
   * thing -- fed by the main process's build output, then handing over to the
   * operation poll. A terminal `failed` resolves rather than throws, so it is
   * rethrown to surface the reason.
   */
  const deploy = async (value: FormValues): Promise<void> => {
    const env: EnvMapping[] = value.env;
    const toastId = toast.loading(`Deploying ${value.name}...`);

    const off = window.ipcEvents.on("deployment:progress", (_event, ...args) => {
      const update = args[0] as { name: string; message: string };
      if (update.name === value.name) toast.loading(update.message, { id: toastId });
    });

    try {
      let operation: Operation;

      if (value.kind === "static") {
        operation = await window.api.deployment.deployStatic(serverId, {
          name: value.name,
          assetsDir: value.assetsDir,
          spaFallback: value.spaFallback,
          hostPort: value.hostPort === "" ? null : Number(value.hostPort),
          env,
          restartPolicy: value.restartPolicy,
        });
      } else {
        operation = await window.api.deployment.create(serverId, {
          name: value.name,
          image: value.image.trim(),
          source: "registry",
          container_port: value.containerPort === "" ? null : Number(value.containerPort),
          host_port: value.hostPort === "" ? null : Number(value.hostPort),
          env,
          restart_policy: value.restartPolicy,
        });
      }

      const finished = await pollOperation(serverId, operation.id);
      if (finished.status !== "succeeded") {
        throw new Error(finished.error ?? `deployment ${finished.status}`);
      }

      toast.success(`${value.name} is running`, { id: toastId });
      navigate({ to: "/deployments" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error), { id: toastId });
    } finally {
      off();
    }
  };

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
      env: [] as EnvMapping[],
    },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => deploy(value),
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-10">
      <div>
        <h3 className="text-lg font-semibold">New deployment</h3>
        <p className="text-sm text-muted-foreground">
          Runs a container on the selected server.
        </p>
      </div>

      <form
        id="new-deployment-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <fieldset disabled={isSubmitting} className="contents">
              <div className="flex flex-col gap-6">
                <form.Field
                  name="kind"
                  children={(field) => (
                    <Tabs
                      value={field.state.value}
                      onValueChange={(value) =>
                        field.handleChange(value as "registry" | "static")
                      }
                    >
                      <TabsList>
                        <TabsTrigger value="registry">Registry image</TabsTrigger>
                        <TabsTrigger value="static">Static assets</TabsTrigger>
                      </TabsList>

                      <TabsContent value="registry">
                        <Card>
                          <CardContent className="pt-6">
                            <FieldGroup>
                              <form.Field
                                name="image"
                                children={(imageField) => {
                                  const isInvalid =
                                    imageField.state.meta.isTouched &&
                                    !imageField.state.meta.isValid;
                                  return (
                                    <Field data-invalid={isInvalid}>
                                      <FieldLabel htmlFor={imageField.name}>Image</FieldLabel>
                                      <Input
                                        id={imageField.name}
                                        value={imageField.state.value}
                                        onBlur={imageField.handleBlur}
                                        onChange={(e) => imageField.handleChange(e.target.value)}
                                        aria-invalid={isInvalid}
                                        placeholder="nginx:alpine"
                                        autoComplete="off"
                                        className="font-mono"
                                      />
                                      <FieldDescription>
                                        Pulled from a public registry. Defaults to :latest.
                                      </FieldDescription>
                                      {isInvalid && (
                                        <FieldError errors={imageField.state.meta.errors} />
                                      )}
                                    </Field>
                                  );
                                }}
                              />
                              <form.Field
                                name="containerPort"
                                children={(portField) => {
                                  const isInvalid =
                                    portField.state.meta.isTouched &&
                                    !portField.state.meta.isValid;
                                  return (
                                    <Field data-invalid={isInvalid}>
                                      <FieldLabel htmlFor={portField.name}>
                                        Container port
                                      </FieldLabel>
                                      <Input
                                        id={portField.name}
                                        type="number"
                                        value={portField.state.value}
                                        onBlur={portField.handleBlur}
                                        onChange={(e) =>
                                          portField.handleChange(
                                            e.target.value === "" ? "" : Number(e.target.value),
                                          )
                                        }
                                        aria-invalid={isInvalid}
                                        placeholder="80"
                                      />
                                      <FieldDescription>
                                        Port the app listens on inside the container.
                                      </FieldDescription>
                                      {isInvalid && (
                                        <FieldError errors={portField.state.meta.errors} />
                                      )}
                                    </Field>
                                  );
                                }}
                              />
                            </FieldGroup>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="static">
                        <Card>
                          <CardContent className="pt-6">
                            <FieldGroup>
                              <form.Field
                                name="assetsDir"
                                children={(dirField) => {
                                  const isInvalid =
                                    dirField.state.meta.isTouched && !dirField.state.meta.isValid;
                                  return (
                                    <Field data-invalid={isInvalid}>
                                      <FieldLabel htmlFor={dirField.name}>Folder</FieldLabel>
                                      <InputGroup>
                                        <InputGroupInput
                                          id={dirField.name}
                                          value={dirField.state.value}
                                          onBlur={dirField.handleBlur}
                                          onChange={(e) => dirField.handleChange(e.target.value)}
                                          aria-invalid={isInvalid}
                                          placeholder="/home/you/site/dist"
                                          autoComplete="off"
                                        />
                                        <InputGroupAddon align="inline-end">
                                          <InputGroupButton
                                            type="button"
                                            onClick={async () => {
                                              const dir = await window.api.util.openDirectory();
                                              if (dir) dirField.handleChange(dir);
                                            }}
                                          >
                                            <FolderOpenIcon />
                                            Browse
                                          </InputGroupButton>
                                        </InputGroupAddon>
                                      </InputGroup>
                                      <FieldDescription>
                                        Built into an nginx image on this machine, then shipped to
                                        the server.
                                      </FieldDescription>
                                      {isInvalid && (
                                        <FieldError errors={dirField.state.meta.errors} />
                                      )}
                                    </Field>
                                  );
                                }}
                              />
                              <form.Field
                                name="spaFallback"
                                children={(spaField) => (
                                  <Field orientation="horizontal">
                                    <FieldLabel htmlFor={spaField.name}>
                                      Single-page app
                                    </FieldLabel>
                                    <Switch
                                      id={spaField.name}
                                      checked={spaField.state.value}
                                      onCheckedChange={(checked) => spaField.handleChange(checked)}
                                    />
                                    <FieldDescription>
                                      Serve index.html for unknown paths so client-side routing
                                      works.
                                    </FieldDescription>
                                  </Field>
                                )}
                              />
                            </FieldGroup>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  )}
                />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Deployment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <form.Field
                        name="name"
                        children={(field) => {
                          const isInvalid =
                            field.state.meta.isTouched && !field.state.meta.isValid;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                              <Input
                                id={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                                aria-invalid={isInvalid}
                                placeholder="my-app"
                                autoComplete="off"
                              />
                              <FieldDescription>
                                Also the container name. Reusing one replaces that deployment.
                              </FieldDescription>
                              {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                          );
                        }}
                      />
                      <form.Field
                        name="hostPort"
                        children={(field) => {
                          const isInvalid =
                            field.state.meta.isTouched && !field.state.meta.isValid;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>Host port</FieldLabel>
                              <Input
                                id={field.name}
                                type="number"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(
                                    e.target.value === "" ? "" : Number(e.target.value),
                                  )
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
                    </FieldGroup>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Environment</CardTitle>
                    <FieldDescription>
                      Name a variable, then bind it to a stored secret or string. Values are read
                      on the server at deploy time, so rotating a secret takes effect on the next
                      deploy.
                    </FieldDescription>
                  </CardHeader>
                  <CardContent>
                    <form.Field
                      name="env"
                      children={(field) => (
                        <>
                          <EnvEditor
                            value={field.state.value}
                            onChange={(next) => field.handleChange(next)}
                            choices={choices}
                          />
                          {field.state.meta.isTouched && !field.state.meta.isValid && (
                            <div className="mt-2">
                              <FieldError errors={field.state.meta.errors} />
                            </div>
                          )}
                        </>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </fieldset>
          )}
        />
      </form>

      <form.Subscribe
        selector={(state) => state.isSubmitting}
        children={(isSubmitting) => (
          <Field orientation="horizontal">
            <Button variant="outline" disabled={isSubmitting} render={<Link to="/deployments" />}>
              Cancel
            </Button>
            <Button type="submit" form="new-deployment-form" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              {isSubmitting ? "Deploying..." : "Deploy"}
            </Button>
          </Field>
        )}
      />
    </div>
  );
}

type FormValues = {
  kind: "registry" | "static";
  name: string;
  image: string;
  assetsDir: string;
  spaFallback: boolean;
  containerPort: number | "";
  hostPort: number | "";
  restartPolicy: RestartPolicy;
  env: EnvMapping[];
};
