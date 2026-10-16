import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthForm kind="login" next={(await searchParams).next ?? "/"} />;
}
