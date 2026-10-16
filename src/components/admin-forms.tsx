"use client";

import { updateCardPrice, updateProductPrice, updateTier } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function ProductPriceForm({ productId, price }: { productId: string; price: number | null }) {
  return (
    <ActionForm action={updateProductPrice} submitLabel="Update price" className="flex flex-wrap items-end gap-3 space-y-0">
      <input type="hidden" name="productId" value={productId} />
      <div className="space-y-1.5">
        <Label htmlFor="price">Market price ($)</Label>
        <Input id="price" name="price" type="number" step="0.01" min={0} inputMode="decimal" defaultValue={price ?? ""} className="w-36" />
      </div>
    </ActionForm>
  );
}

export function CardPriceForm({ cardId, price }: { cardId: string; price: number | null }) {
  return (
    <ActionForm action={updateCardPrice} submitLabel="Set" className="flex items-center gap-2 space-y-0" buttonClassName="h-8 px-3 text-xs">
      <input type="hidden" name="cardId" value={cardId} />
      <Input name="price" type="number" step="0.01" min={0} inputMode="decimal" defaultValue={price ?? ""} className="h-8 w-24" aria-label="Card price" />
    </ActionForm>
  );
}

export function TierForm({
  tier,
}: {
  tier: { id: string; perPack: number; poolSize: number; unlistedCardValue: number; oddsSource: string; oddsSourceNote: string | null; oddsSourceUrl: string | null };
}) {
  return (
    <ActionForm action={updateTier} submitLabel="Save tier">
      <input type="hidden" name="tierId" value={tier.id} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Per pack</Label>
          <Input name="perPack" defaultValue={tier.perPack < 1 ? `1/${+(1 / tier.perPack).toFixed(2)}` : String(tier.perPack)} />
        </div>
        <div className="space-y-1.5">
          <Label>Pool size</Label>
          <Input name="poolSize" type="number" min={1} defaultValue={tier.poolSize} />
        </div>
        <div className="space-y-1.5">
          <Label>Unlisted card $</Label>
          <Input name="unlistedCardValue" type="number" step="0.01" min={0} defaultValue={tier.unlistedCardValue} />
        </div>
        <div className="space-y-1.5">
          <Label>Odds source</Label>
          <Select name="oddsSource" defaultValue={tier.oddsSource}>
            <option value="PUBLISHED">Published</option>
            <option value="COMMUNITY">Community</option>
            <option value="ESTIMATE">Estimate</option>
          </Select>
        </div>
      </div>
      <Input name="oddsSourceNote" placeholder="Source note" defaultValue={tier.oddsSourceNote ?? ""} />
      <Input name="oddsSourceUrl" placeholder="Source URL (required for Published)" defaultValue={tier.oddsSourceUrl ?? ""} />
    </ActionForm>
  );
}
