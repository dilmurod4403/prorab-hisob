import { CommandContext, Context, CallbackQueryContext, NextFunction } from "grammy";
import { requireProrab, getProrab } from "../utils/prorab";
import { formatMoney, MAX_NAME_LENGTH, MAX_AMOUNT } from "../utils/formatters";
import {
  employeeListKeyboard,
  employeeDetailKeyboard,
  positionKeyboard,
  skipPhoneKeyboard,
  confirmEmployeeKeyboard,
  confirmDeactivateKeyboard,
} from "../utils/keyboards";
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  deactivateEmployee,
  activateEmployee,
} from "../services/employee.service";
import {
  getConversation,
  setConversation,
  clearConversation,
  ConversationState,
} from "../types/conversation";

// ─── Helpers ───

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── /xodimlar command ───

export async function employeesCommand(
  ctx: CommandContext<Context>
): Promise<void> {
  const prorab = await requireProrab(ctx);
  if (!prorab) return;
  await showEmployeeList(ctx, prorab.id, "active", 1);
}

// ─── Callback query router ───

export async function employeesCallback(
  ctx: CallbackQueryContext<Context>
): Promise<void> {
  const prorab = await requireProrab(ctx);
  if (!prorab) return;

  const data = ctx.callbackQuery.data!;
  await ctx.answerCallbackQuery();

  // emp:list / emp:list:{page}
  if (data === "emp:list" || data.startsWith("emp:list:")) {
    const page = data === "emp:list" ? 1 : parseInt(data.split(":")[2], 10);
    await showEmployeeList(ctx, prorab.id, "active", page, true);
    return;
  }

  // emp:inactive / emp:inactive:{page}
  if (data === "emp:inactive" || data.startsWith("emp:inactive:")) {
    const page =
      data === "emp:inactive" ? 1 : parseInt(data.split(":")[2], 10);
    await showEmployeeList(ctx, prorab.id, "inactive", page, true);
    return;
  }

  // emp:detail:{id}
  if (data.startsWith("emp:detail:")) {
    const empId = parseInt(data.split(":")[2], 10);
    await showEmployeeDetail(ctx, empId, prorab.id);
    return;
  }

  // emp:deactivate:{id}
  if (
    data.startsWith("emp:deactivate:") &&
    !data.startsWith("emp:deactivate_yes:")
  ) {
    const empId = parseInt(data.split(":")[2], 10);
    const emp = await getEmployeeById(empId, prorab.id);
    if (!emp) return;
    await ctx.editMessageText(
      `🚫 ${emp.fullName}ni faolsizlashtirmoqchimisiz?`,
      { reply_markup: confirmDeactivateKeyboard(empId) }
    );
    return;
  }

  // emp:deactivate_yes:{id}
  if (data.startsWith("emp:deactivate_yes:")) {
    const empId = parseInt(data.split(":")[2], 10);
    const emp = await deactivateEmployee(empId, prorab.id);
    if (emp) {
      await ctx.editMessageText(
        `✅ ${emp.fullName} faolsizlashtirildi.`,
        { reply_markup: employeeListKeyboard([], 1, 1) }
      );
      // Show refreshed list
      await showEmployeeList(ctx, prorab.id, "active", 1);
    }
    return;
  }

  // emp:activate:{id}
  if (data.startsWith("emp:activate:")) {
    const empId = parseInt(data.split(":")[2], 10);
    const emp = await activateEmployee(empId, prorab.id);
    if (emp) {
      await ctx.reply(`✅ ${emp.fullName} qayta faollashtirildi.`);
      await showEmployeeList(ctx, prorab.id, "active", 1);
    }
    return;
  }

  // ─── Add employee flow (callback parts) ───

  // emp:add — start
  if (data === "emp:add") {
    const telegramId = ctx.from!.id;
    await setConversation(telegramId, {
      module: "employee",
      step: "name",
      data: {},
    });
    await ctx.reply("👤 Xodim ismini kiriting (F.I.O):");
    return;
  }

  // emp:add_pos:{position}
  if (data.startsWith("emp:add_pos:")) {
    const position = data.split(":")[2];
    const telegramId = ctx.from!.id;
    const conv = await getConversation(telegramId);
    if (!conv || conv.step !== "position") return;

    conv.data.position = position;
    conv.step = "phone";
    await setConversation(telegramId, conv);
    await ctx.editMessageText(
      "📞 Telefon raqamini kiriting\n(masalan: +998901234567)\n\nYoki o'tkazib yuboring:",
      { reply_markup: skipPhoneKeyboard() }
    );
    return;
  }

  // emp:add_skip_phone
  if (data === "emp:add_skip_phone") {
    const telegramId = ctx.from!.id;
    const conv = await getConversation(telegramId);
    if (!conv || conv.step !== "phone") return;

    conv.data.phone = null;
    conv.step = "salary";
    await setConversation(telegramId, conv);
    await ctx.editMessageText("💰 Oylik maosh summasini kiriting (so'mda):");
    return;
  }

  // emp:add_save
  if (data === "emp:add_save") {
    const telegramId = ctx.from!.id;
    const conv = await getConversation(telegramId);
    if (!conv || conv.module !== "employee" || conv.step !== "confirm") return;

    const emp = await createEmployee({
      prorabId: prorab.id,
      fullName: conv.data.fullName!,
      position: conv.data.position!,
      phone: conv.data.phone || null,
      monthlySalary: BigInt(conv.data.monthlySalary!),
    });

    await clearConversation(telegramId);
    await ctx.editMessageText(
      `✅ Xodim muvaffaqiyatli qo'shildi!\n\n` +
        `👤 ${emp.fullName}\n` +
        `📋 ${emp.position}\n` +
        `💰 ${formatMoney(emp.monthlySalary)}/oy`
    );
    await showEmployeeList(ctx, prorab.id, "active", 1);
    return;
  }

  // emp:add_cancel
  if (data === "emp:add_cancel") {
    const telegramId = ctx.from!.id;
    await clearConversation(telegramId);
    await ctx.editMessageText("❌ Xodim qo'shish bekor qilindi.");
    await showEmployeeList(ctx, prorab.id, "active", 1);
    return;
  }
}

