import Router from "@koa/router";
import { ROLE } from "../entity/user";
import { $t } from "../i18n";
import { speedLimit } from "../middleware/limit";
import permission from "../middleware/permission";
import validator from "../middleware/validator";
import { operationLogger } from "../service/operation_logger";
import { getUserPermission, getUserUuid } from "../service/passport_service";
import { timeUuid } from "../service/password";
import { isHaveInstanceByUuid, isTopPermissionByUuid } from "../service/permission_service";
import RemoteRequest from "../service/remote_command";
import RemoteServiceSubsystem from "../service/remote_service";
import { systemConfig } from "../setting";
import subUserService from "../service/sub_user_service";

const router = new Router({ prefix: "/files" });

router.use(async (ctx, next) => {
  const instanceUuid = String(ctx.query.uuid);
  const daemonId = String(ctx.query.daemonId);
  const userUuid = getUserUuid(ctx);
  if (systemConfig?.canFileManager === false && getUserPermission(ctx) < 10) {
    ctx.status = 403;
    ctx.body = new Error($t("TXT_CODE_router.file.off"));
    return;
  }
  if (isHaveInstanceByUuid(userUuid, daemonId, instanceUuid)) {
    // Check sub-user file manager permission
    const subUserEntry = subUserService.getSubUserEntry(userUuid, instanceUuid, daemonId);
    if (subUserEntry && !subUserEntry.permissions?.canAccessFileManager) {
      ctx.status = 403;
      ctx.body = "You do not have permission to access the file manager for this instance";
      return;
    }
    await next();
  } else {
    ctx.status = 403;
    ctx.body = $t("TXT_CODE_permission.forbiddenInstance");
  }
});

router.get(
  "/status",
  permission({ level: ROLE.USER, speedLimit: false }),
  validator({
    query: { daemonId: String, uuid: String }
  }),
  async (ctx) => {
    try {
      const daemonId = String(ctx.query.daemonId);
      const instanceUuid = String(ctx.query.uuid);
      const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
      const result = await new RemoteRequest(remoteService).request("file/status", {
        instanceUuid
      });
      if (!isTopPermissionByUuid(getUserUuid(ctx))) delete result.disk;
      ctx.body = result;
    } catch (err) {
      ctx.body = err;
    }
  }
);

router.get(
  "/list",
  permission({ level: ROLE.USER, speedLimit: false }),
  validator({
    query: { daemonId: String, uuid: String, target: String, page: Number, page_size: Number }
  }),
  async (ctx) => {
    try {
      const target = String(ctx.query.target);
      const daemonId = String(ctx.query.daemonId);
      const instanceUuid = String(ctx.query.uuid);
      const page = Number(ctx.query.page);
      const pageSize = Number(ctx.query.page_size);
      const fileName = String(ctx.query.file_name);
      const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
      const result = await new RemoteRequest(remoteService).request("file/list", {
        instanceUuid,
        target,
        pageSize,
        page,
        fileName
      });
      ctx.body = result;
    } catch (err) {
      ctx.body = err;
    }
  }
);

router.put(
  "/chmod",
  permission({ level: ROLE.USER }),
  speedLimit(3),
  validator({
    query: { daemonId: String, uuid: String },
    body: { target: String, chmod: Number, deep: Boolean }
  }),
  async (ctx) => {
    try {
      const daemonId = String(ctx.query.daemonId);
      const instanceUuid = String(ctx.query.uuid);
      const userUuid = getUserUuid(ctx);

      // Check sub-user modify permission
      const subUserEntry = subUserService.getSubUserEntry(userUuid, instanceUuid, daemonId);
      if (subUserEntry && !subUserEntry.permissions?.canModifyFiles) {
        ctx.status = 403;
        ctx.body = "You do not have permission to modify files for this instance";
        return;
      }

      const target = String(ctx.request.body.target);
      const chmod = Number(ctx.request.body.chmod);
      const deep = Number(ctx.request.body.deep);
      const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
      const result = await new RemoteRequest(remoteService).request("file/chmod", {
        target,
        instanceUuid,
        chmod,
        deep
      });
      const isAdmin = isTopPermissionByUuid(getUserUuid(ctx));
      operationLogger.log("instance_file_chmod", {
        operator_ip: ctx.ip,
        operator_name: ctx.session?.["userName"],
        instance_id: instanceUuid,
        daemon_id: daemonId,
        target,
        chmod
      }, "info", isAdmin);
      ctx.body = result;
    } catch (err) {
      ctx.body = err;
    }
  }
);

