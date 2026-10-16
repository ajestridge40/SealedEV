"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type State = { error?: string; ok?: string; details?: string[] } | undefined;

/** Small wrapper around useActionState for server-action forms with inline feedback. */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  className,
  buttonClassName,
}: {
  action: (state: State, form: FormData) => Promise<State>;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
  buttonClassName?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={cn("space-y-3", className)}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className={buttonClassName}>
          {pending ? "Working…" : submitLabel}
        </Button>
        {state?.error && <p className="text-sm text-bad">{state.error}</p>}
        {state?.ok && <p className="text-sm text-good">{state.ok}</p>}
      </div>
      {state?.details && state.details.length > 0 && (
        <ul className="max-h-48 overflow-auto rounded-md bg-muted p-2 font-mono text-xs">
          {state.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
