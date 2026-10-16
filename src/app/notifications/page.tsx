import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ago } from "@/lib/format";
import { markAllRead } from "@/app/actions/user";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alerts" };

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { product: { select: { slug: true } } },
  });
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">Fired when a watched product hits your price or ROI target during a price refresh.</p>
        </div>
        {unread > 0 && (
          <form action={markAllRead}>
            <Button variant="outline" size="sm">
              Mark all read
            </Button>
          </form>
        )}
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No alerts yet. Set a target price or ROI on a product page under &quot;Watchlist, collection &amp; alerts&quot;.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={cn("p-4", !n.readAt && "border-good/50")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {n.product ? (
                      <Link href={`/products/${n.product.slug}`} className="hover:underline">
                        {n.title}
                      </Link>
                    ) : (
                      n.title
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{ago(n.createdAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
