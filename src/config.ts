import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  botToken: required("BOT_TOKEN"),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379/0",
  adminTelegramId: BigInt(required("ADMIN_TELEGRAM_ID")),
  workDaysPerMonth: parseInt(process.env.WORK_DAYS_PER_MONTH || "26", 10),
  advanceLimitPct: parseInt(process.env.ADVANCE_LIMIT_PCT || "80", 10),
  timezone: process.env.TIMEZONE || "Asia/Tashkent",
};
