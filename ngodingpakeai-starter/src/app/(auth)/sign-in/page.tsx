import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { siteConfig } from "@/config/site";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Masuk" };

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect(siteConfig.homePath);
  return (
    <Suspense>
      <AuthForm mode="sign-in" />
    </Suspense>
  );
}
