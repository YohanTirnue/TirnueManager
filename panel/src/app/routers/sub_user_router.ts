import Koa from "koa";
import Router from "@koa/router";
import permission from "../middleware/permission";
import validator from "../middleware/validator";
import { ROLE, type User } from "../entity/user";
import { getUserUuid } from "../service/passport_service";
import {
  canManageSubUsersByUuid,
  isTopPermissionByUuid
} from "../service/permission_service";
import subUserService from "../service/sub_user_service";
import userSystem from "../service/user_service";
import { operationLogger } from "../service/operation_logger";
import { $t } from "../i18n";

const router = new Router({ prefix: "/sub-users" });

// Get all sub-users for a specific instance
router.get(
  "/",
  permission({ level: ROLE.USER }),
  validator({ query: { daemonId: String, instanceUuid: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { daemonId, instanceUuid } = ctx.query;

    // Check if user can manage sub-users for this instance
    if (!canManageSubUsersByUuid(userUuid, String(daemonId), String(instanceUuid))) {
      ctx.throw(403, "You do not have permission to manage sub-users for this instance");
    }

    // If admin, get ALL sub-users for this instance from all parents
    // If regular user, get only their own sub-users
    let subUserEntries: Array<{ user: User; permissions: any }>;
    if (isTopPermissionByUuid(userUuid)) {
      const teams = subUserService.getInstanceTeam(String(instanceUuid), String(daemonId));
      // Flatten teams to get all sub-users
      subUserEntries = [];
      for (const team of teams) {
        subUserEntries.push(...team.subUsers);
      }
    } else {
      subUserEntries = subUserService.getSubUsers(
        userUuid,
        String(instanceUuid),
        String(daemonId)
      );
    }

    // Remove sensitive data - permissions are now per-instance
    const sanitizedSubUsers = subUserEntries.map((entry) => ({
      uuid: entry.user.uuid,
      userName: entry.user.userName,
      email: entry.user.email,
      firstName: entry.user.firstName,
      lastName: entry.user.lastName,
      registerTime: entry.user.registerTime,
      loginTime: entry.user.loginTime,
      permissions: entry.permissions // Per-instance permissions
    }));

    ctx.body = sanitizedSubUsers;
  }
);

// Get team structure for an instance (admin only)
router.get(
  "/teams",
  permission({ level: ROLE.ADMIN }),
  validator({ query: { daemonId: String, instanceUuid: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const { daemonId, instanceUuid } = ctx.query;

    const teams = subUserService.getInstanceTeam(String(instanceUuid), String(daemonId));

    // Sanitize data - now includes per-instance permissions
    const sanitizedTeams = teams.map((team) => ({
      parent: {
        uuid: team.parent.uuid,
        userName: team.parent.userName,
        permission: team.parent.permission
      },
      subUsers: team.subUsers.map((entry) => ({
        uuid: entry.user.uuid,
        userName: entry.user.userName,
        email: entry.user.email,
        firstName: entry.user.firstName,
        lastName: entry.user.lastName,
        permissions: entry.permissions, // Per-instance permissions
        registerTime: entry.user.registerTime,
        loginTime: entry.user.loginTime
      }))
    }));

    ctx.body = sanitizedTeams;
  }
);

// Get parent users (owners) who have access to an instance (admin only)
router.get(
  "/parents",
  permission({ level: ROLE.ADMIN }),
  validator({ query: { daemonId: String, instanceUuid: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const { daemonId, instanceUuid } = ctx.query;

    const parentUsers = [];
    for (const [uuid, user] of userSystem.objects) {
      // Check if user is an owner of this instance (not a sub-user for it)
      if (subUserService.isInstanceOwner(uuid, String(instanceUuid), String(daemonId))) {
        parentUsers.push({
          uuid: user.uuid,
          userName: user.userName,
          permission: user.permission
        });
      }
    }

    ctx.body = parentUsers;
  }
);

// Create a sub-user
router.post(
  "/",
  permission({ level: ROLE.USER }),
  validator({
    query: { daemonId: String, instanceUuid: String },
    body: { userName: String, passWord: String }
  }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { daemonId, instanceUuid } = ctx.query;
    const { userName, passWord, permissions, parentUuid } = ctx.request.body;

    // Check if user can manage sub-users for this instance
    if (!canManageSubUsersByUuid(userUuid, String(daemonId), String(instanceUuid))) {
      ctx.throw(403, "You do not have permission to manage sub-users for this instance");
    }

    // Determine the parent: if admin and parentUuid provided, use it; otherwise use current user
    let actualParentUuid = userUuid;
    if (isTopPermissionByUuid(userUuid)) {
      // Admins must specify a parent user
      if (!parentUuid) {
        ctx.throw(400, "Admin must specify parentUuid when creating sub-users");
      }
      actualParentUuid = String(parentUuid);
    }

    try {
      const subUser = await subUserService.createSubUser(
        actualParentUuid,
        String(instanceUuid),
        String(daemonId),
        {
          userName: String(userName),
          passWord: String(passWord),
          permissions
        }
      );

      operationLogger.log("sub_user_create", {
        operator_ip: ctx.ip,
        operator_name: String(ctx.session?.["userName"] || ""),
        target_user_name: subUser.userName,
        instance_uuid: String(instanceUuid)
      });

      ctx.body = {
        uuid: subUser.uuid,
        userName: subUser.userName,
        registerTime: subUser.registerTime,
        permissions: subUser.permissions
      };
    } catch (error: any) {
      ctx.throw(400, error.message);
    }
  }
);

// Update sub-user permissions for a specific instance
router.put(
  "/:subUserUuid",
  permission({ level: ROLE.USER }),
  validator({
    query: { daemonId: String, instanceUuid: String },
    body: { permissions: Object }
  }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { subUserUuid } = ctx.params;
    const { daemonId, instanceUuid } = ctx.query;
    const { permissions } = ctx.request.body;

    const subUser = userSystem.getInstance(String(subUserUuid));
    if (!subUser) {
      ctx.throw(404, "User not found");
      return;
    }

    // Check if this user is a sub-user for this specific instance
    const entry = subUserService.getSubUserEntry(
      String(subUserUuid),
      String(instanceUuid),
      String(daemonId)
    );
    if (!entry) {
      ctx.throw(404, "User is not a sub-user for this instance");
      return;
    }

    // Find the parent for this sub-user entry
    const parent = subUserService.getParentForInstance(
      String(subUserUuid),
      String(instanceUuid),
      String(daemonId)
    );

    // Allow if user is admin OR if user is the parent
    if (!isTopPermissionByUuid(userUuid) && (!parent || parent.uuid !== userUuid)) {
      ctx.throw(403, "You do not have permission to modify this sub-user");
      return;
    }

    try {
      await subUserService.updateSubUserPermissions(
        parent!.uuid,
        String(subUserUuid),
        String(instanceUuid),
        String(daemonId),
        permissions
      );

      operationLogger.log("sub_user_update", {
        operator_ip: ctx.ip,
        operator_name: String(ctx.session?.["userName"] || ""),
        target_user_uuid: subUserUuid,
        instance_uuid: String(instanceUuid)
      });

      ctx.body = { success: true };
    } catch (error: any) {
      ctx.throw(403, error.message);
    }
  }
);

// Remove a sub-user from a specific instance
router.del(
  "/:subUserUuid",
  permission({ level: ROLE.USER }),
  validator({ query: { daemonId: String, instanceUuid: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { subUserUuid } = ctx.params;
    const { daemonId, instanceUuid } = ctx.query;

    const subUser = userSystem.getInstance(String(subUserUuid));
    if (!subUser) {
      ctx.throw(404, "User not found");
      return;
    }

    const subUserName = subUser.userName || "Unknown";

    // Check if this user is a sub-user for this specific instance
    const entry = subUserService.getSubUserEntry(
      String(subUserUuid),
      String(instanceUuid),
      String(daemonId)
    );
    if (!entry) {
      ctx.throw(404, "User is not a sub-user for this instance");
      return;
    }

    // Find the parent for this sub-user entry
    const parent = subUserService.getParentForInstance(
      String(subUserUuid),
      String(instanceUuid),
      String(daemonId)
    );

    // Allow if user is admin OR if user is the parent
    if (!isTopPermissionByUuid(userUuid) && (!parent || parent.uuid !== userUuid)) {
      ctx.throw(403, "You do not have permission to remove this sub-user");
      return;
    }

    try {
      await subUserService.removeSubUserFromInstance(
        parent!.uuid,
        String(subUserUuid),
        String(instanceUuid),
        String(daemonId)
      );

      operationLogger.log(
        "sub_user_delete",
        {
          operator_ip: ctx.ip,
          operator_name: String(ctx.session?.["userName"] || ""),
          target_user_name: subUserName,
          target_user_uuid: subUserUuid,
          instance_uuid: String(instanceUuid)
        },
        "warning"
      );

      ctx.body = { success: true };
    } catch (error: any) {
      ctx.throw(403, error.message);
    }
  }
);

export default router;
