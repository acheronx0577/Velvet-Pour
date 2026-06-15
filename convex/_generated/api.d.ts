/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as contact from "../contact.js";
import type * as http from "../http.js";
import type * as lib_bearerAuth from "../lib/bearerAuth.js";
import type * as lib_emailSanitize from "../lib/emailSanitize.js";
import type * as lib_html from "../lib/html.js";
import type * as lib_ipHash from "../lib/ipHash.js";
import type * as lib_ipHintAuth from "../lib/ipHintAuth.js";
import type * as lib_isIpAddress from "../lib/isIpAddress.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_resend from "../lib/resend.js";
import type * as lib_validation from "../lib/validation.js";
import type * as siteViews from "../siteViews.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  contact: typeof contact;
  http: typeof http;
  "lib/bearerAuth": typeof lib_bearerAuth;
  "lib/emailSanitize": typeof lib_emailSanitize;
  "lib/html": typeof lib_html;
  "lib/ipHash": typeof lib_ipHash;
  "lib/ipHintAuth": typeof lib_ipHintAuth;
  "lib/isIpAddress": typeof lib_isIpAddress;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/resend": typeof lib_resend;
  "lib/validation": typeof lib_validation;
  siteViews: typeof siteViews;
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

export declare const components: {};
