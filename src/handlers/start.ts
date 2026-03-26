import { CommandContext, Context, InlineKeyboard } from "grammy";
import { prisma } from "../db";

const mainMenu = new InlineKeyboard()
  .text("👥 Xodimlar", "employees")
  .text("🏗 Ob'ektlar", "objects")
  .row()
  .text("📋 Davomat", "attendance")
  .text("💰 Moliya", "finance")
  .row()
  .text("📈 Hisobotlar", "reports")
  .text("⚙️ Sozlamalar", "settings");

export async function startHandler(ctx: CommandContext<Context>): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  let prorab = await prisma.prorab.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });

  if (!prorab) {
    const fullName = [ctx.from.first_name, ctx.from.last_name]
      .filter(Boolean)
      .join(" ");

    prorab = await prisma.prorab.create({
      data: {
        telegramId: BigInt(telegramId),
        fullName,
      },
    });

    await ctx.reply(
      `Assalomu alaykum, ${prorab.fullName}! 👋\n\n` +
        `*Prorab Hisob\\-Kitob* botiga xush kelibsiz\\!\n\n` +
        `Bu bot sizga xodimlar maoshi, davomat va ob'ekt ` +
        `hisob\\-kitobini boshqarishda yordam beradi\\.`,
      { parse_mode: "MarkdownV2", reply_markup: mainMenu }
    );
  } else {
    await ctx.reply(`Salom, ${prorab.fullName}! Asosiy menyu:`, {
      reply_markup: mainMenu,
    });
  }
}
