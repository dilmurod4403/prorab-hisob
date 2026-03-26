import { Bot } from "grammy";
import { config } from "./config";
import { rateLimitMiddleware } from "./utils/rateLimit";
import { startHandler } from "./handlers/start";
import { adminCommand, adminCallback, adminTextHandler } from "./handlers/admin";
import {
  employeesCommand,
  employeesCallback,
  employeesTextHandler,
} from "./handlers/employees";
import {
  financeCommand,
  financeCallback,
  financeTextHandler,
} from "./handlers/finance";
import {
  objectsCommand,
  objectsCallback,
  objectsTextHandler,
} from "./handlers/objects";
import {
  attendanceCommand,
  attendanceCallback,
  attendanceTextHandler,
} from "./handlers/attendance";
import {
  settingsCommand,
  settingsCallback,
  settingsTextHandler,
} from "./handlers/settings";
import {
  reportsCommand,
  reportsCallback,
} from "./handlers/reports";
import { mainMenuKeyboard } from "./utils/keyboards";

export const bot = new Bot(config.botToken);

bot.catch(async (err) => {
  console.error("Bot xatosi:", err.message);

  const ctx = err.ctx;
  const user = ctx.from;
  const userName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
    : "noma'lum";
  const userId = user?.id || "—";

  const update = ctx.callbackQuery?.data
    ? `callback: ${ctx.callbackQuery.data}`
    : ctx.message?.text
      ? `text: ${ctx.message.text.slice(0, 100)}`
      : "boshqa update";

  const errorMsg = err.error instanceof Error
    ? err.error.message
    : String(err.error);
  const stack = err.error instanceof Error
    ? (err.error.stack || "").split("\n").slice(0, 4).join("\n")
    : "";

  const text =
    `🚨 <b>Bot xatosi!</b>\n\n` +
    `👤 User: ${userName} (${userId})\n` +
    `📩 Amal: ${update}\n\n` +
    `❌ Xato: <code>${errorMsg.slice(0, 500)}</code>\n` +
    (stack ? `\n<pre>${stack.slice(0, 500)}</pre>` : "");

  try {
    await bot.api.sendMessage(config.adminTelegramId.toString(), text, {
      parse_mode: "HTML",
    });
  } catch {
    // Admin'ga xabar yuborib bo'lmadi
  }
});

// ─── Rate limiter ───
bot.use(rateLimitMiddleware);

// ─── Commands ───
bot.command("start", startHandler);
bot.command("menu", startHandler);
bot.command("admin", adminCommand);
bot.command("xodimlar", employeesCommand);
bot.command("moliya", financeCommand);
bot.command("obyektlar", objectsCommand);
bot.command("davomat", attendanceCommand);
bot.command("sozlamalar", settingsCommand);
bot.command("hisobotlar", reportsCommand);

// ─── Admin callbacks ───
bot.callbackQuery(/^adm:/, adminCallback);

// ─── Callback queries ───
bot.callbackQuery("employees", async (ctx) => {
  ctx.callbackQuery.data = "emp:list";
  await employeesCallback(ctx);
});

bot.callbackQuery("finance", async (ctx) => {
  ctx.callbackQuery.data = "fin:menu";
  await financeCallback(ctx);
});

bot.callbackQuery(/^emp:/, employeesCallback);
bot.callbackQuery(/^fin:/, financeCallback);

bot.callbackQuery("objects", async (ctx) => {
  ctx.callbackQuery.data = "obj:list";
  await objectsCallback(ctx);
});

bot.callbackQuery(/^obj:/, objectsCallback);

bot.callbackQuery("attendance", async (ctx) => {
  ctx.callbackQuery.data = "att:menu";
  await attendanceCallback(ctx);
});

bot.callbackQuery(/^att:/, attendanceCallback);

bot.callbackQuery("settings", async (ctx) => {
  ctx.callbackQuery.data = "set:menu";
  await settingsCallback(ctx);
});

bot.callbackQuery(/^set:/, settingsCallback);

bot.callbackQuery("reports", async (ctx) => {
  ctx.callbackQuery.data = "rep:menu";
  await reportsCallback(ctx);
});

bot.callbackQuery(/^rep:/, reportsCallback);

bot.callbackQuery("main_menu", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Asosiy menyu:", {
    reply_markup: mainMenuKeyboard(),
  });
});

// main_menu_fresh — sent as new message (after approval)
bot.callbackQuery("main_menu_fresh", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Asosiy menyu:", {
    reply_markup: mainMenuKeyboard(),
  });
});

bot.callbackQuery("noop", async (ctx) => {
  await ctx.answerCallbackQuery();
});

// ─── Text handlers (FSM) — must be last ───
bot.on("message:text", adminTextHandler, employeesTextHandler, financeTextHandler, objectsTextHandler, attendanceTextHandler, settingsTextHandler);
