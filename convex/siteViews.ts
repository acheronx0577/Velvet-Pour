import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const record = await ctx.db
      .query("siteViews")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    return record?.count ?? 0;
  },
});

export const increment = mutation({
  args: { incrementBy: v.optional(v.number()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const bump = args.incrementBy ?? 1;
    const record = await ctx.db
      .query("siteViews")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();

    if (record) {
      const newCount = record.count + bump;
      await ctx.db.patch(record._id, { count: newCount });
      return newCount;
    }

    await ctx.db.insert("siteViews", { key: "global", count: bump });
    return bump;
  },
});
