import Koa from "koa";
import Router from "@koa/router";
import permission from "../middleware/permission";
import userSystem from "../service/user_service";
import subUserService from "../service/sub_user_service";
import { ICompleteUser } from "../entity/entity_interface";
import { $t } from "../i18n";
import { ROLE } from "../entity/user";
import RemoteServiceSubsystem from "../service/remote_service";
import RemoteRequest from "../service/remote_command";
import logger from "../service/log";

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
        const newInstances = config.instances || [];

        // Validate that instances aren't already assigned to other parent users
        for (const newInst of newInstances) {
          // Check all users to see if any other user already owns this instance
          for (const [otherUserUuid, otherUser] of userSystem.objects) {
            // Skip the current user being edited
            if (otherUserUuid === uuid) continue;

            // Check if this other user has the instance in their instances array
            const hasInstance = otherUser.instances?.some(
              (inst: any) =>
                inst.instanceUuid === newInst.instanceUuid &&
                inst.daemonId === newInst.daemonId
            );

            if (hasInstance) {
              // Check if this user is actually a sub-user (not the owner) for this instance
              // by checking if they appear in any other user's subUsers array
              const isSubUser = Array.from(userSystem.objects.values()).some(
                (parentUser) =>
                  parentUser.subUsers?.some(
                    (su) =>
                      su.uuid === otherUserUuid &&
                      su.instanceUuid === newInst.instanceUuid &&
                      su.daemonId === newInst.daemonId
                  )
              );

              // Only block if they're the actual owner, not a sub-user
              if (!isSubUser) {
                ctx.throw(
                  400,
                  `Instance already assigned to user "${otherUser.userName}". Each instance can only have one parent owner.`
                );
                return;
              }
            }
          }
        }

        // Find instances that were removed
        const oldInstances = user.instances || [];

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

        // Apply Docker memory limits for newly assigned instances with ramAllocatedMB
        for (const newInst of newInstances) {
          if (newInst.ramAllocatedMB && newInst.ramAllocatedMB > 0) {
            try {
              // Get the instance config to check if it's a Docker instance
              const remoteService = RemoteServiceSubsystem.getInstance(newInst.daemonId);
              if (!remoteService || !remoteService.available) {
                logger.warn(
                  `[UserOverview] Daemon ${newInst.daemonId} not available to apply Docker memory limit`
                );
                continue;
              }

              const instanceData = await new RemoteRequest(remoteService).request(
                "instance/detail",
                {
                  instanceUuid: newInst.instanceUuid
                }
              );

              if (instanceData && instanceData.config) {
                const isDockerInstance = instanceData.config.processType === "docker";

                if (isDockerInstance) {
                  // Update the Docker memory limit
                  const updatedConfig = {
                    ...instanceData.config,
                    docker: {
                      ...instanceData.config.docker,
                      memory: newInst.ramAllocatedMB
                    }
                  };

                  await new RemoteRequest(remoteService).request("instance/update", {
                    instanceUuid: newInst.instanceUuid,
                    config: updatedConfig
                  });

                  logger.info(
                    `[UserOverview] Applied Docker memory limit of ${newInst.ramAllocatedMB}MB to instance ${newInst.instanceUuid} for user ${uuid}`
                  );
                }
              }
            } catch (error: any) {
              logger.error(
                `[UserOverview] Failed to apply Docker memory limit for instance ${newInst.instanceUuid}: ${error.message}`
              );
              // Don't block the user update if this fails
            }
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
