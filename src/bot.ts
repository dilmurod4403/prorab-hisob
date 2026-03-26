import { Bot } from "grammy";
import { config } from "./config";
import { startHandler } from "./handlers/start";
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

bot.catch((err) => {
  console.error("Bot xatosi:", err.message);
});

// ─── Commands ───
bot.command("start", startHandler);
bot.command("menu", startHandler);
bot.command("xodimlar", employeesCommand);
bot.command("moliya", financeCommand);
bot.command("obyektlar", objectsCommand);
bot.command("davomat", attendanceCommand);
bot.command("sozlamalar", settingsCommand);
bot.command("hisobotlar", reportsCommand);

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

bot.callbackQuery("noop", async (ctx) => {
  await ctx.answerCallbackQuery();
});

// ─── Text handlers (FSM) — must be last ───
bot.on("message:text", employeesTextHandler, financeTextHandler, objectsTextHandler, attendanceTextHandler, settingsTextHandler);
