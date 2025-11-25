import Router from "@koa/router";
import { ROLE } from "../entity/user";
import { OwnedDaemon } from "../entity/entity_interface";
import permission from "../middleware/permission";
import validator from "../middleware/validator";
import { getUserUuid } from "../service/passport_service";
import userSystem from "../service/user_service";
import RemoteServiceSubsystem from "../service/remote_service";
import { logger } from "../service/log";
import { operationLogger } from "../service/operation_logger";
import RemoteRequest from "../service/remote_command";
import { $t } from "../i18n";

const router = new Router({ prefix: "/owned_daemons" });

// [Admin Permission]
// Assign a daemon to a user with instance limit
router.post(
  "/assign",
  permission({ level: ROLE.ADMIN }),
  validator({
    body: {
      userUuid: String,
      daemonId: String,
      instanceLimit: Number,
      ramLimitMB: Number
    }
  }),
  async (ctx) => {
    try {
      const { userUuid, daemonId, instanceLimit, ramLimitMB } = ctx.request.body;
      const adminUuid = getUserUuid(ctx);
      const adminUser = userSystem.getInstance(adminUuid);

      if (!adminUser) throw new Error("Admin user not found");

      const user = userSystem.getInstance(userUuid);
      if (!user) throw new Error("User not found");

      const daemon = RemoteServiceSubsystem.getInstance(daemonId);
      if (!daemon) throw new Error("Daemon not found");

      // Check if daemon is already assigned
      if (!user.ownedDaemons) user.ownedDaemons = [];

      const existingIndex = user.ownedDaemons.findIndex((od) => od.daemonId === daemonId);
      if (existingIndex !== -1) {
        throw new Error("Daemon already assigned to this user");
      }

      // Add owned daemon
      const ownedDaemon: OwnedDaemon = {
        daemonId,
        daemonName: daemon.config.remarks || `${daemon.config.ip}:${daemon.config.port}`,
        instanceLimit,
        ramLimitMB: ramLimitMB || -1,
        assignedBy: adminUuid,
        assignedAt: new Date().toISOString()
      };

      user.ownedDaemons.push(ownedDaemon);

      await userSystem.edit(userUuid, { ownedDaemons: user.ownedDaemons });

      operationLogger.log(
        "owned_daemon_assign",
        {
          operator_ip: ctx.ip,
          operator_name: ctx.session?.["userName"],
          target_user: user.userName,
          daemon_id: daemonId,
          instance_limit: instanceLimit
        },
        "info",
        false
      );

      logger.info(
        `[OwnedDaemon] Admin ${adminUser.userName} assigned daemon ${daemonId} to user ${user.userName} with limit ${instanceLimit} instances, ${ramLimitMB}MB RAM`
      );

      ctx.body = { success: true, ownedDaemon };
    } catch (err: any) {
      logger.error(`[OwnedDaemon] Failed to assign daemon: ${err.message}`);
      ctx.body = { success: false, error: err.message };
    }
  }
);

// [Admin Permission]
// Update instance limit for an owned daemon
router.put(
  "/update",
  permission({ level: ROLE.ADMIN }),
  validator({
    body: {
      userUuid: String,
      daemonId: String,
      instanceLimit: Number,
      ramLimitMB: Number
    }
  }),
  async (ctx) => {
    try {
      const { userUuid, daemonId, instanceLimit, ramLimitMB } = ctx.request.body;
      const adminUuid = getUserUuid(ctx);

      const user = userSystem.getInstance(userUuid);
      if (!user) throw new Error("User not found");

      if (!user.ownedDaemons || user.ownedDaemons.length === 0) {
        throw new Error("User has no owned daemons");
      }

      const ownedDaemon = user.ownedDaemons.find((od) => od.daemonId === daemonId);
      if (!ownedDaemon) {
        throw new Error("Daemon not assigned to this user");
      }

      ownedDaemon.instanceLimit = instanceLimit;
      if (ramLimitMB !== undefined) {
        ownedDaemon.ramLimitMB = ramLimitMB;
      }

      await userSystem.edit(userUuid, { ownedDaemons: user.ownedDaemons });

      operationLogger.log(
        "owned_daemon_update_limit",
        {
          operator_ip: ctx.ip,
          operator_name: ctx.session?.["userName"],
          target_user: user.userName,
          daemon_id: daemonId,
          instance_limit: instanceLimit
        },
        "info",
        false
      );

      logger.info(
        `[OwnedDaemon] Updated daemon ${daemonId} limit to ${instanceLimit} for user ${user.userName}`
      );

      ctx.body = { success: true, ownedDaemon };
    } catch (err: any) {
      logger.error(`[OwnedDaemon] Failed to update daemon limit: ${err.message}`);
      ctx.body = { success: false, error: err.message };
    }
  }
);

