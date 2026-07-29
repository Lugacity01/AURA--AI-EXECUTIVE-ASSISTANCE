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
    },
  },
  plugins: [
    dash()
  ],
});
