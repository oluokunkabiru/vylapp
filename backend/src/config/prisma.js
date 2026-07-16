const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const env = require("./env");

const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
  ssl: env.pgSsl ? { rejectUnauthorized: false } : false,
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;
