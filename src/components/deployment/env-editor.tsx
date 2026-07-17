import { KeyRoundIcon, PlusIcon, TrashIcon, TypeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { EnvMapping, EnvSource } from "@electron/lib/kuznets";

/** A secret or string already stored on the server, offered as a value to bind. */
export interface EnvChoice {
  key: string;
  source: EnvSource;
}

interface EnvEditorProps {
  value: EnvMapping[];
  onChange: (next: EnvMapping[]) => void;
  choices: EnvChoice[];
}

/** Encodes both fields into one select value, since a key could in principle
 * exist as both a secret and a string. */
function choiceValue(choice: EnvChoice): string {
  return `${choice.source}:${choice.key}`;
}

export function EnvEditor({ value, onChange, choices }: EnvEditorProps) {
  const update = (index: number, patch: Partial<EnvMapping>) => {
    onChange(value.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const add = () => {
    onChange([...value, { name: "", source: "secret", key: "" }]);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  if (choices.length === 0) {
    return (
      <Empty className="border border-dashed py-8">
        <EmptyMedia variant="icon">
          <KeyRoundIcon />
        </EmptyMedia>
        <EmptyTitle>Nothing to bind yet</EmptyTitle>
        <EmptyDescription>
          Add secrets or strings on the Secrets page first, then bind them here.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="grid grid-cols-[1fr_1.5fr_auto] gap-2 text-xs text-muted-foreground">
          <span>Name</span>
          <span>Value</span>
          <span className="w-8" />
        </div>
      )}

      {value.map((entry, index) => {
        const duplicate =
          entry.name !== "" && value.some((o, i) => i !== index && o.name === entry.name);

        return (
          <div key={index} className="grid grid-cols-[1fr_1.5fr_auto] items-start gap-2">
            <div>
              <Input
                value={entry.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="DATABASE_URL"
                autoComplete="off"
                className="font-mono"
                aria-invalid={duplicate}
                aria-label={`Environment variable name ${index + 1}`}
              />
              {duplicate && (
                <p className="mt-1 text-xs text-destructive">bound more than once</p>
              )}
            </div>

            <Select
              value={entry.key === "" ? null : choiceValue(entry)}
              onValueChange={(next: string | null) => {
                if (!next) return;
                const [source, ...rest] = next.split(":");
                update(index, { source: source as EnvSource, key: rest.join(":") });
              }}
            >
              <SelectTrigger aria-label={`Value for variable ${index + 1}`}>
                <SelectValue placeholder="Choose a secret or string">
                  {(selected: string | null) =>
                    selected ? selected.split(":").slice(1).join(":") : "Choose a secret or string"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {choices.map((choice) => (
                  <SelectItem key={choiceValue(choice)} value={choiceValue(choice)}>
                    <span className="flex items-center gap-2">
                      {choice.source === "secret" ? (
                        <KeyRoundIcon className="size-3 text-muted-foreground" />
                      ) : (
                        <TypeIcon className="size-3 text-muted-foreground" />
                      )}
                      <span className="font-mono">/{choice.key}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              aria-label={`Remove variable ${index + 1}`}
            >
              <TrashIcon />
            </Button>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" className="self-start" onClick={add}>
        <PlusIcon />
        Add variable
      </Button>
    </div>
  );
}
