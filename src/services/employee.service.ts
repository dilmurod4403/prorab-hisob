import { Employee } from "@prisma/client";
import { prisma } from "../db";

const PAGE_SIZE = 8;

interface EmployeeListResult {
  employees: Employee[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getEmployees(
  prorabId: number,
  status: string = "active",
  page: number = 1
): Promise<EmployeeListResult> {
  const where = { prorabId, status };
  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.employee.count({ where }),
  ]);

  return {
    employees,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getEmployeeById(
  employeeId: number,
  prorabId: number
): Promise<Employee | null> {
  return prisma.employee.findFirst({
    where: { id: employeeId, prorabId },
  });
}

export async function createEmployee(data: {
  prorabId: number;
  fullName: string;
  position: string;
  phone: string | null;
  monthlySalary: bigint;
}): Promise<Employee> {
  return prisma.employee.create({
    data: {
      prorabId: data.prorabId,
      fullName: data.fullName,
      position: data.position,
      phone: data.phone,
      monthlySalary: data.monthlySalary,
      hiredDate: new Date(),
    },
  });
}

export async function deactivateEmployee(
  employeeId: number,
  prorabId: number
): Promise<Employee | null> {
  const employee = await getEmployeeById(employeeId, prorabId);
  if (!employee) return null;

  return prisma.employee.update({
    where: { id: employeeId },
    data: { status: "inactive" },
  });
}

export async function activateEmployee(
  employeeId: number,
  prorabId: number
): Promise<Employee | null> {
  const employee = await getEmployeeById(employeeId, prorabId);
  if (!employee) return null;

  return prisma.employee.update({
    where: { id: employeeId },
    data: { status: "active" },
  });
}
