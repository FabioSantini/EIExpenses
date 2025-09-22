"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, ArrowLeftIcon } from "lucide-react";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");

  console.log("🚨 Authentication Error Page:", { error, searchParams: Object.fromEntries(searchParams.entries()) });

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the authentication configuration.";
      case "AccessDenied":
        return "Access was denied. You are not authorized to access this application. Please contact your administrator if you believe this is an error.";
      case "Verification":
        return "The verification token is invalid or has expired.";
      case "Callback":
        return "Authentication callback failed. This may be due to insufficient permissions or group membership requirements.";
      case "Default":
        return "An unknown error occurred during authentication.";
      default:
        return `Authentication error: ${error || "Unknown error"}`;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <CardHeader>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircleIcon className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-800">Authentication Error</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {getErrorMessage(error)}
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700 font-mono">
                Error Code: {error}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={() => router.push("/auth/signin")}
              className="w-full"
            >
              Try Again
            </Button>

            <Button
              variant="outline"
              onClick={() => router.back()}
              className="w-full"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            <p>If this problem persists, please check:</p>
            <ul className="text-left mt-2 space-y-1">
              <li>• Azure AD application configuration</li>
              <li>• Group membership requirements</li>
              <li>• Application permissions (GroupMember.Read.All)</li>
              <li>• Redirect URI settings</li>
              <li>• Environment variables</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}