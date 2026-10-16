import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { getLiquidationSettings } from "@/lib/data/products";
import { DEFAULT_LIQUIDATION } from "@/lib/ev";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser("/settings");
  const current = await getLiquidationSettings(user.id);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Account &amp; settings</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <Button variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Net EV assumptions</CardTitle>
          <CardDescription>
            Net EV estimates what you&apos;d actually pocket after opening and selling. Signed in as {user.email}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm current={current} defaults={DEFAULT_LIQUIDATION} />
        </CardContent>
      </Card>
    </div>
  );
}
