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

// Public routes: /login, /setup, /search, /totes/[id] (but NOT /totes/[id]/edit or /totes/new)
// Protected: everything else
export const config = {
  matcher: [
    "/((?!login|setup|api/setup|search|api/search|api/auth|api/packages|api/todos|totes/[^/]+$|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
