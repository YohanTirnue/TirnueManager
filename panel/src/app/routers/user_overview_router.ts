import Koa from "koa";
import Router from "@koa/router";
import permission from "../middleware/permission";
import userSystem from "../service/user_service";
import subUserService from "../service/sub_user_service";
import { ICompleteUser } from "../entity/entity_interface";
import { $t } from "../i18n";
import { ROLE } from "../entity/user";

const router = new Router({ prefix: "/auth" });

// [Top-level Permission]
router.put("/", permission({ level: ROLE.MODERATOR }), async (ctx: Koa.ParameterizedContext) => {
  const { uuid, config } = ctx.request.body;
  const { passWord } = config;
  if (passWord && !userSystem.validatePassword(passWord))
    throw new Error($t("TXT_CODE_router.user.passwordCheck"));
  try {
    // If the administrator resets the user's password, 2FA is automatically turned off.
    if (passWord) {
      config.secret = "";
      config.open2FA = false;
    }

    // Track instance changes for sub-user cleanup
    if (config.instances) {
      const user = userSystem.getInstance(uuid);
      if (user) {
        // Find instances that were removed
        const oldInstances = user.instances || [];
        const newInstances = config.instances || [];

        for (const oldInst of oldInstances) {
          const stillHasInstance = newInstances.some(
            (newInst: any) =>
              newInst.instanceUuid === oldInst.instanceUuid &&
              newInst.daemonId === oldInst.daemonId
          );
          if (!stillHasInstance) {
            // User lost access to this instance, cleanup their sub-users for it
            await subUserService.handleParentInstanceRemoval(
              uuid,
              oldInst.instanceUuid,
              oldInst.daemonId
            );
          }
        }
      }
    }

    await userSystem.edit(uuid, config);
    ctx.body = true;
  } catch (error: any) {
    ctx.throw(500, error.message);
  }
});

// [Top-level Permission]
router.get(
  "/overview",
  permission({ level: ROLE.MODERATOR }),
  async (ctx: Koa.ParameterizedContext) => {
    const users: Array<ICompleteUser> = [];
    userSystem.objects.forEach((user) => {
      users.push({
        uuid: user.uuid,
        userName: user.userName,
        permission: user.permission,
        instances: user.instances,
        loginTime: user.loginTime,
        registerTime: user.loginTime
      });
    });
    ctx.body = users;
  }
);

export default router;
