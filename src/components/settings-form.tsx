"use client";

import { saveSettings } from "@/app/actions/user";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LiquidationSettings } from "@/lib/ev";

export function SettingsForm({ current, defaults }: { current: LiquidationSettings; defaults: LiquidationSettings }) {
  const field = (name: keyof LiquidationSettings, label: string, help: string, scale = 1, step = "0.01") => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" step={step} min={0} inputMode="decimal" defaultValue={+(current[name] * scale).toFixed(4)} />
      <p className="text-xs text-muted-foreground">
        {help} Default {+(defaults[name] * scale).toFixed(4)}.
      </p>
    </div>
  );
  return (
    <ActionForm action={saveSettings}>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("feePct", "Selling fees (%)", "Marketplace + payment processing.", 100, "0.1")}
        {field("perCardCost", "Cost per single sold ($)", "Shipping, toploader, envelope, your time.")}
        {field("sellThreshold", "Sell-individually threshold ($)", "Cards below this go to bulk.")}
        {field("bulkValue", "Bulk value per card ($)", "What a bulk buyer pays per card.", 1, "0.001")}
      </div>
    </ActionForm>
  );
}
