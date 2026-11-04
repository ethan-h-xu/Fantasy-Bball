import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Refreshes the session and verifies the token. Call this from `src/proxy.ts`.
 *
 * Return `response` as is. A different response, such as a redirect, needs this
 * response's cookies and cache headers copied onto it, or the refreshed session is lost.
 */
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Stops a CDN from caching a session token and serving it to someone else.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Don't add code between creating the client and this call, and don't use getSession()
  // here: it doesn't verify the token, and a cookie can be forged.
  const { data } = await supabase.auth.getClaims();

  return { response, userId: data?.claims.sub ?? null };
}
