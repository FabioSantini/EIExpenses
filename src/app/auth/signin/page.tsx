"use client";

import { signIn, getSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserIcon, ArrowRightIcon } from "lucide-react";
import { settingsService } from "@/services/settings-service";

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showAccountSelection, setShowAccountSelection] = useState(false);

  useEffect(() => {
    // Check if user is already logged in and handle automatic login behavior
    getSession().then(async (session) => {
      if (session) {
        const settings = settingsService.getSettings();
        const automaticLogin = settings.authentication?.automaticLogin ?? true;

        console.log("🔍 Session exists, automatic login setting:", automaticLogin);

        if (automaticLogin) {
          console.log("✅ Automatic login enabled - user already authenticated and authorized, redirecting to reports");
          router.push("/reports");
        } else {
          console.log("❌ Automatic login disabled - staying on signin page for explicit login");
          // User will need to authenticate explicitly on this page
        }
      }
    });
  }, [router]);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const settings = settingsService.getSettings();
      const automaticLogin = settings.authentication?.automaticLogin ?? true;

      console.log("🔐 Sign in with automatic login setting:", automaticLogin);

      if (automaticLogin) {
        console.log("🔄 Automatic login enabled - attempting silent authentication first");

        // Try silent authentication first
        const silentResult = await signIn("azure-ad", {
          callbackUrl: "/reports",
          redirect: false,
          prompt: "none",
          domain_hint: "organizations",
        });

        console.log("🔕 Silent auth result:", silentResult);

        if (silentResult?.ok && silentResult?.url) {
          console.log("✅ Silent authentication successful");
          window.location.href = silentResult.url;
          return;
        }

        // If silent auth fails, fall back to normal auth
        console.log("🔄 Silent auth failed, falling back to normal login");
        await signIn("azure-ad", {
          callbackUrl: "/reports",
          prompt: "login",
          domain_hint: "organizations",
        });
      } else {
        console.log("🔑 Automatic login disabled - forcing account selection");

        // Force explicit account selection
        await signIn("azure-ad", {
          callbackUrl: "/reports",
          prompt: "select_account",
        });
      }
    } catch (error) {
      console.error("❌ Sign in error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-primary-foreground font-bold text-xl">EI</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Welcome to EI-Expenses
        </h1>

        <p className="text-muted-foreground mb-8">
          Sign in with your Microsoft account to manage your expenses
        </p>

        <Button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary-hover"
          size="lg"
        >
          {isLoading ? (
            "Signing in..."
          ) : (
            <>
              <UserIcon className="w-5 h-5 mr-2" />
              Sign in with Microsoft
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>

        <div className="mt-6 text-sm text-muted-foreground">
          <p>Supports Microsoft, Google, and Facebook accounts</p>
        </div>
      </Card>
    </div>
  );
}