// ─── Text handler for FSM ───

export async function employeesTextHandler(
  ctx: Context,
  next: NextFunction
): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return next();

  const conv = await getConversation(telegramId);
  if (!conv || conv.module !== "employee") return next();

  const text = ctx.message?.text?.trim() ?? ctx.message?.contact?.phone_number;
  if (!text) return next();

  const prorab = await getProrab(telegramId);
  if (!prorab) return next();

  switch (conv.step) {
    case "name":
      await handleNameStep(ctx, conv, telegramId, text);
      break;
    case "phone":
      await handlePhoneStep(ctx, conv, telegramId, text);
      break;
    case "salary":
      await handleSalaryStep(ctx, conv, telegramId, text, prorab.id);
      break;
    default:
      return next();
  }
}

// ─── FSM step handlers ───

async function handleNameStep(
  ctx: Context,
  conv: ConversationState & { module: "employee" },
  telegramId: number,
  text: string
): Promise<void> {
  if (text.length < 2 || text.length > MAX_NAME_LENGTH) {
    await ctx.reply(`❌ Ism 2 dan ${MAX_NAME_LENGTH} gacha belgi bo'lishi kerak:`);
    return;
  }
  conv.data.fullName = text;
  conv.step = "position";
  await setConversation(telegramId, conv);
  await ctx.reply("📋 Lavozimini tanlang:", {
    reply_markup: positionKeyboard(),
  });
}

