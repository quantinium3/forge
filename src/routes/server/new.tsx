import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { FolderOpenIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { SelectServer } from "@electron/db/schema/server";
import type { SelectLog } from "@electron/db/schema/log";

const provisioningStatusText: Record<SelectServer["status"], string> = {
  initializing: "Provisioning server...",
  success: "Provisioning complete",
  failed: "Provisioning failed",
};

const logLevelColor: Record<SelectLog["level"], string> = {
  info: "text-foreground",
  debug: "text-muted-foreground",
  warn: "text-yellow-500",
  error: "text-red-500",
  fatal: "text-red-500",
};

function ProvisioningPanel({ serverId, status }: { serverId: string; status: SelectServer["status"] }) {
  const [logs, setLogs] = useState<SelectLog[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    window.api.log.list(serverId).then((rows) => {
      if (!cancelled) setLogs(rows.slice().reverse());
    });

    const offLog = window.ipcEvents.on("server:log", (_event, ...args) => {
      const log = args[0] as SelectLog;
      if (log.serverId !== serverId) return;
      setLogs((prev) => (prev.some((l) => l.id === log.id) ? prev : [...prev, log]));
    });

    return () => {
      cancelled = true;
      offLog();
    };
  }, [serverId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [logs]);

  return (
    <Card className="mt-6 max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status === "initializing" && <Loader2Icon className="size-4 animate-spin" />}
          <span
            className={cn(
              status === "success" && "text-green-500",
              status === "failed" && "text-red-500",
            )}
          >
            {provisioningStatusText[status]}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 rounded-md border bg-muted/30 p-2">
          <div className="space-y-1 font-mono text-xs">
            {logs.map((log) => (
              <p key={log.id} className={logLevelColor[log.level]}>
                {log.message}
              </p>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute("/server/new")({
  component: NewServerPage,
});

const formSchema = z.object({
  name: z.string().min(1, { error: "name is mandatory" }),
  address: z.ipv4().or(z.ipv6()),
  username: z.string().min(1, { error: "username is mandatory" }),
  sshPort: z.int().min(1).max(65535),
  privateKeyPath: z.string().min(1, { error: "private key path is mandatory" }),
  passphrase: z.string(),
});

function NewServerPage() {
  const navigate = useNavigate();
  const [provisioning, setProvisioning] = useState<{
    serverId: string;
    status: SelectServer["status"];
  } | null>(null);

  const provisioningServerId = provisioning?.serverId;

  useEffect(() => {
    if (!provisioningServerId) return;
    return window.ipcEvents.on("server:status-changed", (_event, ...args) => {
      const payload = args[0] as { serverId: string; status: SelectServer["status"] };
      if (payload.serverId !== provisioningServerId) return;
      setProvisioning((prev) => (prev ? { ...prev, status: payload.status } : prev));
    });
  }, [provisioningServerId]);

  const form = useForm({
    defaultValues: {
      name: "",
      address: "",
      username: "",
      sshPort: 22,
      privateKeyPath: "",
      passphrase: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const server = await window.api.server.create(value);
        setProvisioning({ serverId: server.id, status: server.status });
      } catch (error) {
        toast.error("Failed to add server", {
          description: error instanceof Error ? error.message : String(error),
          position: "bottom-right",
        });
      }
    },
  });

  return (
    <div className="p-2">
      <h3 className="text-lg font-semibold">Add server</h3>
      <p className="text-sm text-muted-foreground">
        Connect a new server so you can start managing it.
      </p>

      <form
        id="new-server-form"
        className="mt-4 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <fieldset disabled={!!provisioning} className="contents">
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
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="prod-web-1"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
          <form.Field
            name="address"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Address</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="10.0.0.12"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
          <form.Field
            name="username"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="deploy"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
          <form.Field
            name="sshPort"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Port</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    aria-invalid={isInvalid}
                    placeholder="22"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
          <form.Field
            name="privateKeyPath"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Private key path</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="/home/deploy/.ssh/id_ed25519"
                      autoComplete="off"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        onClick={async () => {
                          const path = await window.api.util.openFile();
                          if (path) field.handleChange(path);
                        }}
                      >
                        <FolderOpenIcon />
                        Browse
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
          <form.Field
            name="passphrase"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Passphrase{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
        </FieldGroup>
        </fieldset>
      </form>

      {!provisioning && (
        <div className="mt-6 max-w-md">
          <Field orientation="horizontal">
            <Button variant="outline" render={<Link to="/server" />}>
              Cancel
            </Button>
            <Button type="submit" form="new-server-form">
              Create server
            </Button>
          </Field>
        </div>
      )}

      {provisioning && (
        <>
          <ProvisioningPanel serverId={provisioning.serverId} status={provisioning.status} />
          <div className="mt-4 max-w-md">
            <Button variant="outline" onClick={() => navigate({ to: "/server" })}>
              Go to servers
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
