import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Helper function to get user role
async function getUserRole(ctx: any, userId: Id<"users">) {
  return await ctx.db
    .query("roles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
}

// Helper function to get team member IDs based on shared locations
async function getTeamMemberIds(ctx: any, userLocations: string[]) {
  const allRoles = await ctx.db.query("roles").collect();
  return allRoles
    .filter((role: any) => 
      role.locations?.some((loc: string) => userLocations.includes(loc))
    )
    .map((role: any) => role.userId);
}

export const getTeamActivities = query({
  args: {
    staffId: v.optional(v.id("users")),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userRole = await getUserRole(ctx, userId);
    if (!userRole || !["admin", "supervisor"].includes(userRole.role)) {
      throw new Error("Access denied");
    }

    const userLocations = userRole.locations || [];
    const teamMemberIds = await getTeamMemberIds(ctx, userLocations);

    // Get audit logs for activities
    let auditLogs = await ctx.db.query("audit_logs").order("desc").take(500);
    
    // Filter by team members
    auditLogs = auditLogs.filter(log => log.userId && teamMemberIds.includes(log.userId));
    
    // Filter by date range
    if (args.dateFrom || args.dateTo) {
      auditLogs = auditLogs.filter(log => {
        const logDate = log.timestamp;
        if (args.dateFrom && logDate < args.dateFrom) return false;
        if (args.dateTo && logDate > args.dateTo) return false;
        return true;
      });
    }

    // Filter by specific staff member
    if (args.staffId) {
      auditLogs = auditLogs.filter(log => log.userId === args.staffId);
    }

    // Limit results
    if (args.limit) {
      auditLogs = auditLogs.slice(0, args.limit);
    }

    // Enrich with user data
    const users = await ctx.db.query("users").collect();

    return auditLogs.map(log => {
      const user = users.find(u => u._id === log.userId);
      
      return {
        id: log._id,
        staffId: log.userId,
        staffName: user?.name || user?.email || "Unknown User",
        activityType: log.event,
        details: log.details || "",
        timestamp: log.timestamp,
        location: log.location || "Unknown",
      };
    });
  },
});

export const getAllEmployeeActivities = query({
  args: {
    staffId: v.optional(v.id("users")),
    dateFrom: v.number(),
    dateTo: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userRole = await getUserRole(ctx, userId);
    if (!userRole || userRole.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Get audit logs for all activities
    let auditLogs = await ctx.db.query("audit_logs").order("desc").take(1000);
    
    // Filter by date range
    auditLogs = auditLogs.filter(log => {
      const logDate = log.timestamp;
      return logDate >= args.dateFrom && logDate <= args.dateTo;
    });

    // Filter by specific staff member if provided
    if (args.staffId) {
      auditLogs = auditLogs.filter(log => log.userId === args.staffId);
    }

    // Limit results
    if (args.limit) {
      auditLogs = auditLogs.slice(0, args.limit);
    }

    // Enrich with user data
    const users = await ctx.db.query("users").collect();

    return auditLogs.map(log => {
      const user = users.find(u => u._id === log.userId);
      
      return {
        id: log._id,
        staffId: log.userId,
        staffName: user?.name || user?.email || "System",
        activityType: log.event,
        details: log.details || "",
        timestamp: log.timestamp,
        location: log.location || "Unknown",
      };
    });
  },
});

export const getTeamLogStats = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userRole = await getUserRole(ctx, userId);
    if (!userRole || !["admin", "supervisor"].includes(userRole.role)) {
      throw new Error("Access denied");
    }

    const userLocations = userRole.locations || [];
    const teamMemberIds = await getTeamMemberIds(ctx, userLocations);

    let logs = await ctx.db.query("resident_logs").collect();
    
    logs = logs.filter(log => teamMemberIds.includes(log.authorId));
    
    if (args.dateFrom || args.dateTo) {
      logs = logs.filter(log => {
        const logDate = log.createdAt || log._creationTime;
        if (args.dateFrom && logDate < args.dateFrom) return false;
        if (args.dateTo && logDate > args.dateTo) return false;
        return true;
      });
    }

    // Calculate stats
    const stats = {
      totalLogs: logs.length,
      logsByAuthor: {} as Record<string, number>,
      logsByTemplate: {} as Record<string, number>,
      logsByLocation: {} as Record<string, number>,
    };

    const users = await ctx.db.query("users").collect();
    const residents = await ctx.db.query("residents").collect();

    logs.forEach(log => {
      const author = users.find(u => u._id === log.authorId);
      const resident = residents.find(r => r._id === log.residentId);
      
      const authorName = author?.name || author?.email || "Unknown User";
      const location = log.location || resident?.location || "Unknown Location";
      
      stats.logsByAuthor[authorName] = (stats.logsByAuthor[authorName] || 0) + 1;
      if (log.template) {
        stats.logsByTemplate[log.template] = (stats.logsByTemplate[log.template] || 0) + 1;
      }
      stats.logsByLocation[location] = (stats.logsByLocation[location] || 0) + 1;
    });

    return stats;
  },
});