// [Admin Permission]
// Remove a daemon from a user
router.delete(
  "/remove",
  permission({ level: ROLE.ADMIN }),
  validator({
    body: {
      userUuid: String,
      daemonId: String
    }
  }),
  async (ctx) => {
    try {
      const { userUuid, daemonId } = ctx.request.body;
      const adminUuid = getUserUuid(ctx);

      const user = userSystem.getInstance(userUuid);
      if (!user) throw new Error("User not found");

      if (!user.ownedDaemons || user.ownedDaemons.length === 0) {
        throw new Error("User has no owned daemons");
      }

      const initialLength = user.ownedDaemons.length;
      user.ownedDaemons = user.ownedDaemons.filter((od) => od.daemonId !== daemonId);

      if (user.ownedDaemons.length === initialLength) {
        throw new Error("Daemon not assigned to this user");
      }

      await userSystem.edit(userUuid, { ownedDaemons: user.ownedDaemons });

      operationLogger.log(
        "owned_daemon_remove",
        {
          operator_ip: ctx.ip,
          operator_name: ctx.session?.["userName"],
          target_user: user.userName,
          daemon_id: daemonId
        },
        "warning",
        false
      );

      logger.info(
        `[OwnedDaemon] Removed daemon ${daemonId} from user ${user.userName}`
      );

      ctx.body = { success: true };
    } catch (err: any) {
      logger.error(`[OwnedDaemon] Failed to remove daemon: ${err.message}`);
      ctx.body = { success: false, error: err.message };
    }
  }
);

// [Admin Permission]
// Get all users with owned daemons
router.get("/users_with_owned_daemons", permission({ level: ROLE.ADMIN }), async (ctx) => {
  try {
    const usersWithOwnedDaemons: any[] = [];

    for (const [uuid, user] of userSystem.objects) {
      if (user.ownedDaemons && user.ownedDaemons.length > 0) {
        // Count instances per daemon for this user
        const ownedDaemonsWithCounts = await Promise.all(
          user.ownedDaemons.map(async (od) => {
            const instanceCount = user.instances.filter(
              (inst) => inst.daemonId === od.daemonId
            ).length;

            return {
              ...od,
              instanceCount
            };
          })
        );

        usersWithOwnedDaemons.push({
          uuid: user.uuid,
          userName: user.userName,
          email: user.email,
          ownedDaemons: ownedDaemonsWithCounts
        });
      }
    }

    ctx.body = { success: true, users: usersWithOwnedDaemons };
  } catch (err: any) {
    logger.error(`[OwnedDaemon] Failed to list users with owned daemons: ${err.message}`);
    ctx.body = { success: false, error: err.message };
  }
});

// [User Permission]
// Get current user's owned daemons
router.get("/my_daemons", permission({ level: ROLE.USER }), async (ctx) => {
  try {
    const userUuid = getUserUuid(ctx);
    const user = userSystem.getInstance(userUuid);

    if (!user) throw new Error("User not found");

    if (!user.ownedDaemons || user.ownedDaemons.length === 0) {
      ctx.body = { success: true, ownedDaemons: [] };
      return;
    }

    // Get daemon info and instance counts
    const ownedDaemonsWithInfo = await Promise.all(
      user.ownedDaemons.map(async (od) => {
        const daemon = RemoteServiceSubsystem.getInstance(od.daemonId);
        const userInstancesOnDaemon = user.instances.filter(
          (inst) => inst.daemonId === od.daemonId
        );
        const instanceCount = userInstancesOnDaemon.length;

        // Calculate total RAM allocated by this user on this daemon
        const ramAllocatedMB = userInstancesOnDaemon.reduce(
          (total, inst) => total + (inst.ramAllocatedMB || 0),
          0
        );

        // Get daemon system info if available
        let systemInfo: any = null;
        let totalNodeRamMB = 0;
        let availableRamMB = 0;

        if (daemon && daemon.available) {
          try {
            systemInfo = await new RemoteRequest(daemon).request("info/overview");
            if (systemInfo && systemInfo.system) {
              // Total RAM on node
              totalNodeRamMB = Math.floor(systemInfo.system.totalmem / (1024 * 1024));
              // Available = Total - 1GB buffer - already allocated by user
              const bufferMB = 1024; // 1GB buffer
              const userLimitMB = od.ramLimitMB === -1 ? totalNodeRamMB - bufferMB : od.ramLimitMB;
              availableRamMB = Math.max(0, userLimitMB - ramAllocatedMB);
            }
          } catch (err) {
            // Daemon might be offline, continue without system info
          }
        }

        return {
          ...od,
          instanceCount,
          ramAllocatedMB,
          availableRamMB,
          totalNodeRamMB,
          available: daemon?.available || false,
          status: daemon?.available ? "online" : "offline",
          ip: daemon?.config.ip,
          port: daemon?.config.port,
          systemInfo
        };
      })
    );

    ctx.body = { success: true, ownedDaemons: ownedDaemonsWithInfo };
  } catch (err: any) {
    logger.error(`[OwnedDaemon] Failed to get user's owned daemons: ${err.message}`);
    ctx.body = { success: false, error: err.message };
  }
});

