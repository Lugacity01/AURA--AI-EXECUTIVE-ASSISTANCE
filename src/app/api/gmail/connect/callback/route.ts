import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { GmailService } from "@/services/gmail.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("gmail_oauth_state")?.value;

  // 1. Verify CSRF State
  if (!state || !savedState || state !== savedState) {
    return NextResponse.json({ error: "CSRF state validation failed" }, { status: 400 });
  }

  // Clear the state cookie after validation
  cookieStore.delete("gmail_oauth_state");

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Server OAuth credentials missing" }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/gmail/connect/callback`;

  try {
    // 2. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
    }

    const tokens = await tokenRes.json();

    // 3. Fetch connected user details via Google OpenID Connect UserInfo endpoint
    const userinfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userinfoRes.ok) {
      console.error("Failed to fetch UserInfo from OpenID Connect");
      return NextResponse.json({ error: "Failed to retrieve user info" }, { status: 500 });
    }

    const userInfo = await userinfoRes.json();

    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000) 
      : undefined;

    // 4. Save connection dynamically inside EmailConnection metadata store
    await GmailService.connectGmail(session.user.id, {
      email: userInfo.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      providerUserId: userInfo.sub,
      displayName: userInfo.name,
      avatarUrl: userInfo.picture,
      scope: tokens.scope,
    });

    // 5. Redirect back to settings integrations dashboard
    return NextResponse.redirect(new URL("/dashboard/integrations", request.url));
  } catch (err) {
    console.error("Google OAuth Callback Error:", err);
    return NextResponse.json({ error: "Authentication callback error occurred" }, { status: 500 });
  }
}
