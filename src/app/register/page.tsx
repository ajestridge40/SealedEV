import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthForm kind="register" next={(await searchParams).next ?? "/"} />;
}