async function handlePhoneStep(
  ctx: Context,
  conv: ConversationState & { module: "employee" },
  telegramId: number,
  text: string
): Promise<void> {
  // Simple phone validation
  const cleaned = text.replace(/[\s\-()]/g, "");
  if (cleaned.length < 9 || !/^\+?\d+$/.test(cleaned)) {
    await ctx.reply(
      "❌ Telefon raqami noto'g'ri formatda.\nMasalan: +998901234567\n\nQaytadan kiriting yoki o'tkazib yuboring:",
      { reply_markup: skipPhoneKeyboard() }
    );
    return;
  }
  conv.data.phone = cleaned;
  conv.step = "salary";
  await setConversation(telegramId, conv);
  await ctx.reply("💰 Oylik maosh summasini kiriting (so'mda):");
}

async function handleSalaryStep(
  ctx: Context,
  conv: ConversationState & { module: "employee" },
  telegramId: number,
  text: string,
  _prorabId: number
): Promise<void> {
  const cleaned = text.replace(/[\s,._]/g, "");
  const salary = parseInt(cleaned, 10);

  if (isNaN(salary) || salary <= 0 || salary > MAX_AMOUNT) {
    await ctx.reply("❌ Noto'g'ri summa. Faqat raqam kiriting (masalan: 5000000):");
    return;
  }

  conv.data.monthlySalary = salary.toString();
  conv.step = "confirm";
  await setConversation(telegramId, conv);

  const summary =
    `📋 Yangi xodim ma'lumotlari:\n\n` +
    `👤 Ism: ${conv.data.fullName}\n` +
    `📋 Lavozim: ${conv.data.position}\n` +
    `📞 Telefon: ${conv.data.phone || "kiritilmagan"}\n` +
    `💰 Oylik maosh: ${formatMoney(salary)}\n\n` +
    `Saqlaysizmi?`;

  await ctx.reply(summary, { reply_markup: confirmEmployeeKeyboard() });
}

// ─── Shared display functions ───

async function showEmployeeList(
  ctx: Context,
  prorabId: number,
  status: string,
  page: number,
  edit: boolean = false
): Promise<void> {
  const result = await getEmployees(prorabId, status, page);
  const isInactive = status === "inactive";
  const label = isInactive ? "Faolsiz" : "Faol";

  let text: string;
  if (result.total === 0) {
    text = isInactive
      ? "👻 Faolsiz xodimlar yo'q."
      : "👥 Hozircha xodimlar yo'q.\n\n➕ Yangi xodim qo'shish tugmasini bosing.";
  } else {
    const lines = result.employees.map((emp, i) => {
      const num = (page - 1) * 8 + i + 1;
      return `${num}. ${emp.fullName} — ${emp.position}\n   💰 ${formatMoney(emp.monthlySalary)}/oy`;
    });
    text = `👥 ${label} xodimlar (${result.total} ta)\n\n${lines.join("\n\n")}`;
  }

  const kb = employeeListKeyboard(
    result.employees,
    page,
    result.totalPages,
    isInactive
  );

  if (edit) {
    await ctx.editMessageText(text, { reply_markup: kb }).catch(() => {
      // If message is the same or can't be edited, send new
      ctx.reply(text, { reply_markup: kb });
    });
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}

async function showEmployeeDetail(
  ctx: Context,
  employeeId: number,
  prorabId: number
): Promise<void> {
  const emp = await getEmployeeById(employeeId, prorabId);
  if (!emp) {
    await ctx.editMessageText("❌ Xodim topilmadi.");
    return;
  }

  const isActive = emp.status === "active";
  const statusText = isActive ? "🟢 Faol" : "🔴 Faolsiz";

  const text =
    `👤 ${emp.fullName}\n\n` +
    `📋 Lavozim: ${emp.position}\n` +
    `📞 Telefon: ${emp.phone || "kiritilmagan"}\n` +
    `💰 Oylik maosh: ${formatMoney(emp.monthlySalary)}\n` +
    `📅 Ishga olingan: ${formatDate(emp.hiredDate)}\n` +
    `${statusText}`;

  await ctx.editMessageText(text, {
    reply_markup: employeeDetailKeyboard(emp.id, isActive),
  });
}
