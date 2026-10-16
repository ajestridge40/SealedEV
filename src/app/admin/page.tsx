import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { GAMES } from "@/lib/games";
import { PRODUCT_TYPE_LABEL } from "@/lib/product-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshButton } from "@/components/refresh-button";
import { CsvImportPanel, NewProductPanel } from "@/components/admin-panels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await requireUser("/admin");
  if (!user.isAdmin) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Admin only. Add <code>{user.email}</code> to <code>ADMIN_EMAILS</code> and sign in again.
      </p>
    );
  }

  const [products, noPrice, noTcgId, tiers, cards, cardsNoId, lastEv, setsNoGroup, syncedTiers] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { marketPrice: null } }),
    prisma.product.count({ where: { tcgplayerProductId: null } }),
    prisma.pullTier.groupBy({ by: ["oddsSource"], _count: true }),
    prisma.card.count(),
    prisma.card.count({ where: { tcgplayerProductId: null, scryfallId: null, pokemontcgId: null } }),
    prisma.evSnapshot.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.set.count({ where: { tcgplayerGroupId: null } }),
    prisma.pullTier.count({ where: { lastSyncedAt: { not: null } } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Admin</h1>

      <Card>
        <CardHeader>
          <CardTitle>Data health</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <p>{products} products</p>
          <p>{noPrice} without a price</p>
          <p>{noTcgId} without a TCGplayer id (sealed prices can&apos;t auto-refresh)</p>
          <p>{setsNoGroup} sets not linked to TCGplayer</p>
          <p>{syncedTiers} tiers syncing their card pool from TCGplayer</p>
          <p>{cards} cards tracked</p>
          <p>{cardsNoId} cards without an external id</p>
          <p>Tiers: {tiers.map((t) => `${t._count} ${t.oddsSource.toLowerCase()}`).join(" · ")}</p>
          <p className="col-span-full text-muted-foreground">Last EV snapshot: {lastEv?.createdAt.toISOString() ?? "never"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price refresh</CardTitle>
          <CardDescription>
            Runs the same job as the daily cron. It first links sets, products and cards to TCGplayer ids automatically (by name), syncs tier
            card pools, then prices everything from TCGCSV, the free daily TCGplayer mirror. Scryfall and pokemontcg.io fill any gaps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RefreshButton />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add a product</CardTitle>
            <CardDescription>Then add pull tiers for its pack type via CSV, or edit tiers on the product page.</CardDescription>
          </CardHeader>
          <CardContent>
            <NewProductPanel games={GAMES.map((g) => ({ slug: g.slug, name: g.name }))} productTypes={Object.entries(PRODUCT_TYPE_LABEL)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bulk import (CSV)</CardTitle>
            <CardDescription>Products, pull tiers and cards. Existing rows are updated.</CardDescription>
          </CardHeader>
          <CardContent>
            <CsvImportPanel />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