// Get team members for a supervisor
export const getTeamMembers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userRole = await getUserRole(ctx, userId);
    if (!userRole || !["admin", "supervisor"].includes(userRole.role)) {
      throw new Error("Access denied");
    }

    const userLocations = userRole.locations || [];
    const teamMemberIds = await getTeamMemberIds(ctx, userLocations);

    const users = await ctx.db.query("users").collect();
    const roles = await ctx.db.query("roles").collect();

    return teamMemberIds.map((memberId: Id<"users">) => {
      const user = users.find(u => u._id === memberId);
      const role = roles.find(r => r.userId === memberId);
      
      return {
        id: memberId,
        name: user?.name || user?.email || "Unknown User",
        email: user?.email,
        role: role?.role || "unknown",
        locations: role?.locations || [],
      };
    }).filter((member: any) => member.name !== "Unknown User");
  },
});

// Get all employees (admin only)
export const getAllEmployees = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userRole = await getUserRole(ctx, userId);
    if (!userRole || userRole.role !== "admin") {
      throw new Error("Admin access required");
    }

    const users = await ctx.db.query("users").collect();
    const roles = await ctx.db.query("roles").collect();

    return users.map(user => {
      const role = roles.find(r => r.userId === user._id);
      return {
        id: user._id,
        name: user.name || user.email || "Unknown User",
        email: user.email,
        role: role?.role || "unknown",
        locations: role?.locations || [],
      };
    });
  },
});

// Get managed locations for supervisor
export const getManagedLocations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userRole = await getUserRole(ctx, userId);
    if (!userRole) throw new Error("Access denied");

    return userRole.locations || [];
  },
});

// Get team shift summary - AGGREGATED
export const getTeamShiftSummary = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userRole = await getUserRole(ctx, userId);
    if (!userRole || !["admin", "supervisor"].includes(userRole.role)) {
      throw new Error("Access denied");
    }

    const userLocations = userRole.locations || [];
    const teamMemberIds = await getTeamMemberIds(ctx, userLocations);

    let shifts = await ctx.db.query("shifts").collect();
    
    // Filter by team members
    shifts = shifts.filter(shift => teamMemberIds.includes(shift.userId));
    
    // Filter by date range
    if (args.dateFrom || args.dateTo) {
      shifts = shifts.filter(shift => {
        const shiftDate = shift.clockInTime;
        if (args.dateFrom && shiftDate < args.dateFrom) return false;
        if (args.dateTo && shiftDate > args.dateTo) return false;
        return true;
      });
    }

    // Only count completed shifts for accurate hours
    const completedShifts = shifts.filter(shift => shift.clockOutTime);

    const users = await ctx.db.query("users").collect();

    // Aggregate by staff member
    const staffMap = new Map();

    completedShifts.forEach(shift => {
      const user = users.find(u => u._id === shift.userId);
      const staffId = shift.userId;
      const staffName = user?.name || user?.email || "Unknown User";
      const duration = shift.clockOutTime! - shift.clockInTime;
      const hours = duration / (1000 * 60 * 60);

      if (staffMap.has(staffId)) {
        const existing = staffMap.get(staffId);
        existing.totalHours += hours;
        existing.shiftCount += 1;
      } else {
        staffMap.set(staffId, {
          staffId,
          staffName,
          totalHours: hours,
          shiftCount: 1,
        });
      }
    });

    return Array.from(staffMap.values()).sort((a: any, b: any) => b.totalHours - a.totalHours);
  },
});

// Get all employee shift summary (admin only) - AGGREGATED
export const getAllEmployeeShiftSummary = query({
  args: {
    dateFrom: v.number(),
    dateTo: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userRole = await getUserRole(ctx, userId);
    if (!userRole || userRole.role !== "admin") {
      throw new Error("Admin access required");
    }

    let shifts = await ctx.db.query("shifts").collect();
    
    // Filter by date range
    shifts = shifts.filter(shift => {
      const shiftDate = shift.clockInTime;
      return shiftDate >= args.dateFrom && shiftDate <= args.dateTo;
    });

    // Only count completed shifts for accurate hours
    const completedShifts = shifts.filter(shift => shift.clockOutTime);

    const users = await ctx.db.query("users").collect();

    // Aggregate by staff member
    const staffMap = new Map();

    completedShifts.forEach(shift => {
      const user = users.find(u => u._id === shift.userId);
      const staffId = shift.userId;
      const staffName = user?.name || user?.email || "Unknown User";
      const duration = shift.clockOutTime! - shift.clockInTime;
      const hours = duration / (1000 * 60 * 60);

      if (staffMap.has(staffId)) {
        const existing = staffMap.get(staffId);
        existing.totalHours += hours;
        existing.shiftCount += 1;
      } else {
        staffMap.set(staffId, {
          staffId,
          staffName,
          totalHours: hours,
          shiftCount: 1,
        });
      }
    });

    return Array.from(staffMap.values()).sort((a: any, b: any) => b.totalHours - a.totalHours);
  },
});
