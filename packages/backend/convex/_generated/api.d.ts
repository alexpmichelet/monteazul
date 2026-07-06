/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as lib_approval from "../lib/approval.js";
import type * as lib_auth_ResendOTP from "../lib/auth/ResendOTP.js";
import type * as lib_auth_ResendOTPPasswordReset from "../lib/auth/ResendOTPPasswordReset.js";
import type * as lib_auth_passwordCrypto from "../lib/auth/passwordCrypto.js";
import type * as lib_auth_roles from "../lib/auth/roles.js";
import type * as lib_commerce from "../lib/commerce.js";
import type * as lib_horario from "../lib/horario.js";
import type * as lib_photos from "../lib/photos.js";
import type * as lib_stats from "../lib/stats.js";
import type * as lib_tracking from "../lib/tracking.js";
import type * as migrations from "../migrations.js";
import type * as rbac from "../rbac.js";
import type * as seed from "../seed.js";
import type * as storage from "../storage.js";
import type * as table_admin from "../table/admin.js";
import type * as table_adminCommerces from "../table/adminCommerces.js";
import type * as table_adminInvites from "../table/adminInvites.js";
import type * as table_adminStats from "../table/adminStats.js";
import type * as table_commerces from "../table/commerces.js";
import type * as table_events from "../table/events.js";
import type * as table_favorites from "../table/favorites.js";
import type * as table_feedback from "../table/feedback.js";
import type * as table_users from "../table/users.js";
import type * as utils_generateFunctions from "../utils/generateFunctions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  emails: typeof emails;
  http: typeof http;
  "lib/approval": typeof lib_approval;
  "lib/auth/ResendOTP": typeof lib_auth_ResendOTP;
  "lib/auth/ResendOTPPasswordReset": typeof lib_auth_ResendOTPPasswordReset;
  "lib/auth/passwordCrypto": typeof lib_auth_passwordCrypto;
  "lib/auth/roles": typeof lib_auth_roles;
  "lib/commerce": typeof lib_commerce;
  "lib/horario": typeof lib_horario;
  "lib/photos": typeof lib_photos;
  "lib/stats": typeof lib_stats;
  "lib/tracking": typeof lib_tracking;
  migrations: typeof migrations;
  rbac: typeof rbac;
  seed: typeof seed;
  storage: typeof storage;
  "table/admin": typeof table_admin;
  "table/adminCommerces": typeof table_adminCommerces;
  "table/adminInvites": typeof table_adminInvites;
  "table/adminStats": typeof table_adminStats;
  "table/commerces": typeof table_commerces;
  "table/events": typeof table_events;
  "table/favorites": typeof table_favorites;
  "table/feedback": typeof table_feedback;
  "table/users": typeof table_users;
  "utils/generateFunctions": typeof utils_generateFunctions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
