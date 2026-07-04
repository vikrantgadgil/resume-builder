import { auth } from "@/auth";
import { NextResponse } from "next/server";

const protectedPaths = ["/profile", "/generator", "/tracking"];

export default auth((req) => {
  const isProtected = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path),
  );

  if (isProtected && !req.auth) {
    const signInUrl = new URL("/sign-in", req.nextUrl);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/profile/:path*", "/generator/:path*", "/tracking/:path*"],
};
