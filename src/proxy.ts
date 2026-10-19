import { NextRequest, NextResponse } from "next/server";
import { readSessionToken, sessionCookieName } from "@/lib/session";
import { authCookieOptions, clearRemember, rememberCookieName, restoreRemember, restoredSessionToken, setSessionCookie } from "@/lib/remember";

export async function proxy(request: NextRequest) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== request.nextUrl.origin)) {
      return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
    }
    if (/^\/api\/auth\/(?:register|(?:client|admin|superadmin)-login|superadmin-setup|logout)$/.test(request.nextUrl.pathname) && !/^(?:application\/x-www-form-urlencoded|multipart\/form-data)/i.test(request.headers.get("content-type") || "")) {
      return NextResponse.json({ error: "Submit a valid form." }, { status: 400 });
    }
  }
  const path = request.nextUrl.pathname;
  let session = await readSessionToken(request.cookies.get(sessionCookieName)?.value);
  let restored: Awaited<ReturnType<typeof restoreRemember>> = null;
  let token: string | undefined;
  const remember = request.cookies.get(rememberCookieName)?.value;
  // Login/logout and OAuth handlers manage their own credentials. Never renew
  // an old account while a different account is signing in or out.
  if (!session && remember && !path.startsWith('/api/auth/')) {
    try {
      restored = await restoreRemember(remember);
      if (restored) {
        session = restored.session;
        token = await restoredSessionToken(session, restored);
        request.cookies.set(sessionCookieName, token);
      }
    } catch {
      return NextResponse.json({error: 'Sign-in is temporarily unavailable. Please try again.'}, {status: 503});
    }
  }
  const finish = (response: NextResponse) => {
    if (restored && token) {
      setSessionCookie(response, token);
      response.cookies.set(rememberCookieName, restored.value, {...authCookieOptions, expires: restored.expires});
    } else if (!session && remember && !path.startsWith('/api/auth/')) clearRemember(response);
    if (restored) response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
  if (session && (path === '/' || /^\/(client|admin|superadmin)\/login$/.test(path))) {
    const destination = session.role === 'SuperAdmin' ? '/superadmin/dashboard' : session.role === 'Admin' ? '/admin/dashboard' : '/client/dashboard';
    return finish(NextResponse.redirect(new URL(destination, request.url)));
  }

  if (path.startsWith("/admin/dashboard") && session?.role !== "Admin" && session?.role !== "SuperAdmin") {
    return finish(NextResponse.redirect(new URL("/admin/login", request.url)));
  }
  if (path.startsWith("/superadmin/dashboard") && session?.role !== "SuperAdmin") {
    return finish(NextResponse.redirect(new URL("/superadmin/login", request.url)));
  }
  if (path.startsWith("/client/dashboard") && session?.role !== "User") {
    return finish(NextResponse.redirect(new URL(request.cookies.has(sessionCookieName) ? "/client/login?error=session" : "/client/login", request.url)));
  }
  if (path === "/admin/login" && session?.role === "Admin") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }
  if (path === "/admin/login" && session?.role === "SuperAdmin") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }
  if (path === "/superadmin/setup" && session?.role === "SuperAdmin") {
    return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
  }
  const response = NextResponse.next({request: {headers: request.headers}});
  if (path.startsWith("/admin/dashboard") || path.startsWith("/superadmin/dashboard") || path.startsWith("/client/dashboard")) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  }
  return finish(response);
}

export const config = { matcher: ["/", "/admin/:path*", "/superadmin/:path*", "/client/:path*", "/api/:path*"] };
