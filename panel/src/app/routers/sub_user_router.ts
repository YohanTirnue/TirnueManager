import Koa from "koa";
import Router from "@koa/router";
import permission from "../middleware/permission";
import validator from "../middleware/validator";
import { ROLE } from "../entity/user";
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

    const subUsers = subUserService.getSubUsers(
      userUuid,
      String(instanceUuid),
      String(daemonId)
    );

    // Remove sensitive data
    const sanitizedSubUsers = subUsers.map((user) => ({
      uuid: user.uuid,
      userName: user.userName,
      registerTime: user.registerTime,
      loginTime: user.loginTime,
      permissions: user.permissions,
      isSubUser: user.isSubUser,
      parentUserId: user.parentUserId
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

    // Sanitize data
    const sanitizedTeams = teams.map((team) => ({
      parent: {
        uuid: team.parent.uuid,
        userName: team.parent.userName,
        permission: team.parent.permission
      },
      subUsers: team.subUsers.map((user) => ({
        uuid: user.uuid,
        userName: user.userName,
        permissions: user.permissions,
        registerTime: user.registerTime,
        loginTime: user.loginTime
      }))
    }));

    ctx.body = sanitizedTeams;
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
    const { userName, passWord, permissions } = ctx.request.body;

    // Check if user can manage sub-users for this instance
    if (!canManageSubUsersByUuid(userUuid, String(daemonId), String(instanceUuid))) {
      ctx.throw(403, "You do not have permission to manage sub-users for this instance");
    }

    try {
      const subUser = await subUserService.createSubUser(
        userUuid,
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
        operator_name: ctx.session?.["userName"],
        target_user_name: subUser.userName,
        instance_uuid: instanceUuid
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

// Update sub-user permissions
router.put(
  "/:subUserUuid",
  permission({ level: ROLE.USER }),
  validator({ body: { permissions: Object } }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { subUserUuid } = ctx.params;
    const { permissions } = ctx.request.body;

    try {
      await subUserService.updateSubUserPermissions(userUuid, String(subUserUuid), permissions);

      operationLogger.log("sub_user_update", {
        operator_ip: ctx.ip,
        operator_name: ctx.session?.["userName"],
        target_user_uuid: subUserUuid
      });

      ctx.body = { success: true };
    } catch (error: any) {
      ctx.throw(403, error.message);
    }
  }
);

// Delete a sub-user
router.del(
  "/:subUserUuid",
  permission({ level: ROLE.USER }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { subUserUuid } = ctx.params;

    try {
      const subUser = userSystem.getInstance(String(subUserUuid));
      const subUserName = subUser?.userName || "Unknown";

      await subUserService.deleteSubUser(userUuid, String(subUserUuid));

      operationLogger.log(
        "sub_user_delete",
        {
          operator_ip: ctx.ip,
          operator_name: ctx.session?.["userName"],
          target_user_name: subUserName,
          target_user_uuid: subUserUuid
        },
        "warning"
      );

      ctx.body = { success: true };
    } catch (error: any) {
      ctx.throw(403, error.message);
    }
  }
);

// Admin endpoint: Delete sub-user by admin
router.del(
  "/admin/:subUserUuid",
  permission({ level: ROLE.ADMIN }),
  async (ctx: Koa.ParameterizedContext) => {
    const { subUserUuid } = ctx.params;
    const subUser = userSystem.getInstance(String(subUserUuid));

    if (!subUser || !subUser.isSubUser) {
      ctx.throw(404, "Sub-user not found");
    }

    const parentUser = subUser.parentUserId
      ? userSystem.getInstance(subUser.parentUserId)
      : null;

    if (parentUser) {
      await subUserService.deleteSubUser(subUser.parentUserId, String(subUserUuid));
    } else {
      // Orphaned sub-user, delete directly
      await userSystem.deleteInstance(String(subUserUuid));
    }

    operationLogger.log(
      "sub_user_admin_delete",
      {
        operator_ip: ctx.ip,
        operator_name: ctx.session?.["userName"],
        target_user_name: subUser.userName,
        target_user_uuid: subUserUuid
      },
      "warning"
    );

    ctx.body = { success: true };
  }
);

export default router;
