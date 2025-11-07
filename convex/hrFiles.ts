import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Get HR files for an employee (admin only)
export const getEmployeeHRFiles = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const roleDoc = await ctx.db.query("roles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (roleDoc?.role !== "admin") {
      throw new Error("Access denied - admin role required");
    }

    const hrFiles = await ctx.db
      .query("hr_files")
      .withIndex("by_employeeId", (q) => q.eq("employeeId", args.employeeId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .collect();

    return hrFiles;
  },
});

// Get all HR files with employee info (admin only)
export const getAllHRFiles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const roleDoc = await ctx.db.query("roles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (roleDoc?.role !== "admin") {
      throw new Error("Access denied - admin role required");
    }

    const hrFiles = await ctx.db
      .query("hr_files")
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .collect();

    // Get employee info for each file
    const filesWithEmployees = await Promise.all(
      hrFiles.map(async (file) => {
        const employee = await ctx.db.get(file.employeeId);
        return {
          ...file,
          employeeName: employee?.name || "Unknown Employee",
          employeeEmail: employee?.workEmail || employee?.email || "No email",
        };
      })
    );

    return filesWithEmployees;
  },
});

// Generate upload URL for HR file
export const generateHRFileUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const roleDoc = await ctx.db.query("roles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (roleDoc?.role !== "admin") {
      throw new Error("Access denied - admin role required");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Upload HR file
export const uploadHRFile = mutation({
  args: {
    employeeId: v.id("employees"),
    fileStorageId: v.id("_storage"),
    fileType: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
    expiresAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const roleDoc = await ctx.db.query("roles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (roleDoc?.role !== "admin") {
      throw new Error("Access denied - admin role required");
    }

    // Verify employee exists
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    const hrFileId = await ctx.db.insert("hr_files", {
      employeeId: args.employeeId,
      fileStorageId: args.fileStorageId,
      fileType: args.fileType,
      fileName: args.fileName,
      fileSize: args.fileSize,
      contentType: args.contentType,
      status: "active",
      expiresAt: args.expiresAt,
      notes: args.notes,
      uploadedBy: userId,
      uploadedAt: Date.now(),
    });

    // Log the upload action
    await ctx.db.insert("hr_file_access_logs", {
      hrFileId,
      employeeId: args.employeeId,
      userId,
      action: "upload",
      timestamp: Date.now(),
      success: true,
    });

    return hrFileId;
  },
});

// Archive HR file
export const archiveHRFile = mutation({
  args: { hrFileId: v.id("hr_files") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const roleDoc = await ctx.db.query("roles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (roleDoc?.role !== "admin") {
      throw new Error("Access denied - admin role required");
    }

    const hrFile = await ctx.db.get(args.hrFileId);
    if (!hrFile) {
      throw new Error("HR file not found");
    }

    await ctx.db.patch(args.hrFileId, {
      status: "archived",
      archivedBy: userId,
      archivedAt: Date.now(),
    });

    // Log the archive action
    await ctx.db.insert("hr_file_access_logs", {
      hrFileId: args.hrFileId,
      employeeId: hrFile.employeeId,
      userId,
      action: "archive",
      timestamp: Date.now(),
      success: true,
    });

    return { success: true };
  },
});

// Get HR file download URL
export const getHRFileDownloadUrl = mutation({
  args: { hrFileId: v.id("hr_files") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const roleDoc = await ctx.db.query("roles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (roleDoc?.role !== "admin") {
      throw new Error("Access denied - admin role required");
    }

    const hrFile = await ctx.db.get(args.hrFileId);
    if (!hrFile || hrFile.status !== "active") {
      throw new Error("HR file not found or archived");
    }

    const url = await ctx.storage.getUrl(hrFile.fileStorageId);

    // Log the download action
    await ctx.db.insert("hr_file_access_logs", {
      hrFileId: args.hrFileId,
      employeeId: hrFile.employeeId,
      userId,
      action: "download",
      timestamp: Date.now(),
      success: !!url,
    });

    return url;
  },
});

// Get HR file access logs (admin only)
export const getHRFileAccessLogs = query({
  args: { 
    employeeId: v.optional(v.id("employees")),
    hrFileId: v.optional(v.id("hr_files")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const roleDoc = await ctx.db.query("roles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (roleDoc?.role !== "admin") {
      throw new Error("Access denied - admin role required");
    }

    let query = ctx.db.query("hr_file_access_logs");

    if (args.hrFileId) {
      query = query.withIndex("by_hrFileId", (q) => q.eq("hrFileId", args.hrFileId));
    } else if (args.employeeId) {
      query = query.withIndex("by_employeeId", (q) => q.eq("employeeId", args.employeeId));
    }

    const logs = await query.order("desc").take(100);

    // Get user names for each log
    const logsWithUsers = await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        const hrFile = await ctx.db.get(log.hrFileId);
        return {
          ...log,
          userName: user?.name || "Unknown User",
          userEmail: user?.email || "No email",
          fileName: hrFile?.fileName || "Unknown File",
        };
      })
    );

    return logsWithUsers;
  },
});

// Get expiring HR files (admin only)
export const getExpiringHRFiles = query({
  args: { daysAhead: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const roleDoc = await ctx.db.query("roles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (roleDoc?.role !== "admin") {
      throw new Error("Access denied - admin role required");
    }

    const daysAhead = args.daysAhead || 30;
    const futureDate = Date.now() + (daysAhead * 24 * 60 * 60 * 1000);

    const expiringFiles = await ctx.db
      .query("hr_files")
      .withIndex("by_expiresAt", (q) => 
        q.gte("expiresAt", Date.now()).lte("expiresAt", futureDate)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Get employee info for each file
    const filesWithEmployees = await Promise.all(
      expiringFiles.map(async (file) => {
        const employee = await ctx.db.get(file.employeeId);
        return {
          ...file,
          employeeName: employee?.name || "Unknown Employee",
          employeeEmail: employee?.workEmail || employee?.email || "No email",
          daysUntilExpiry: Math.ceil((file.expiresAt! - Date.now()) / (24 * 60 * 60 * 1000)),
        };
      })
    );

    return filesWithEmployees.sort((a, b) => (a.expiresAt || 0) - (b.expiresAt || 0));
  },
});

// Get HR file types (for dropdown)
export const getHRFileTypes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const roleDoc = await ctx.db.query("roles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (roleDoc?.role !== "admin") {
      throw new Error("Access denied - admin role required");
    }

    return [
      "Background Check",
      "Drug Test",
      "Physical Exam",
      "TB Test",
      "CPR Certification",
      "First Aid Certification",
      "Training Certificate",
      "License",
      "Insurance",
      "Contract",
      "Performance Review",
      "Disciplinary Action",
      "Other"
    ];
  },
});
