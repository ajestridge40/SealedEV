"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, Minus, Package, Plus } from "lucide-react";
import { adjustOwned, toggleWatch } from "@/app/actions/user";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WatchOwnButtons({
  productId,
  watching,
  ownedQty,
  signedIn,
  compact,
}: {
  productId: string;
  watching: boolean;
  ownedQty: number;
  signedIn: boolean;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useOptimistic({ watching, ownedQty });

  if (!signedIn) {
    return (
      <Link href={`/login?next=/`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Eye /> Sign in to watch
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={state.watching ? "secondary" : "outline"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setState({ ...state, watching: !state.watching });
            await toggleWatch(productId);
          })
        }
      >
        {state.watching ? <EyeOff /> : <Eye />}
        {state.watching ? "Watching" : "Watch"}
      </Button>
      {state.ownedQty === 0 ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setState({ ...state, ownedQty: 1 });
              await adjustOwned(productId, 1);
            })
          }
        >
          <Package /> {compact ? "Own" : "Mark owned"}
        </Button>
      ) : (
        <div className="flex items-center rounded-md border">
          <Button
            size="sm"
            variant="ghost"
            aria-label="Remove one"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setState({ ...state, ownedQty: state.ownedQty - 1 });
                await adjustOwned(productId, -1);
              })
            }
          >
            <Minus />
          </Button>
          <span className={cn("min-w-14 text-center text-xs font-medium")}>Own {state.ownedQty}</span>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Add one"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setState({ ...state, ownedQty: state.ownedQty + 1 });
                await adjustOwned(productId, 1);
              })
            }
          >
            <Plus />
          </Button>
        </div>
      )}
    </div>
  );
}
