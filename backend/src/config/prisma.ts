import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import env from "./env";

const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
  ssl: env.pgSsl ? { rejectUnauthorized: false } : false,
});

const prisma = new PrismaClient({ adapter });

export = prisma;
