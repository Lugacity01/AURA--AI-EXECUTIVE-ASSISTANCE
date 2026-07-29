import { prisma } from "../../lib/prisma";

export class TokenManager {
  /**
   * Checks if the active EmailConnection access token is expired.
   * If expired and a refresh token is present, exchanges it for a new access token.
   * Returns the valid active accessToken or throws an error.
   */
  static async getValidAccessToken(userId: string): Promise<string> {
    const connection = await prisma.emailConnection.findFirst({
      where: { userId, provider: "GMAIL", isActive: true }
    });

    if (!connection) {
      throw new Error("No active Gmail connection found");
    }

    if (connection.accessToken === "managed-by-better-auth") {
      const account = await prisma.account.findFirst({
        where: { userId, providerId: "google" }
      });

      if (!account || !account.accessToken) {
        throw new Error("No Google social login account tokens found");
      }

      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
      const isExpired = account.accessTokenExpiresAt
        ? new Date(Date.now() + bufferTime) > account.accessTokenExpiresAt
        : false;

      if (!isExpired) {
        return account.accessToken;
      }

      if (!account.refreshToken) {
        throw new Error("Social login access token expired and no refresh token available");
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error("Missing client ID or client secret");
      }

      try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: account.refreshToken,
            grant_type: "refresh_token",
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error("Better Auth token refresh failed:", errText);
          throw new Error("Better Auth token refresh response from Google was not OK");
        }

        const data = await res.json();
        const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

        await prisma.account.update({
          where: { id: account.id },
          data: {
            accessToken: data.access_token,
            accessTokenExpiresAt: newExpiresAt,
            refreshToken: data.refresh_token || account.refreshToken,
          }
        });

        return data.access_token;
      } catch (err) {
        console.error("Error refreshing Better Auth token:", err);
        throw err;
      }
    }

    if (!connection.accessToken) {
      throw new Error("Gmail connection has no access token");
    }

    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    const isExpired = connection.expiresAt 
      ? new Date(Date.now() + bufferTime) > connection.expiresAt
      : false;

    if (!isExpired) {
      return connection.accessToken;
    }

    if (!connection.refreshToken) {
      throw new Error("Access token expired and no refresh token available");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing client ID or client secret");
    }

    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: connection.refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Token refresh failed:", errText);
        throw new Error("Token refresh response from Google was not OK");
      }

      const data = await res.json();
      const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

      await prisma.emailConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: data.access_token,
          expiresAt: newExpiresAt,
          // Preserve refresh token if Google did not return a new one
          refreshToken: data.refresh_token || connection.refreshToken,
        }
      });

      return data.access_token;
    } catch (err) {
      console.error("Error refreshing token:", err);
      throw err;
    }
  }
}
