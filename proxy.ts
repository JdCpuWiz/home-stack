import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Public routes: /login, /search, /totes/[id] (but NOT /totes/[id]/edit or /totes/new)
// Protected: everything else
export const config = {
  matcher: [
    "/((?!login|search|api/search|api/auth|totes/[^/]+$|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
