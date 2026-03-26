import { bot } from "./bot";
import { connectDb, disconnectDb } from "./db";
import { redis, disconnectRedis } from "./redis";

async function main(): Promise<void> {
  await connectDb();

  console.log("Bot ishga tushmoqda...");
  bot.start({
    onStart: (botInfo) => {
      console.log(`Bot @${botInfo.username} ishga tushdi`);
    },
  });
}

async function shutdown(): Promise<void> {
  console.log("Bot to'xtatilmoqda...");
  await bot.stop();
  await disconnectRedis();
  await disconnectDb();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  console.error("Bot xatosi:", err);
  process.exit(1);
});
