import Koa from "koa";
import Router from "@koa/router";
import permission from "../middleware/permission";
import validator from "../middleware/validator";
import { register } from "../service/passport_service";
import userSystem from "../service/user_service";
import subUserService from "../service/sub_user_service";
import { $t } from "../i18n";
import { ROLE } from "../entity/user";
import { operationLogger } from "../service/operation_logger";
import Storage from "../common/storage/sys_storage";
import { error } from "console";

const router = new Router({ prefix: "/auth" });

// Add user
router.post(
  "/",
  permission({ level: ROLE.ADMIN }),
  validator({ body: { username: String, password: String, permission: Number } }),
  async (ctx: Koa.ParameterizedContext) => {
    const userName = String(ctx.request.body.username);
    const passWord = String(ctx.request.body.password);
    const permission = Number(ctx.request.body.permission);
    const permissions = ctx.request.body.permissions;
    if (!userSystem.validatePassword(passWord))
      throw new Error($t("TXT_CODE_router.user.invalidPassword"));
    if (userSystem.existUserName(userName))
      throw new Error($t("TXT_CODE_router.user.existsUserName"));
    operationLogger.log("user_create", {
      operator_ip: ctx.ip,
      operator_name: ctx.session?.["userName"],
      target_user_name: userName
    });
    const result = await register(ctx, userName, passWord, permission);
    ctx.body = result;
  }
);

// Delete user
router.del("/", permission({ level: ROLE.ADMIN }), async (ctx: Koa.ParameterizedContext) => {
  const uuids = ctx.request.body;
  try {
    for (const iterator of uuids) {
      const user = userSystem.getUserByUuid(iterator);
      operationLogger.log(
        "user_delete",
        {
          operator_ip: ctx.ip,
          operator_name: ctx.session?.["userName"],
          target_user_name: user?.userName || "Unknown"
        },
        "warning"
      );

      // If this user has granted sub-user access, clean up those relationships
      if (user && user.subUsers && user.subUsers.length > 0) {
        for (const subUserRef of user.subUsers) {
          // Remove the instance from the sub-user's instances
          const subUser = userSystem.getInstance(subUserRef.uuid);
          if (subUser) {
            subUser.instances = subUser.instances.filter(
              (inst) => !(inst.instanceUuid === subUserRef.instanceUuid && inst.daemonId === subUserRef.daemonId)
            );
            // Save the sub-user changes
            await Storage.getStorage().store("User", subUserRef.uuid, subUser);
          }
        }
      }

      // If this user is a sub-user of other parents, clean up those references
      for (const [parentUuid, parentUser] of userSystem.objects) {
        const hadEntries = parentUser.subUsers.some((su) => su.uuid === iterator);
        if (hadEntries) {
          parentUser.subUsers = parentUser.subUsers.filter((su) => su.uuid !== iterator);
          await Storage.getStorage().store("User", parentUuid, parentUser);
        }
      }

      await userSystem.deleteInstance(iterator);
    }
    ctx.body = true;
  } catch (error: any) {
    ctx.throw(500, $t("TXT_CODE_router.user.deleteFailure") as string);
  }
});

// User search function
router.get(
  "/search",
  permission({ level: ROLE.ADMIN }),
  validator({ query: { page: Number, page_size: Number } }),
  async (ctx: Koa.ParameterizedContext) => {
    const userName = String(ctx.query.userName);
    const role = String(ctx.query.role);
    const page = Number(ctx.query.page);
    const pageSize = Number(ctx.query.page_size);
    const condition: any = {};
    if (userName) condition["userName"] = `%${userName}%`;
    if (role) condition["permission"] = Number(role);
    let resultPage = userSystem.getQueryWrapper().selectPage(condition, page, pageSize);
    // make a copy, delete redundant
    resultPage = JSON.parse(JSON.stringify(resultPage));
    resultPage.data.forEach((v) => {
      v.passWord = "";
      v.salt = "";
    });
    ctx.body = resultPage;
  }
);

export default router;
