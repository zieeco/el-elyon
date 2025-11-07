import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import bcrypt from "bcryptjs";

export const changePassword = action({
  args: { currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    if (args.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }
    
    const authAccount = await ctx.runQuery(internal.password.getAuthAccount, { userId });
    
    if (!authAccount) {
      throw new Error("No password account found");
    }
    const isValid = await bcrypt.compare(
      args.currentPassword,
      authAccount.providerAccountId
    );
    
    if (!isValid) throw new Error("Current password is incorrect");
    
    const hashedPassword = await bcrypt.hash(args.newPassword, 10);
    
    await ctx.runMutation(internal.password.updatePassword, {
      authAccountId: authAccount._id,
      hashedPassword,
    });
    
    return { success: true };
  },
});

export const getAuthAccount = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => 
        q.eq("userId", args.userId).eq("provider", "password")
      )
      .collect();
    
    if (authAccounts.length === 0) {
      return null;
    }
    
    return authAccounts[0];
  },
});

export const updatePassword = internalMutation({
  args: { 
    authAccountId: v.id("authAccounts"), 
    hashedPassword: v.string() 
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.authAccountId, { 
      providerAccountId: args.hashedPassword 
    });
  },
});
