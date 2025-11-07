import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create admin user by email (creates user account and admin role)
export const createAdminByEmail = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user with this email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    let userId: Id<"users">;
    
    if (existingUser) {
      userId = existingUser._id;
      
      // Check if this user already has an admin role
      const existingRole = await ctx.db
        .query("roles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();
      
      if (existingRole && existingRole.role === "admin") {
        throw new Error("User is already an admin");
      }
      
      // Update existing role or create new one
      if (existingRole) {
        await ctx.db.patch(existingRole._id, {
          role: "admin",
          locations: [],
          assignedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("roles", {
          userId,
          role: "admin",
          locations: [],
          assignedAt: Date.now(),
        });
      }
    } else {
      // Create new user account
      userId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name || args.email.split("@")[0],
        emailVerificationTime: Date.now(), // Mark as verified
      });

      // Create admin role for new user
      await ctx.db.insert("roles", {
        userId,
        role: "admin",
        locations: [],
        assignedAt: Date.now(),
      });
    }

    return { 
      success: true, 
      userId,
      message: existingUser ? "Existing user promoted to admin" : "New admin user created"
    };
  },
});
