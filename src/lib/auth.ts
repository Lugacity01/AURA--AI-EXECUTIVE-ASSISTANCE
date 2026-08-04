import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { dash } from "@better-auth/infra";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mongodb",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id-for-compilation",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret-for-compilation",
      scope: [
        "openid",
        "profile",
        "email",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar.events"
      ]
    },
  },
  plugins: [
    dash()
  ],
});
