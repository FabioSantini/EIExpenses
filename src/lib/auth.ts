import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

// Function to check if user is member of the allowed group
async function checkGroupMembership(accessToken: string): Promise<boolean> {
  const allowedGroupId = process.env.AZURE_AD_ALLOWED_GROUP_ID;

  if (!allowedGroupId) {
    console.log("⚠️ No AZURE_AD_ALLOWED_GROUP_ID configured, allowing all users");
    return true;
  }

  try {
    console.log("🔍 Checking group membership for current user in group:", allowedGroupId);

    // Check if user is member of the specific group using /me/memberOf endpoint
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/memberOf?$filter=id eq '${allowedGroupId}'`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      const isMember = data.value && data.value.length > 0;

      if (isMember) {
        console.log("✅ User is member of allowed group");
        return true;
      } else {
        console.log("❌ User is NOT member of allowed group");
        return false;
      }
    } else {
      console.error("❌ Error checking group membership:", response.status, await response.text());
      // In case of API error, deny access for security
      return false;
    }
  } catch (error) {
    console.error("❌ Exception checking group membership:", error);
    // In case of exception, deny access for security
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, trigger }) {
      console.log("🔑 JWT Callback:", { trigger, account: !!account, profile: !!profile, token: !!token });

      // On first sign in, save the user info and access token
      if (account && profile) {
        console.log("✅ New sign in - saving profile info:", { email: profile.email, name: profile.name });
        token.email = profile.email || token.email;
        token.name = profile.name || token.name;
        token.picture = token.picture;
        token.accessToken = account.access_token;
        token.userId = (profile as any).sub || (profile as any).oid; // Azure AD user object ID
        console.log("🔑 Stored user ID:", token.userId);
      }
      return token;
    },
    async session({ session, token }) {
      console.log("👤 Session Callback:", { session: !!session, token: !!token });

      // Send properties to the client
      if (token && session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        console.log("📧 Session user:", { email: session.user.email, name: session.user.name });
      }
      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      console.log("🚪 SignIn Callback:", {
        user: !!user,
        account: !!account,
        profile: !!profile,
        provider: account?.provider,
        type: account?.type,
        email: user?.email
      });

      if (account?.provider === "azure-ad") {
        console.log("🔐 Azure AD sign in - checking group membership");
        console.log("🔍 Access token scopes:", account.scope);

        // Get user ID from profile
        const userId = (profile as any)?.sub || (profile as any)?.oid;

        if (!userId) {
          console.error("❌ No user ID found in profile");
          return false;
        }

        console.log("👤 User ID:", userId);

        // Check if user is member of allowed group
        const isAllowed = await checkGroupMembership(account.access_token!);

        if (isAllowed) {
          console.log("✅ User is authorized - group membership confirmed");
          return true;
        } else {
          console.log("❌ User is NOT authorized - not member of allowed group");
          return false;
        }
      }

      return true;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
};