import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  contactSubmissions: defineTable({
    name: v.string(),
    email: v.string(),
    message: v.string(),
    ipHash: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("rate_limited"),
    ),
    resendError: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  contactRateEvents: defineTable({
    ipHash: v.string(),
    createdAt: v.number(),
  }).index("by_ip_created", ["ipHash", "createdAt"]),

  siteViews: defineTable({
    key: v.string(),
    count: v.number(),
  }).index("by_key", ["key"]),
});
