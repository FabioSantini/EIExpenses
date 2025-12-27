import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Additional middleware logic can go here
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
);

export const config = {
  matcher: [
    // Protect all routes except auth pages, API auth, and voice API (uses token auth)
    "/((?!api/auth|api/voice|auth|_next/static|_next/image|favicon.ico|certificates).*)",
  ],
};