router.post(
  "/touch",
  permission({ level: ROLE.USER }),
  speedLimit(3),
  validator({ query: { daemonId: String, uuid: String }, body: { target: String } }),
  async (ctx) => {
    try {
      const daemonId = String(ctx.query.daemonId);
      const instanceUuid = String(ctx.query.uuid);
      const userUuid = getUserUuid(ctx);

      // Check sub-user modify permission
      const subUserEntry = subUserService.getSubUserEntry(userUuid, instanceUuid, daemonId);
      if (subUserEntry && !subUserEntry.permissions?.canModifyFiles) {
        ctx.status = 403;
        ctx.body = "You do not have permission to create files for this instance";
        return;
      }

      const target = String(ctx.request.body.target);
      const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
      const result = await new RemoteRequest(remoteService).request("file/touch", {
        target,
        instanceUuid
      });
      const isAdmin = isTopPermissionByUuid(getUserUuid(ctx));
      operationLogger.log("instance_file_touch", {
        operator_ip: ctx.ip,
        operator_name: ctx.session?.["userName"],
        instance_id: instanceUuid,
        daemon_id: daemonId,
        target
      }, "info", isAdmin);
      ctx.body = result;
    } catch (err) {
      ctx.body = err;
    }
  }
);

router.post(
  "/mkdir",
  permission({ level: ROLE.USER }),
  speedLimit(3),
  validator({ query: { daemonId: String, uuid: String }, body: { target: String } }),
  async (ctx) => {
    try {
      const daemonId = String(ctx.query.daemonId);
      const instanceUuid = String(ctx.query.uuid);
      const userUuid = getUserUuid(ctx);

      // Check sub-user modify permission
      const subUserEntry = subUserService.getSubUserEntry(userUuid, instanceUuid, daemonId);
      if (subUserEntry && !subUserEntry.permissions?.canModifyFiles) {
        ctx.status = 403;
        ctx.body = "You do not have permission to create directories for this instance";
        return;
      }

      const target = String(ctx.request.body.target);
      const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
      const result = await new RemoteRequest(remoteService).request("file/mkdir", {
        target,
        instanceUuid
      });
      const isAdmin = isTopPermissionByUuid(getUserUuid(ctx));
      operationLogger.log("instance_file_mkdir", {
        operator_ip: ctx.ip,
        operator_name: ctx.session?.["userName"],
        instance_id: instanceUuid,
        daemon_id: daemonId,
        target
      }, "info", isAdmin);
      ctx.body = result;
    } catch (err) {
      ctx.body = err;
    }
  }
);

router.put(
  "/",
  speedLimit(1),
  permission({ level: ROLE.USER }),
  validator({ query: { daemonId: String, uuid: String }, body: { target: String } }),
  async (ctx) => {
    try {
      const daemonId = String(ctx.query.daemonId);
      const instanceUuid = String(ctx.query.uuid);
      const userUuid = getUserUuid(ctx);

      // Check sub-user modify permission
      const subUserEntry = subUserService.getSubUserEntry(userUuid, instanceUuid, daemonId);
      if (subUserEntry && !subUserEntry.permissions?.canModifyFiles) {
        ctx.status = 403;
        ctx.body = "You do not have permission to edit files for this instance";
        return;
      }

      const target = String(ctx.request.body.target);
      const text = ctx.request.body.text;
      const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
      const result = await new RemoteRequest(remoteService).request(
        "file/edit",
        {
          instanceUuid,
          target,
          text
        },
        100000
      );
      const isAdmin = isTopPermissionByUuid(getUserUuid(ctx));
      operationLogger.log("instance_file_update", {
        operator_ip: ctx.ip,
        operator_name: ctx.session?.["userName"],
        instance_id: instanceUuid,
        daemon_id: daemonId,
        file: target
      }, "info", isAdmin);
      ctx.body = result;
    } catch (err) {
      ctx.body = err;
    }
  }
);

