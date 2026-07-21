// ════════════════════════════════════════════════════════════════════════════
//  METRICS — Prometheus instrumentation
//
//  Exposes GET /metrics in the Prometheus text exposition format, scraped by
//  the `prometheus` container (see monitoring/prometheus.yml) and visualized
//  in Grafana. Two layers:
//    1. prom-client's default metrics (process CPU/memory, event loop lag,
//       GC pauses, active handles) — free, just needs collectDefaultMetrics().
//    2. Custom HTTP metrics recorded per-request by httpMetrics middleware:
//       request counter and duration histogram, labeled by method/route/status.
//
//  Route label uses req.route?.path (the matched Express pattern, e.g.
//  "/vibes/:id") rather than req.path/req.originalUrl — using the raw URL
//  would create a new time series per unique ID ever requested, which is
//  exactly the "high cardinality" mistake that makes Prometheus fall over.
// ════════════════════════════════════════════════════════════════════════════
import { Request, Response, NextFunction, RequestHandler } from "express";
import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: "vylapp_" });

const httpRequestDuration = new client.Histogram({
  name: "vylapp_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const httpRequestTotal = new client.Counter({
  name: "vylapp_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

const httpErrorsTotal = new client.Counter({
  name: "vylapp_http_errors_total",
  help: "Total HTTP responses with status >= 500",
  labelNames: ["method", "route"],
  registers: [register],
});

function httpMetrics(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/metrics") return next();
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const route = req.route?.path
      ? `${req.baseUrl}${req.route.path}`
      : req.baseUrl || req.path;
    const status = String(res.statusCode);
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;

    httpRequestDuration.observe({ method: req.method, route, status }, seconds);
    httpRequestTotal.inc({ method: req.method, route, status });
    if (res.statusCode >= 500) httpErrorsTotal.inc({ method: req.method, route });
  });

  next();
}

// ── GET /metrics — Prometheus scrape target ───────────────────────────────
const metricsHandler: RequestHandler = async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
};

export = { httpMetrics, metricsHandler, register };
