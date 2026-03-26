import { Prorab } from "@prisma/client";
import { Context } from "grammy";
import { prisma } from "../db";

export async function getProrab(telegramId: number): Promise<Prorab | null> {
  return prisma.prorab.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });
}

export async function requireProrab(ctx: Context): Promise<Prorab | null> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return null;

  const prorab = await getProrab(telegramId);

  if (!prorab) {
    await ctx.reply("Avval /start buyrug'ini yuboring.");
    return null;
  }

  if (!prorab.approved) {
    await ctx.reply("⏳ Sizning hisobingiz hali admin tomonidan tasdiqlanmagan. Kuting.");
    return null;
  }

  return prorab;
}
