import Koa from "koa";
import Router from "@koa/router";
import { metrics } from "../service/metrics_service";

const router = new Router({ prefix: "/metrics" });

// Prometheus metrics endpoint
router.get("/", async (ctx: Koa.ParameterizedContext) => {
  ctx.set("Content-Type", metrics.getContentType());
  ctx.body = await metrics.getMetrics();
});

export default router;
