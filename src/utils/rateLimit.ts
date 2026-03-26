import { Context, NextFunction } from "grammy";
import { redis } from "../redis";

const MAX_REQUESTS = 30; // per window
const WINDOW_SECONDS = 60; // 1 minute

export async function rateLimitMiddleware(
  ctx: Context,
  next: NextFunction
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const key = `rl:${userId}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  if (current > MAX_REQUESTS) {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({
        text: "⏳ Juda ko'p so'rov. Bir oz kuting.",
        show_alert: true,
      });
    } else {
      await ctx.reply("⏳ Juda ko'p so'rov. 1 daqiqa kuting.");
    }
    return;
  }

  return next();
}
