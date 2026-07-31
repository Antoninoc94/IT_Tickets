import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const SESSION_COOKIE = "session";

// Inactivity timeout — override with SESSION_INACTIVITY_HOURS env var (default: 8h)
const INACTIVITY_MS =
  parseInt(process.env.SESSION_INACTIVITY_HOURS ?? "8", 10) * 60 * 60 * 1000;

// Refresh lastActiveAt in the cookie if the last touch was more than 5 minutes ago
const REFRESH_AFTER_MS = 5 * 60 * 1000;

type SessionPayload = {
  userId: string;
  role: string;
  expiresAt: number;
  lastActiveAt?: number;
};

function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

async function decryptToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

async function refreshToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(getKey());
}

// These prefixes bypass the inactivity check entirely
const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/change-password",
  "/guida",
  "/api/auth/",     // includes /api/auth/signout — avoid redirect loop
  "/api/branding",  // logo/favicon served on public pages too
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.next();

  const session = await decryptToken(token);
  if (!session) return NextResponse.next();

  const now = Date.now();
  const lastActive = session.lastActiveAt;

  // Inactivity exceeded — force logout
  if (lastActive !== undefined && now - lastActive > INACTIVITY_MS) {
    return NextResponse.redirect(new URL("/api/auth/signout", request.url));
  }

  // Refresh the cookie when: token predates this feature (no lastActiveAt),
  // or lastActiveAt is older than REFRESH_AFTER_MS
  if (lastActive === undefined || now - lastActive > REFRESH_AFTER_MS) {
    const refreshed = await refreshToken({ ...session, lastActiveAt: now });
    const useSecure = (process.env.APP_URL ?? "").startsWith("https://");
    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE, refreshed, {
      httpOnly: true,
      secure: useSecure,
      sameSite: "lax",
      expires: new Date(session.expiresAt),
      path: "/",
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
