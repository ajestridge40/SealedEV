"use client";

import { saveTracking } from "@/app/actions/user";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TrackingForm({
  productId,
  initial,
}: {
  productId: string;
  initial: {
    watching: boolean;
    ownedQty: number;
    costBasis: number | null;
    alertMaxPrice: number | null;
    alertMinRoi: number | null;
    alertUseNet: boolean;
  } | null;
}) {
  return (
    <ActionForm action={saveTracking}>
      <input type="hidden" name="productId" value={productId} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="watching" defaultChecked={initial?.watching ?? false} className="size-4" /> Watching
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ownedQty">Quantity owned</Label>
          <Input id="ownedQty" name="ownedQty" type="number" min={0} inputMode="numeric" defaultValue={initial?.ownedQty ?? 0} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="costBasis">Paid per unit ($)</Label>
          <Input id="costBasis" name="costBasis" type="number" step="0.01" min={0} inputMode="decimal" defaultValue={initial?.costBasis ?? ""} />
        </div>
      </div>
      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Price alerts (watched products)</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="alertMaxPrice">Price at or below ($)</Label>
            <Input id="alertMaxPrice" name="alertMaxPrice" type="number" step="0.01" min={0} inputMode="decimal" defaultValue={initial?.alertMaxPrice ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alertMinRoi">ROI at or above (%)</Label>
            <Input id="alertMinRoi" name="alertMinRoi" type="number" step="1" inputMode="decimal" placeholder="e.g. 0" defaultValue={initial?.alertMinRoi ?? ""} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="alertUseNet" defaultChecked={initial?.alertUseNet ?? false} className="size-4" /> Use net EV for the ROI alert
        </label>
        <p className="text-xs text-muted-foreground">
          ROI ≥ 0% means &quot;alert me once the price drops to the EV&quot;. Checked on every price refresh, at most once a day.
        </p>
      </fieldset>
    </ActionForm>
  );
}
