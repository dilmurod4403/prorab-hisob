import { Attendance, Employee } from "@prisma/client";
import { prisma } from "../db";

// ─── Types ───

export interface EmployeeWithAttendance {
  employee: Employee;
  attendance: Attendance | null;
}

export interface MonthlyStatRow {
  employee: Employee;
  fullDays: number;
  halfDays: number;
  absentDays: number;
  totalWorked: number; // full + half*0.5
}

const STATUS_ICONS: Record<string, string> = {
  full: "✅",
  half: "⏰",
  absent_reason: "❌",
  absent: "❌",
};

export function getStatusIcon(status: string | null): string {
  if (!status) return "➖";
  return STATUS_ICONS[status] || "➖";
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "full":
      return "✅ To'la ishchi";
    case "half":
      return "⏰ Yarim kun";
    case "absent_reason":
      return "❌ Yo'q (sababli)";
    case "absent":
      return "❌ Yo'q";
    default:
      return status;
  }
}

// ─── Queries ───

export async function getAttendanceForDate(
  prorabId: number,
  date: Date
): Promise<EmployeeWithAttendance[]> {
  const employees = await prisma.employee.findMany({
    where: { prorabId, status: "active" },
    orderBy: { fullName: "asc" },
  });

  if (employees.length === 0) return [];

  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      workDate: date,
    },
  });

  const attMap = new Map<number, Attendance>();
  for (const att of attendances) {
    attMap.set(att.employeeId, att);
  }

  return employees.map((employee) => ({
    employee,
    attendance: attMap.get(employee.id) || null,
  }));
}

export async function markAttendance(data: {
  employeeId: number;
  workDate: Date;
  status: string;
  note?: string | null;
  objectId?: number | null;
}): Promise<Attendance> {
  return prisma.attendance.upsert({
    where: {
      employeeId_workDate: {
        employeeId: data.employeeId,
        workDate: data.workDate,
      },
    },
    update: {
      status: data.status,
      note: data.note || null,
      objectId: data.objectId || null,
    },
    create: {
      employeeId: data.employeeId,
      workDate: data.workDate,
      status: data.status,
      note: data.note || null,
      objectId: data.objectId || null,
    },
  });
}

export async function getMonthlyStats(
  prorabId: number,
  monthYear: string // "2026-03"
): Promise<MonthlyStatRow[]> {
  const employees = await prisma.employee.findMany({
    where: { prorabId, status: "active" },
    orderBy: { fullName: "asc" },
  });

  if (employees.length === 0) return [];

  const [year, month] = monthYear.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of month

  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      workDate: { gte: startDate, lte: endDate },
    },
  });

  const attByEmployee = new Map<number, Attendance[]>();
  for (const att of attendances) {
    const list = attByEmployee.get(att.employeeId) || [];
    list.push(att);
    attByEmployee.set(att.employeeId, list);
  }

  return employees.map((employee) => {
    const records = attByEmployee.get(employee.id) || [];
    let fullDays = 0;
    let halfDays = 0;
    let absentDays = 0;

    for (const r of records) {
      if (r.status === "full") fullDays++;
      else if (r.status === "half") halfDays++;
      else absentDays++;
    }

    return {
      employee,
      fullDays,
      halfDays,
      absentDays,
      totalWorked: fullDays + halfDays * 0.5,
    };
  });
}

// ─── Helpers ───

export function todayDate(): Date {
  const tz = process.env.TIMEZONE || "Asia/Tashkent";
  const tzNow = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  return new Date(tzNow.getFullYear(), tzNow.getMonth(), tzNow.getDate());
}

export function parseDate(text: string): Date | null {
  // Accept dd.mm.yyyy or dd/mm/yyyy
  const match = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  if (isNaN(date.getTime())) return null;
  // Validate date parts
  if (
    date.getDate() !== parseInt(d) ||
    date.getMonth() !== parseInt(m) - 1 ||
    date.getFullYear() !== parseInt(y)
  ) {
    return null;
  }
  return date;
}

export function formatDateShort(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function dateToString(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentMonthYear(): string {
  const tz = process.env.TIMEZONE || "Asia/Tashkent";
  const tzNow = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const year = tzNow.getFullYear();
  const month = String(tzNow.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
