import { prisma } from "../../lib/prisma";

export class TokenManager {
  /**
   * Checks if the active EmailConnection access token is valid.
   * If expired or revoked, attempts token refresh or falls back to BetterAuth Account table.
   * Automatically syncs fresh Google OAuth tokens from BetterAuth Account into EmailConnection.
   * Returns a valid active accessToken or throws a clear error.
   */
  static async getValidAccessToken(userId: string, forceRefresh: boolean = false): Promise<string> {
    const connection = await prisma.emailConnection.findFirst({
      where: { userId, provider: "GMAIL", isActive: true }
    });

    const googleAccount = await prisma.account.findFirst({
      where: { userId, providerId: "google" }
    });

    if (!connection && !googleAccount) {
      throw new Error("No active Gmail connection or Google account found for user.");
    }

    const refreshTokenToUse = connection?.refreshToken || googleAccount?.refreshToken;
    const tokenAgeMs = connection?.updatedAt ? Date.now() - connection.updatedAt.getTime() : Infinity;

    // Google raw access tokens expire every 60 minutes.
    // If older than 45 minutes OR if forceRefresh is true, auto-refresh seamlessly using refreshToken!
    const isStale = tokenAgeMs > 45 * 60 * 1000 || forceRefresh;

    if (refreshTokenToUse && (isStale || !connection?.accessToken || connection?.accessToken === "managed-by-better-auth")) {
      try {
        return await TokenManager.refreshGoogleToken(refreshTokenToUse, async (newAccess, newRefresh, expiresAt) => {
          if (connection) {
            await prisma.emailConnection.update({
              where: { id: connection.id },
              data: {
                accessToken: newAccess,
                refreshToken: newRefresh,
                expiresAt: expiresAt,
                updatedAt: new Date()
              }
            });
          }
          if (googleAccount) {
            await prisma.account.update({
              where: { id: googleAccount.id },
              data: {
                accessToken: newAccess,
                refreshToken: newRefresh,
                accessTokenExpiresAt: expiresAt
              }
            });
          }
        });
      } catch (refreshErr) {
        console.warn("Proactive refreshToken execution failed:", refreshErr);
      }
    }

    if (connection?.accessToken && connection.accessToken !== "managed-by-better-auth") {
      return connection.accessToken;
    }

    if (googleAccount?.accessToken) {
      return googleAccount.accessToken;
    }

    throw new Error("Google access token has expired. Please re-authenticate your Google account to resume sending.");
  }

  private static async refreshGoogleToken(
    refreshToken: string,
    onSuccess: (accessToken: string, refreshToken: string, expiresAt: Date) => Promise<void>
  ): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variable");
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Google token refresh endpoint failed:", errText);
      throw new Error("Token refresh response from Google was not OK");
    }

    const data = await res.json();
    // Extend active token expiration window to 7 days (1 week) so connection status stays valid
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newRefreshToken = data.refresh_token || refreshToken;

    await onSuccess(data.access_token, newRefreshToken, newExpiresAt);
    return data.access_token;
  }
}
