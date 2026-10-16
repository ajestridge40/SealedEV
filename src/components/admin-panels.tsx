"use client";

import { createProduct, importCsvAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const EXAMPLES = {
  products: `game,set,name,product_type,msrp,market_price,release_date,pack_type,packs,cards_per_pack,tcgplayer_product_id
pokemon,Scarlet & Violet—Surging Sparks,Surging Sparks Booster Bundle,Booster Bundle,26.94,32.50,2024-11-08,Booster Pack,6,10,`,
  tiers: `game,set,pack_type,tier,per_pack,pool_size,unlisted_value,odds_source,odds_note,odds_url,is_chase,sync_rarities,sync_subtype
pokemon,Scarlet & Violet—Surging Sparks,Booster Pack,Special Illustration Rare,1/87,13,15,COMMUNITY,Card Codex,https://cardcodex.com/,yes,Special Illustration Rare,`,
  cards: `game,set,pack_type,tier,name,number,rarity,finish,variant,price,tcgplayer_product_id,scryfall_id,pokemontcg_id
pokemon,Scarlet & Violet—Surging Sparks,Booster Pack,Special Illustration Rare,Pikachu ex,238,Special Illustration Rare,NONFOIL,,240,,,sv8-238`,
};

export function CsvImportPanel() {
  return (
    <ActionForm action={importCsvAction} submitLabel="Import">
      <div className="space-y-1.5">
        <Label htmlFor="kind">What are you importing?</Label>
        <Select id="kind" name="kind" defaultValue="products">
          <option value="products">Products (sealed items + market price)</option>
          <option value="tiers">Pull tiers (odds per pack type)</option>
          <option value="cards">Cards (prices, external ids, tier links)</option>
        </Select>
      </div>
      <Input type="file" name="file" accept=".csv,text/csv" />
      <Textarea name="csv" rows={5} placeholder="…or paste CSV here" />
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Column formats & examples</summary>
        {Object.entries(EXAMPLES).map(([k, v]) => (
          <div key={k} className="mt-2">
            <p className="font-medium">{k}</p>
            <pre className="overflow-x-auto rounded bg-muted p-2">{v}</pre>
          </div>
        ))}
        <p className="mt-2">per_pack accepts 1/87, &quot;1 in 87&quot; or a decimal. PUBLISHED odds require odds_url. Import tiers before cards.</p>
      </details>
    </ActionForm>
  );
}

export function NewProductPanel({ games, productTypes }: { games: { slug: string; name: string }[]; productTypes: [string, string][] }) {
  return (
    <ActionForm action={createProduct} submitLabel="Add product">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Game</Label>
          <Select name="game" required>
            {games.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select name="product_type" required>
            {productTypes.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Product name</Label>
          <Input name="name" required placeholder="Journey Together Booster Box" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Set name (created if new)</Label>
          <Input name="set" required placeholder="Scarlet & Violet—Journey Together" />
        </div>
        <div className="space-y-1.5">
          <Label>MSRP ($)</Label>
          <Input name="msrp" type="number" step="0.01" inputMode="decimal" />
        </div>
        <div className="space-y-1.5">
          <Label>Market price ($)</Label>
          <Input name="market_price" type="number" step="0.01" inputMode="decimal" />
        </div>
        <div className="space-y-1.5">
          <Label>Release date</Label>
          <Input name="release_date" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label>TCGplayer product id</Label>
          <Input name="tcgplayer_product_id" type="number" inputMode="numeric" />
        </div>
        <div className="space-y-1.5">
          <Label>Pack type</Label>
          <Input name="pack_type" defaultValue="Booster Pack" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Packs</Label>
            <Input name="packs" type="number" min={1} inputMode="numeric" required />
          </div>
          <div className="space-y-1.5">
            <Label>Cards/pack</Label>
            <Input name="cards_per_pack" type="number" min={1} inputMode="numeric" />
          </div>
        </div>
      </div>
    </ActionForm>
  );
}
