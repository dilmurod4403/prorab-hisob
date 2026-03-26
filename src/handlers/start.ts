import { CommandContext, Context } from "grammy";
import { prisma } from "../db";
import { config } from "../config";
import { escapeHtml } from "../utils/formatters";
import { mainMenuKeyboard } from "../utils/keyboards";
import { notifyAdminNewUser } from "./admin";

export async function startHandler(ctx: CommandContext<Context>): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  let prorab = await prisma.prorab.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });

  if (!prorab) {
    const fullName = [ctx.from!.first_name, ctx.from!.last_name]
      .filter(Boolean)
      .join(" ");

    // Admin auto-approved
    const isAdmin = BigInt(telegramId) === config.adminTelegramId;

    prorab = await prisma.prorab.create({
      data: {
        telegramId: BigInt(telegramId),
        fullName,
        approved: isAdmin,
      },
    });

    if (isAdmin) {
      await ctx.reply(
        `Assalomu alaykum, ${escapeHtml(prorab.fullName)}! 👋\n\n` +
          `<b>Prorab Hisob-Kitob</b> botiga xush kelibsiz!\n\n` +
          `Siz admin sifatida avtomatik tasdiqlangansiz.`,
        { parse_mode: "HTML", reply_markup: mainMenuKeyboard() }
      );
    } else {
      await ctx.reply(
        `Assalomu alaykum, ${escapeHtml(prorab.fullName)}! 👋\n\n` +
          `<b>Prorab Hisob-Kitob</b> botiga xush kelibsiz!\n\n` +
          `⏳ Sizning so'rovingiz admin tomonidan ko'rib chiqilmoqda.\n` +
          `Tasdiqlangandan so'ng botdan foydalana olasiz.`,
        { parse_mode: "HTML" }
      );
      await notifyAdminNewUser(ctx, fullName, prorab.telegramId);
    }
  } else if (!prorab.approved) {
    await ctx.reply(
      "⏳ Sizning hisobingiz hali admin tomonidan tasdiqlanmagan. Kuting."
    );
  } else {
    await ctx.reply(
      `Salom, ${escapeHtml(prorab.fullName)}! Asosiy menyu:`,
      { reply_markup: mainMenuKeyboard() }
    );
  }
}