router.post(
  "/copy",
  permission({ level: ROLE.USER }),
  speedLimit(3),
  validator({ query: { daemonId: String, uuid: String }, body: { targets: Array } }),
  async (ctx) => {
    try {
      const daemonId = String(ctx.query.daemonId);
      const instanceUuid = String(ctx.query.uuid);
      const userUuid = getUserUuid(ctx);

      // Check sub-user modify permission
      const subUserEntry = subUserService.getSubUserEntry(userUuid, instanceUuid, daemonId);
      if (subUserEntry && !subUserEntry.permissions?.canModifyFiles) {
        ctx.status = 403;
        ctx.body = "You do not have permission to copy files for this instance";
        return;
      }

      const targets = ctx.request.body.targets as [];
      const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
      const result = await new RemoteRequest(remoteService).request("file/copy", {
        instanceUuid,
        targets
      });
      const isAdmin = isTopPermissionByUuid(getUserUuid(ctx));
      operationLogger.log("instance_file_copy", {
        operator_ip: ctx.ip,
        operator_name: ctx.session?.["userName"],
        instance_id: instanceUuid,
        daemon_id: daemonId
      }, "info", isAdmin);
      ctx.body = result;
    } catch (err) {
      ctx.body = err;
    }
  }
);

router.put(
  "/move",
  speedLimit(3),
  permission({ level: ROLE.USER }),
  validator({ query: { daemonId: String, uuid: String }, body: { targets: Array } }),
  async (ctx) => {
    try {
      const daemonId = String(ctx.query.daemonId);
      const instanceUuid = String(ctx.query.uuid);
      const userUuid = getUserUuid(ctx);

      // Check sub-user modify permission
      const subUserEntry = subUserService.getSubUserEntry(userUuid, instanceUuid, daemonId);
      if (subUserEntry && !subUserEntry.permissions?.canModifyFiles) {
        ctx.status = 403;
        ctx.body = "You do not have permission to move files for this instance";
        return;
      }

      const targets = ctx.request.body.targets as [];
      const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
      const result = await new RemoteRequest(remoteService).request("file/move", {
        instanceUuid,
        targets
      });
      const isAdmin = isTopPermissionByUuid(getUserUuid(ctx));
      operationLogger.log("instance_file_move", {
        operator_ip: ctx.ip,
        operator_name: ctx.session?.["userName"],
        instance_id: instanceUuid,
        daemon_id: daemonId
      }, "info", isAdmin);
      ctx.body = result;
    } catch (err) {
      ctx.body = err;
    }
  }
);

router.delete(
  "/",
  speedLimit(3),
  permission({ level: ROLE.USER }),
  validator({ query: { daemonId: String, uuid: String }, body: { targets: Object } }),
  async (ctx) => {
    try {
      const daemonId = String(ctx.query.daemonId);
      const instanceUuid = ctx.query.uuid;
      const userUuid = getUserUuid(ctx);

      // Check sub-user delete permission
      const subUserEntry = subUserService.getSubUserEntry(userUuid, String(instanceUuid), daemonId);
      if (subUserEntry && !subUserEntry.permissions?.canDeleteFiles) {
        ctx.status = 403;
        ctx.body = "You do not have permission to delete files for this instance";
        return;
      }

      const targets = ctx.request.body.targets;
      const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
      const result = await new RemoteRequest(remoteService).request("file/delete", {
        instanceUuid,
        targets
      });
      const isAdmin = isTopPermissionByUuid(getUserUuid(ctx));
      operationLogger.log("instance_file_delete", {
        operator_ip: ctx.ip,
        operator_name: ctx.session?.["userName"],
        instance_id: String(instanceUuid),
        daemon_id: daemonId,
        file: targets
      }, "info", isAdmin);
      ctx.body = result;
    } catch (err) {
      ctx.body = err;
    }
  }
);

