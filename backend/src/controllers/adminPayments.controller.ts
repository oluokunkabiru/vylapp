import { Response } from "express";
import { AuthedRequest } from "../types/express";
import respond from "../utils/respond";
import prisma from "../config/prisma";
import env from "../config/env";

const { ok, fail } = respond;
const CONFIG_KEY = "payments.providers";
const PROVIDERS = ["stripe", "paystack", "flutterwave", "manual_bank_transfer"] as const;
type Provider = typeof PROVIDERS[number];

function configured(provider: Provider) {
  if (provider === "stripe") return !!env.payments.stripeSecretKey;
  if (provider === "paystack") return !!env.payments.paystackSecretKey;
  if (provider === "flutterwave") return !!env.payments.flutterwaveSecretKey;
  return true;
}

function normalize(value: any) {
  const enabled = Array.isArray(value?.enabled) ? value.enabled.filter((p: unknown): p is Provider => typeof p === "string" && (PROVIDERS as readonly string[]).includes(p)) : [];
  const defaultProvider = enabled.includes(value?.default_provider) ? value.default_provider : enabled[0] || null;
  return { enabled, default_provider: defaultProvider };
}

async function getPaymentSettings(_req: AuthedRequest, res: Response) {
  const row = await prisma.appConfig.findUnique({ where: { key: CONFIG_KEY } });
  const settings = normalize(row?.value);
  return ok(res, {
    settings,
    providers: PROVIDERS.map(id => ({
      id,
      label: id === "manual_bank_transfer" ? "Manual bank transfer" : id[0].toUpperCase() + id.slice(1),
      configured: configured(id),
      enabled: settings.enabled.includes(id),
      default: settings.default_provider === id,
      currencies: id === "paystack" ? ["NGN", "GHS", "ZAR", "KES"] : id === "flutterwave" ? ["NGN", "GHS", "KES", "UGX", "TZS", "ZAR", "USD"] : id === "stripe" ? ["USD", "EUR", "GBP", "NGN"] : ["NGN", "USD"],
    })),
  });
}

async function updatePaymentSettings(req: AuthedRequest, res: Response) {
  const settings = normalize(req.body);
  if (Array.isArray(req.body?.enabled) && !settings.enabled.length) return fail(res, 400, "Select at least one payment method");
  const unavailable = settings.enabled.filter((provider: Provider) => !configured(provider));
  if (unavailable.length) return fail(res, 400, `${unavailable.join(", ")} is not configured on this server`);
  const before = await prisma.appConfig.findUnique({ where: { key: CONFIG_KEY } });
  const row = await prisma.appConfig.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: settings, description: "Enabled payment providers and checkout default. Provider secrets stay in environment variables.", updatedBy: req.user.id },
    update: { value: settings, updatedBy: req.user.id, updatedAt: new Date() },
  });
  await prisma.adminAuditLog.create({ data: { adminId: req.user.id, action: "payments.providers.update", targetType: "app_config:payments.providers", beforeData: before as any, afterData: row as any, ipAddress: req.ip || null } });
  return getPaymentSettings(req, res);
}

export = { getPaymentSettings, updatePaymentSettings };
