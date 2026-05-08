import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/portfolio", "/analysis", "/history", "/settings", "/onboarding"];
const AUTH_ONLY = ["/auth"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isDev = process.env.NODE_ENV === "development";

  // In development, skip all auth redirects so you can test without a Supabase session.
  if (!isDev) {
    if (!user && PROTECTED.some(p => path.startsWith(p))) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }

    if (user && AUTH_ONLY.some(p => path.startsWith(p))) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (user && path.startsWith("/dashboard")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("age, monthly_income")
        .eq("id", user.id)
        .single();
      if (!profile?.age || !profile?.monthly_income) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
