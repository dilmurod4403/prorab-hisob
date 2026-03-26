import { CommandContext, Context } from "grammy";
import { prisma } from "../db";
import { config } from "../config";
import { escapeHtml } from "../utils/formatters";
import { mainMenuKeyboard } from "../utils/keyboards";

export async function startHandler(ctx: CommandContext<Context>): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  // Admin — avtomatik yaratish va tasdiqlash
  const isAdmin = BigInt(telegramId) === config.adminTelegramId;

  let prorab = await prisma.prorab.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });

  if (!prorab && isAdmin) {
    const fullName = [ctx.from!.first_name, ctx.from!.last_name]
      .filter(Boolean)
      .join(" ");

    prorab = await prisma.prorab.create({
      data: {
        telegramId: BigInt(telegramId),
        fullName,
        approved: true,
      },
    });
  }

  if (!prorab || !prorab.approved) {
    await ctx.reply(
      "⛔ Sizga botdan foydalanish huquqi berilmagan.\n\n" +
        "Admin bilan bog'laning."
    );
    return;
  }

  await ctx.reply(
    `Salom, ${escapeHtml(prorab.fullName)}! Asosiy menyu:`,
    { reply_markup: mainMenuKeyboard() }
  );
}
