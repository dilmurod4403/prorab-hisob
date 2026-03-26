import { Transaction } from "@prisma/client";
import { prisma } from "../db";

const PAGE_SIZE = 8;

// ─── Current month helper ───

export function currentMonthYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// ─── CRUD ───

interface CreateTransactionData {
  prorabId: number;
  employeeId?: number | null;
  objectId?: number | null;
  type: string;
  amount: bigint;
  description?: string | null;
}

export async function createTransaction(
  data: CreateTransactionData
): Promise<Transaction> {
  return prisma.transaction.create({
    data: {
      prorabId: data.prorabId,
      employeeId: data.employeeId ?? null,
      objectId: data.objectId ?? null,
      type: data.type,
      amount: data.amount,
      description: data.description ?? null,
      txDate: new Date(),
      monthYear: currentMonthYear(),
    },
  });
}

export interface TransactionListResult {
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getTransactions(
  prorabId: number,
  monthYear: string,
  page: number = 1
): Promise<TransactionListResult> {
  const where = { prorabId, monthYear };
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// ─── Avans chegarasi ───

interface AdvanceLimitResult {
  monthlySalary: bigint;
  limitPct: number;
  maxAdvance: bigint;
  currentAdvances: bigint;
  remaining: bigint;
  status: "ok" | "warning" | "over";
}

export async function checkAdvanceLimit(
  employeeId: number,
  prorabId: number,
  newAmount: bigint
): Promise<AdvanceLimitResult> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, prorabId },
    include: { prorab: true },
  });

  if (!employee) {
    throw new Error("Xodim topilmadi");
  }

  const limitPct = employee.prorab.advanceLimitPct;
  const monthlySalary = employee.monthlySalary;
  const maxAdvance = (monthlySalary * BigInt(limitPct)) / BigInt(100);

  const monthYear = currentMonthYear();
  const result = await prisma.transaction.aggregate({
    where: {
      employeeId,
      type: "advance",
      monthYear,
    },
    _sum: { amount: true },
  });

  const currentAdvances = result._sum.amount ?? BigInt(0);
  const totalAfter = currentAdvances + newAmount;
  const remaining = maxAdvance - currentAdvances;

  let status: "ok" | "warning" | "over" = "ok";
  if (totalAfter > maxAdvance) {
    status = "over";
  } else if (totalAfter * BigInt(100) > monthlySalary * BigInt(70)) {
    status = "warning";
  }

  return {
    monthlySalary,
    limitPct,
    maxAdvance,
    currentAdvances,
    remaining,
    status,
  };
}

// ─── Oylik xulosa ───

export interface MonthSummary {
  totalAdvance: bigint;
  totalBonus: bigint;
  totalExpense: bigint;
  totalPayment: bigint;
}

export async function getMonthSummary(
  prorabId: number,
  monthYear: string
): Promise<MonthSummary> {
  const types = ["advance", "bonus", "expense", "payment"] as const;
  const results = await Promise.all(
    types.map((type) =>
      prisma.transaction.aggregate({
        where: { prorabId, monthYear, type },
        _sum: { amount: true },
      })
    )
  );

  return {
    totalAdvance: results[0]._sum.amount ?? BigInt(0),
    totalBonus: results[1]._sum.amount ?? BigInt(0),
    totalExpense: results[2]._sum.amount ?? BigInt(0),
    totalPayment: results[3]._sum.amount ?? BigInt(0),
  };
}

// ─── Xodimlar bo'yicha oylik xulosa ───

export interface EmployeeMonthSummary {
  employeeId: number;
  fullName: string;
  monthlySalary: bigint;
  totalAdvance: bigint;
  totalBonus: bigint;
  balance: bigint; // oylik + bonus - avans
}

export async function getEmployeeMonthSummaries(
  prorabId: number,
  monthYear: string
): Promise<EmployeeMonthSummary[]> {
  const employees = await prisma.employee.findMany({
    where: { prorabId, status: "active" },
    orderBy: { fullName: "asc" },
  });

  if (employees.length === 0) return [];

  const transactions = await prisma.transaction.findMany({
    where: {
      prorabId,
      monthYear,
      employeeId: { in: employees.map((e) => e.id) },
      type: { in: ["advance", "bonus"] },
    },
  });

  const advMap = new Map<number, bigint>();
  const bonMap = new Map<number, bigint>();

  for (const tx of transactions) {
    if (!tx.employeeId) continue;
    if (tx.type === "advance") {
      advMap.set(tx.employeeId, (advMap.get(tx.employeeId) ?? BigInt(0)) + tx.amount);
    } else if (tx.type === "bonus") {
      bonMap.set(tx.employeeId, (bonMap.get(tx.employeeId) ?? BigInt(0)) + tx.amount);
    }
  }

  return employees.map((emp) => {
    const totalAdvance = advMap.get(emp.id) ?? BigInt(0);
    const totalBonus = bonMap.get(emp.id) ?? BigInt(0);
    const balance = emp.monthlySalary + totalBonus - totalAdvance;
    return {
      employeeId: emp.id,
      fullName: emp.fullName,
      monthlySalary: emp.monthlySalary,
      totalAdvance,
      totalBonus,
      balance,
    };
  });
}

// ─── Ob'ekt to'lovlari ───

export async function getObjectPaymentTotal(objectId: number): Promise<bigint> {
  const result = await prisma.transaction.aggregate({
    where: { objectId, type: "payment" },
    _sum: { amount: true },
  });
  return result._sum.amount ?? BigInt(0);
}

// ─── Oy yopilganlik tekshiruvi ───

export async function isMonthClosed(
  prorabId: number,
  monthYear: string
): Promise<boolean> {
  const record = await prisma.monthClose.findUnique({
    where: {
      prorabId_monthYear: { prorabId, monthYear },
    },
  });
  return record !== null;
}
