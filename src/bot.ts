import { Bot } from "grammy";
import { config } from "./config";
import { startHandler } from "./handlers/start";

export const bot = new Bot(config.botToken);

bot.command("start", startHandler);
bot.command("menu", startHandler);