router.post(
  "/compress",
  speedLimit(3),
  permission({ level: ROLE.USER }),
  validator({
    query: { daemonId: String, uuid: String },
    body: { source: String, targets: Object, type: Number, code: String }
  }),
  async (ctx) => {
    try {
      const daemonId = String(ctx.query.daemonId);
      const instanceUuid = String(ctx.query.uuid);
      const userUuid = getUserUuid(ctx);

      // Check sub-user modify permission
      const subUserEntry = subUserService.getSubUserEntry(userUuid, instanceUuid, daemonId);
      if (subUserEntry && !subUserEntry.permissions?.canModifyFiles) {
        ctx.status = 403;
        ctx.body = "You do not have permission to compress files for this instance";
        return;
      }

      const source = String(ctx.request.body.source);
      const targets = ctx.request.body.targets;
      const type = Number(ctx.request.body.type);
      const code = String(ctx.request.body.code);
      const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
      const res = await new RemoteRequest(remoteService).request(
        "file/compress",
        {
          instanceUuid,
          targets,
          source,
          type,
          code
        },
        0
      );
      const isAdmin = isTopPermissionByUuid(getUserUuid(ctx));
      operationLogger.log("instance_file_compress", {
        operator_ip: ctx.ip,
        operator_name: ctx.session?.["userName"],
        instance_id: instanceUuid,
        daemon_id: daemonId,
        source
      }, "info", isAdmin);
      ctx.body = res;
    } catch (err) {
      ctx.body = err;
    }
  }
);

router.all(
  "/download",
  permission({ level: ROLE.USER }),
  speedLimit(3),
  validator({ query: { uuid: String, daemonId: String, file_name: String } }),
  async (ctx) => {
    try {
      const daemonId = String(ctx.query.daemonId);
      const instanceUuid = String(ctx.query.uuid);
      const userUuid = getUserUuid(ctx);

      // Check sub-user download permission
      const subUserEntry = subUserService.getSubUserEntry(userUuid, instanceUuid, daemonId);
      if (subUserEntry && !subUserEntry.permissions?.canDownloadFiles) {
        ctx.status = 403;
        ctx.body = "You do not have permission to download files for this instance";
        return;
      }

      const fileName = String(ctx.query.file_name);
      const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
      if (!remoteService) throw new Error($t("TXT_CODE_dd559000") + ` Daemon ID: ${daemonId}`);
      const addr = remoteService.config.fullAddr;
      const remoteMappings = remoteService.config.getConvertedRemoteMappings();
      const password = timeUuid();
      await new RemoteRequest(remoteService).request("passport/register", {
        name: "download",
        password: password,
        parameter: {
          fileName,
          instanceUuid
        }
      });
      const isAdmin = isTopPermissionByUuid(getUserUuid(ctx));
      operationLogger.log("instance_file_download", {
        operator_ip: ctx.ip,
        operator_name: ctx.session?.["userName"],
        instance_id: instanceUuid,
        daemon_id: daemonId,
        file: fileName
      }, "info", isAdmin);
      ctx.body = {
        password,
        addr,
        remoteMappings
      };
    } catch (err) {
      ctx.body = err;
    }
  }
);

router.all(
  "/upload",
  permission({ level: ROLE.USER }),
  validator({ query: { uuid: String, daemonId: String, upload_dir: String } }),
  async (ctx) => {
    try {
      const daemonId = String(ctx.query.daemonId);
      const instanceUuid = String(ctx.query.uuid);
      const userUuid = getUserUuid(ctx);

      // Check sub-user upload permission
      const subUserEntry = subUserService.getSubUserEntry(userUuid, instanceUuid, daemonId);
      if (subUserEntry && !subUserEntry.permissions?.canUploadFiles) {
        ctx.status = 403;
        ctx.body = "You do not have permission to upload files for this instance";
        return;
      }

      const uploadDir = String(ctx.query.upload_dir);
      const fileName = ctx.query.file_name ? String(ctx.query.file_name) : undefined;
      const remoteService = RemoteServiceSubsystem.getInstance(daemonId);
      if (!remoteService) throw new Error($t("TXT_CODE_dd559000") + ` Daemon ID: ${daemonId}`);
      const addr = remoteService.config.fullAddr;
      const remoteMappings = remoteService.config.getConvertedRemoteMappings();
      const password = timeUuid();
      await new RemoteRequest(remoteService).request("passport/register", {
        name: "upload",
        password: password,
        parameter: {
          uploadDir,
          instanceUuid
        }
      });
      const isAdmin = isTopPermissionByUuid(getUserUuid(ctx));
      operationLogger.log("instance_file_upload", {
        operator_ip: ctx.ip,
        operator_name: ctx.session?.["userName"],
        instance_id: instanceUuid,
        daemon_id: daemonId,
        file: fileName ? `${uploadDir}/${fileName}` : uploadDir
      }, "info", isAdmin);
      ctx.body = {
        password,
        addr,
        remoteMappings,
      };
    } catch (err) {
      ctx.body = err;
    }
  }
);

export default router;
