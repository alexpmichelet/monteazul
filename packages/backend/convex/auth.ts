import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { APP_SLUG } from "@packages/shared";
import type { MutationCtx } from "./_generated/server";
import { hashSecret, verifySecret } from "./lib/auth/passwordCrypto";
import { ResendOTP } from "./lib/auth/ResendOTP";
import { ResendOTPPasswordReset } from "./lib/auth/ResendOTPPasswordReset";
import { assignDefaultRole } from "./rbac";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Email + password, keeping the existing OTP verification and email-based
    // password reset flows (both via Resend). The plaintext `crypto`
    // placeholder from the template is replaced by real Scrypt hashing.
    Password({
      verify: ResendOTP,
      reset: ResendOTPPasswordReset,
      crypto: {
        hashSecret,
        verifySecret,
      },
    }),
    // Google OAuth (one-click sign-in). GitHub and Apple were removed.
    Google,
  ],
  callbacks: {
    /**
     * Grant the default `user` role to every newly created account (Password
     * sign-up or Google sign-in). Existing accounts and already-assigned roles
     * are left untouched.
     */
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      await assignDefaultRole(ctx as MutationCtx, { userId, existingUserId });
    },
    async redirect({ redirectTo }) {
      if (
        redirectTo !== `${APP_SLUG}://` &&
        redirectTo !== "http://localhost:3000"
      ) {
        throw new Error(`Invalid redirectTo URI ${redirectTo}`);
      }
      return redirectTo;
    },
  },
});
