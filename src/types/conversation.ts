import { redis } from "../redis";

// ─── Employee form ───

export interface EmployeeFormData {
  fullName?: string;
  position?: string;
  phone?: string | null;
  monthlySalary?: string; // BigInt as string for Redis serialization
}

// ─── Finance form ───

export interface FinanceFormData {
  type?: "advance" | "bonus" | "expense" | "payment";
  employeeId?: number;
  employeeName?: string;
  objectId?: number;
  objectName?: string;
  amount?: string; // BigInt as string for Redis
  description?: string;
}

// ─── Object form ───

export interface ObjectFormData {
  name?: string;
  clientName?: string;
  contractAmount?: string; // BigInt as string for Redis
  address?: string | null;
}

// ─── Attendance form ───

export interface AttendanceFormData {
  targetDate?: string; // yyyy-mm-dd
  employeeId?: number;
  employeeName?: string;
}

// ─── Settings form ───

export interface SettingsFormData {
  newLimitPct?: number;
}

// ─── Admin form ───

export interface AdminFormData {
  telegramId?: string;
  fullName?: string;
  phone?: string | null;
}

// ─── Union state ───

export type ConversationState =
  | {
      module: "employee";
      step: "name" | "position" | "phone" | "salary" | "confirm";
      data: EmployeeFormData;
    }
  | {
      module: "finance";
      step: "amount" | "description" | "confirm";
      data: FinanceFormData;
    }
  | {
      module: "object";
      step: "name" | "client" | "amount" | "address" | "confirm";
      data: ObjectFormData;
    }
  | {
      module: "attendance";
      step: "date" | "note";
      data: AttendanceFormData;
    }
  | {
      module: "settings";
      step: "new_limit";
      data: SettingsFormData;
    }
  | {
      module: "admin";
      step: "telegram_id" | "name" | "phone" | "confirm";
      data: AdminFormData;
    };

// ─── Redis helpers ───

const CONV_TTL = 3600; // 1 hour

function convKey(telegramId: number): string {
  return `conv:${telegramId}`;
}

export async function getConversation(
  telegramId: number
): Promise<ConversationState | null> {
  const raw = await redis.get(convKey(telegramId));
  if (!raw) return null;
  return JSON.parse(raw) as ConversationState;
}

export async function setConversation(
  telegramId: number,
  state: ConversationState
): Promise<void> {
  await redis.set(convKey(telegramId), JSON.stringify(state), "EX", CONV_TTL);
}

export async function clearConversation(
  telegramId: number
): Promise<void> {
  await redis.del(convKey(telegramId));
}