// [User Permission]
// Create instance on owned daemon
router.post(
  "/create_instance",
  permission({ level: ROLE.USER }),
  validator({
    body: {
      daemonId: String,
      config: Object,
      ramAllocatedMB: Number
    }
  }),
  async (ctx) => {
    try {
      const userUuid = getUserUuid(ctx);
      const user = userSystem.getInstance(userUuid);

      if (!user) throw new Error("User not found");

      const { daemonId, config, ramAllocatedMB } = ctx.request.body;

      // Check if user owns this daemon
      if (!user.ownedDaemons || user.ownedDaemons.length === 0) {
        throw new Error("You don't own any daemons");
      }

      const ownedDaemon = user.ownedDaemons.find((od) => od.daemonId === daemonId);
      if (!ownedDaemon) {
        throw new Error("You don't have access to this daemon");
      }

      // Check instance limit
      const userInstancesOnDaemon = user.instances.filter(
        (inst) => inst.daemonId === daemonId
      );
      const currentInstanceCount = userInstancesOnDaemon.length;

      if (ownedDaemon.instanceLimit !== -1 && currentInstanceCount >= ownedDaemon.instanceLimit) {
        throw new Error(
          `Instance limit reached (${currentInstanceCount}/${ownedDaemon.instanceLimit})`
        );
      }

      // Check RAM limit
      if (ramAllocatedMB && ramAllocatedMB > 0) {
        const currentRamAllocated = userInstancesOnDaemon.reduce(
          (total, inst) => total + (inst.ramAllocatedMB || 0),
          0
        );

        // Get daemon system info to calculate available RAM
        const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
        if (!remoteService || !remoteService.available) {
          throw new Error("Daemon is not available");
        }

        try {
          const systemInfo = await new RemoteRequest(remoteService).request("info/overview");
          if (systemInfo && systemInfo.system) {
            const totalNodeRamMB = Math.floor(systemInfo.system.totalmem / (1024 * 1024));
            const bufferMB = 1024; // 1GB buffer
            const userLimitMB = ownedDaemon.ramLimitMB === -1 ? totalNodeRamMB - bufferMB : ownedDaemon.ramLimitMB;
            const availableRamMB = userLimitMB - currentRamAllocated;

            if (ramAllocatedMB > availableRamMB) {
              throw new Error(
                `Not enough RAM available. Requested: ${ramAllocatedMB}MB, Available: ${availableRamMB}MB`
              );
            }
          }
        } catch (err: any) {
          if (err.message.includes("Not enough RAM")) {
            throw err;
          }
          // Continue if we can't get system info
        }
      }

      // Apply RAM limit to Docker instances
      if (ramAllocatedMB && ramAllocatedMB > 0 && config.processType === "docker") {
        if (!config.docker) {
          config.docker = {};
        }
        // Set Docker memory limit (in MB)
        config.docker.memory = ramAllocatedMB;
        logger.info(
          `[OwnedDaemon] Setting Docker memory limit to ${ramAllocatedMB}MB for instance`
        );
      }

      // Create instance on daemon
      const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
      if (!remoteService || !remoteService.available) {
        throw new Error("Daemon is not available");
      }

      const result = await new RemoteRequest(remoteService).request("instance/new", config);

      // Add instance to user with RAM allocation and full permissions
      user.instances.push({
        instanceUuid: result.instanceUuid,
        daemonId,
        ramAllocatedMB: ramAllocatedMB || 0,
        permissions: {
          canUploadFiles: true,
          canDownloadFiles: true,
          canDeleteFiles: true,
          canModifyFiles: true,
          canAccessConsole: true,
          canStartInstances: true,
          canRestartInstances: true,
          canStopInstances: true,
          canTerminateInstances: true,
          canViewLogs: true,
          canAccessConfigFiles: true,
          canAccessFileManager: true,
          canAccessMinecraftQuery: true,
          canAccessTerminalSettings: true,
          canAccessScheduledTasks: true,
          canAccessEventTasks: true,
          canAccessInstanceSettings: true,
          canAccessServerMarket: true,
          disableRightClick: false,
          disableKeyboardShortcuts: false,
          disableTextSelection: false,
          disableCopy: false,
          disablePaste: false
        }
      });

      await userSystem.edit(userUuid, { instances: user.instances });

      operationLogger.log(
        "owned_daemon_create_instance",
        {
          daemon_id: daemonId,
          instance_id: result.instanceUuid,
          operator_ip: ctx.ip,
          operator_name: ctx.session?.["userName"],
          instance_name: result.nickname
        },
        "info",
        false
      );

      logger.info(
        `[OwnedDaemon] User ${user.userName} created instance ${result.instanceUuid} on owned daemon ${daemonId} with ${ramAllocatedMB}MB RAM`
      );

      ctx.body = {
        success: true,
        instance: {
          instanceUuid: result.instanceUuid,
          daemonId,
          nickname: result.nickname,
          ramAllocatedMB
        }
      };
    } catch (err: any) {
      logger.error(`[OwnedDaemon] Failed to create instance on owned daemon: ${err.message}`);
      ctx.body = { success: false, error: err.message };
    }
  }
);

export default router;
