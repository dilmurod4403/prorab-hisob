import { Object as PrismaObject } from "@prisma/client";
import { prisma } from "../db";

const PAGE_SIZE = 8;

interface ObjectListResult {
  objects: PrismaObject[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getObjects(
  prorabId: number,
  status: string = "active",
  page: number = 1
): Promise<ObjectListResult> {
  const where = { prorabId, status };
  const [objects, total] = await Promise.all([
    prisma.object.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.object.count({ where }),
  ]);

  return {
    objects,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getObjectById(
  objectId: number,
  prorabId: number
): Promise<PrismaObject | null> {
  return prisma.object.findFirst({
    where: { id: objectId, prorabId },
  });
}

export async function createObject(data: {
  prorabId: number;
  name: string;
  clientName: string;
  contractAmount: bigint;
  address: string | null;
}): Promise<PrismaObject> {
  return prisma.object.create({
    data: {
      prorabId: data.prorabId,
      name: data.name,
      clientName: data.clientName,
      contractAmount: data.contractAmount,
      address: data.address,
      startDate: new Date(),
    },
  });
}

export async function updateObjectStatus(
  objectId: number,
  prorabId: number,
  status: string
): Promise<PrismaObject | null> {
  const obj = await getObjectById(objectId, prorabId);
  if (!obj) return null;

  return prisma.object.update({
    where: { id: objectId },
    data: {
      status,
      ...(status === "completed" ? { endDate: new Date() } : {}),
    },
  });
}

// ─── Moliyaviy xulosa ───

export interface ObjectFinanceSummary {
  contractAmount: bigint;
  totalPayments: bigint;
  totalExpenses: bigint;
  totalSalaries: bigint;
  totalBonuses: bigint;
  totalCost: bigint;
  paymentBalance: bigint; // shartnoma - to'langan
  profit: bigint; // shartnoma - jami xarajat
}

export async function getObjectFinanceSummary(
  objectId: number
): Promise<ObjectFinanceSummary> {
  const obj = await prisma.object.findUnique({ where: { id: objectId } });
  if (!obj) throw new Error("Ob'ekt topilmadi");

  const types = ["payment", "expense", "salary", "bonus"] as const;
  const results = await Promise.all(
    types.map((type) =>
      prisma.transaction.aggregate({
        where: { objectId, type },
        _sum: { amount: true },
      })
    )
  );

  const totalPayments = results[0]._sum.amount ?? BigInt(0);
  const totalExpenses = results[1]._sum.amount ?? BigInt(0);
  const totalSalaries = results[2]._sum.amount ?? BigInt(0);
  const totalBonuses = results[3]._sum.amount ?? BigInt(0);

  const totalCost = totalExpenses + totalSalaries + totalBonuses;
  const profit = obj.contractAmount - totalCost;
  const paymentBalance = obj.contractAmount - totalPayments;

  return {
    contractAmount: obj.contractAmount,
    totalPayments,
    totalExpenses,
    totalSalaries,
    totalBonuses,
    totalCost,
    paymentBalance,
    profit,
  };
}
