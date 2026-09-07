import { prisma } from "../../lib/prisma";

export class TokenManager {
  /**
   * Checks if the active EmailConnection access token is valid.
   * If expired or revoked, attempts token refresh or falls back to BetterAuth Account table.
   * Automatically syncs fresh Google OAuth tokens from BetterAuth Account into EmailConnection.
   * Returns a valid active accessToken or throws a clear error.
   */
  static async getValidAccessToken(userId: string): Promise<string> {
    const connection = await prisma.emailConnection.findFirst({
      where: { userId, provider: "GMAIL", isActive: true }
    });

    const googleAccount = await prisma.account.findFirst({
      where: { userId, providerId: "google" }
    });

    if (!connection && !googleAccount) {
      throw new Error("No active Gmail connection or Google account found for user.");
    }

    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    // Check if Google Account token from BetterAuth is fresh and unexpired
    const accountTokenValid = googleAccount?.accessToken && googleAccount.accessTokenExpiresAt
      ? new Date(Date.now() + bufferTime) < googleAccount.accessTokenExpiresAt
      : Boolean(googleAccount?.accessToken);

    // Case 1: EmailConnection is explicitly managed by BetterAuth or missing
    if (connection?.accessToken === "managed-by-better-auth" || (!connection && googleAccount)) {
      if (googleAccount?.accessToken && accountTokenValid) {
        return googleAccount.accessToken;
      }
      if (googleAccount?.refreshToken) {
        return await TokenManager.refreshGoogleToken(googleAccount.refreshToken, async (newAccess, newRefresh, expiresAt) => {
          await prisma.account.update({
            where: { id: googleAccount.id },
            data: {
              accessToken: newAccess,
              refreshToken: newRefresh,
              accessTokenExpiresAt: expiresAt
            }
          });
        });
      }
    }

    // Case 2: Try active EmailConnection token if unexpired
    if (connection && connection.accessToken && connection.accessToken !== "managed-by-better-auth") {
      const connectionValid = connection.expiresAt
        ? new Date(Date.now() + bufferTime) < connection.expiresAt
        : true;

      if (connectionValid) {
        return connection.accessToken;
      }

      // Attempt to refresh using connection.refreshToken
      if (connection.refreshToken) {
        try {
          return await TokenManager.refreshGoogleToken(connection.refreshToken, async (newAccess, newRefresh, expiresAt) => {
            await prisma.emailConnection.update({
              where: { id: connection.id },
              data: {
                accessToken: newAccess,
                refreshToken: newRefresh,
                expiresAt: expiresAt
              }
            });
          });
        } catch (refreshErr) {
          console.warn("EmailConnection refreshToken failed. Checking BetterAuth Account fallback...", refreshErr);
        }
      }
    }

    // Case 3: Fallback to BetterAuth Account table (e.g. user recently completed Google OAuth re-authentication)
    if (googleAccount) {
      if (googleAccount.accessToken && accountTokenValid) {
        // Sync connection with Google Account token
        if (connection) {
          await prisma.emailConnection.update({
            where: { id: connection.id },
            data: {
              accessToken: googleAccount.accessToken,
              refreshToken: googleAccount.refreshToken || connection.refreshToken,
              expiresAt: googleAccount.accessTokenExpiresAt || null
            }
          });
        }
        return googleAccount.accessToken;
      }

      if (googleAccount.refreshToken) {
        try {
          const freshToken = await TokenManager.refreshGoogleToken(googleAccount.refreshToken, async (newAccess, newRefresh, expiresAt) => {
            await prisma.account.update({
              where: { id: googleAccount.id },
              data: {
                accessToken: newAccess,
                refreshToken: newRefresh,
                accessTokenExpiresAt: expiresAt
              }
            });
            if (connection) {
              await prisma.emailConnection.update({
                where: { id: connection.id },
                data: {
                  accessToken: newAccess,
                  refreshToken: newRefresh,
                  expiresAt: expiresAt
                }
              });
            }
          });
          return freshToken;
        } catch (err: any) {
          console.error("Account token refresh failed:", err);
        }
      }
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
    const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);
    const newRefreshToken = data.refresh_token || refreshToken;

    await onSuccess(data.access_token, newRefreshToken, newExpiresAt);
    return data.access_token;
  }
}
