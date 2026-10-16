import Link from "next/link";
import { Bell } from "lucide-react";
import { signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { DesktopNav, MobileNav } from "@/components/nav-links";

export async function SiteHeader() {
  const user = await currentUser();
  const unread = user ? await prisma.notification.count({ where: { userId: user.id, readAt: null } }) : 0;

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <Link href="/" className="mr-2 flex items-center gap-1.5 font-bold tracking-tight">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="size-7 rounded-md" />
            SealedEV
          </Link>
          <DesktopNav isAdmin={!!user?.isAdmin} />
          <div className="ml-auto flex items-center gap-1">
            {user && (
              <span className="hidden md:block">
                <Link href="/notifications" className={buttonVariants({ variant: "ghost", size: "icon", className: "relative" })} aria-label="Alerts">
                  <Bell />
                  {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-bad" />}
                </Link>
              </span>
            )}
            <ThemeToggle />
            {user ? (
              <>
                {user.isAdmin && (
                  <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "sm", className: "md:hidden" })}>
                    Admin
                  </Link>
                )}
                <Link href="/settings" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Account
                </Link>
                <form
                  className="hidden md:block"
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <Button variant="outline" size="sm" type="submit">
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <Link href="/login" className={buttonVariants({ size: "sm" })}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <MobileNav unread={unread} />
    </>
  );
}
