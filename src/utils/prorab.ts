import { Prorab } from "@prisma/client";
import { prisma } from "../db";

export async function getProrab(telegramId: number): Promise<Prorab | null> {
  return prisma.prorab.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });
}
