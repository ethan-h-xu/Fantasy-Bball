import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const SIGN_IN_PATH = "/";
const SIGNED_IN_HOME_PATH = "/leagues";

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const isSignInPage = request.nextUrl.pathname === SIGN_IN_PATH;

  if (!userId && !isSignInPage) return redirectKeepingSession(request, response, SIGN_IN_PATH);
  if (userId && isSignInPage) return redirectKeepingSession(request, response, SIGNED_IN_HOME_PATH);
  return response;
}

// A refreshed session is only on `sessionResponse`, so its cookies and cache headers
// have to move to the redirect or the user is signed out.
function redirectKeepingSession(request: NextRequest, sessionResponse: NextResponse, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";

  const redirect = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = sessionResponse.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
