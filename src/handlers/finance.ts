import {
  CommandContext,
  Context,
  CallbackQueryContext,
  NextFunction,
} from "grammy";
import { getProrab } from "../utils/prorab";
import { formatMoney } from "../utils/formatters";
import {
  financeMenuKeyboard,
  employeeSelectKeyboard,
  objectSelectKeyboard,
  objectSelectWithSkipKeyboard,
  confirmFinanceKeyboard,
  advanceWarningKeyboard,
  transactionListKeyboard,
} from "../utils/keyboards";
import {
  createTransaction,
  checkAdvanceLimit,
  getTransactions,
  getMonthSummary,
  getObjectPaymentTotal,
  isMonthClosed,
  currentMonthYear,
} from "../services/transaction.service";
import {
  getConversation,
  setConversation,
  clearConversation,
  ConversationState,
} from "../types/conversation";
import { prisma } from "../db";

// ─── Helpers ───

async function requireProrab(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return null;
  const prorab = await getProrab(telegramId);
  if (!prorab) {
    await ctx.reply("Avval /start buyrug'ini yuboring.");
  }
  return prorab;
}

const TX_TYPE_LABELS: Record<string, string> = {
  advance: "💸 Avans",
  bonus: "🎁 Premiya",
  expense: "🧾 Xarajat",
  payment: "💵 To'lov",
  salary: "💰 Oylik",
};

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── /moliya command ───

export async function financeCommand(
  ctx: CommandContext<Context>
): Promise<void> {
  const prorab = await requireProrab(ctx);
  if (!prorab) return;
  await showFinanceMenu(ctx);
}

// ─── Callback query router ───

export async function financeCallback(
  ctx: CallbackQueryContext<Context>
): Promise<void> {
  const prorab = await requireProrab(ctx);
  if (!prorab) return;

  const data = ctx.callbackQuery.data!;
  await ctx.answerCallbackQuery();

  const monthYear = currentMonthYear();

  // ─── Menu ───
  if (data === "fin:menu") {
    await showFinanceMenu(ctx, true);
    return;
  }

  // ─── Cancel (all flows) ───
  if (data === "fin:cancel") {
    await clearConversation(ctx.from!.id);
    await ctx.editMessageText("❌ Bekor qilindi.");
    await showFinanceMenu(ctx);
    return;
  }

  // ─── History ───
  if (data === "fin:history" || data.startsWith("fin:history:")) {
    const page = data === "fin:history" ? 1 : parseInt(data.split(":")[2], 10);
    await showHistory(ctx, prorab.id, monthYear, page);
    return;
  }

  // ═══════════════════════════════
  // AVANS
  // ═══════════════════════════════

  if (data === "fin:advance") {
    // Check month closed
    if (await isMonthClosed(prorab.id, monthYear)) {
      await ctx.editMessageText("🔒 Bu oy yopilgan, avans kiritib bo'lmaydi.");
      return;
    }
    const employees = await prisma.employee.findMany({
      where: { prorabId: prorab.id, status: "active" },
      orderBy: { fullName: "asc" },
    });
    if (employees.length === 0) {
      await ctx.editMessageText(
        "👥 Faol xodimlar yo'q. Avval xodim qo'shing.",
        { reply_markup: financeMenuKeyboard() }
      );
      return;
    }
    await ctx.editMessageText("💸 Avans berish\n\nXodimni tanlang:", {
      reply_markup: employeeSelectKeyboard(employees, "fin:adv_emp"),
    });
    return;
  }

  if (data.startsWith("fin:adv_emp:")) {
    const empId = parseInt(data.split(":")[2], 10);
    const emp = await prisma.employee.findFirst({
      where: { id: empId, prorabId: prorab.id },
    });
    if (!emp) return;

    await setConversation(ctx.from!.id, {
      module: "finance",
      step: "amount",
      data: {
        type: "advance",
        employeeId: emp.id,
        employeeName: emp.fullName,
      },
    });
    await ctx.editMessageText(
      `💸 Avans: ${emp.fullName}\n\n` +
        `💰 Oylik maosh: ${formatMoney(emp.monthlySalary)}\n\n` +
        `Avans summasini kiriting (so'mda):`
    );
    return;
  }

  if (data === "fin:adv_confirm" || data === "fin:adv_force") {
    const conv = await getConversation(ctx.from!.id);
    if (!conv || conv.module !== "finance" || conv.data.type !== "advance") return;

    const tx = await createTransaction({
      prorabId: prorab.id,
      employeeId: conv.data.employeeId,
      type: "advance",
      amount: BigInt(conv.data.amount!),
      description: conv.data.description,
    });

    await clearConversation(ctx.from!.id);
    await ctx.editMessageText(
      `✅ Avans muvaffaqiyatli kiritildi!\n\n` +
        `👤 ${conv.data.employeeName}\n` +
        `💰 Summa: ${formatMoney(tx.amount)}\n` +
        `📅 Sana: ${formatDate(tx.txDate)}`
    );
    await showFinanceMenu(ctx);
    return;
  }

  // ═══════════════════════════════
  // PREMIYA
  // ═══════════════════════════════

  if (data === "fin:bonus") {
    if (await isMonthClosed(prorab.id, monthYear)) {
      await ctx.editMessageText("🔒 Bu oy yopilgan, premiya kiritib bo'lmaydi.");
      return;
    }
    const employees = await prisma.employee.findMany({
      where: { prorabId: prorab.id, status: "active" },
      orderBy: { fullName: "asc" },
    });
    if (employees.length === 0) {
      await ctx.editMessageText(
        "👥 Faol xodimlar yo'q. Avval xodim qo'shing.",
        { reply_markup: financeMenuKeyboard() }
      );
      return;
    }
    await ctx.editMessageText("🎁 Premiya berish\n\nXodimni tanlang:", {
      reply_markup: employeeSelectKeyboard(employees, "fin:bon_emp"),
    });
    return;
  }

  if (data.startsWith("fin:bon_emp:")) {
    const empId = parseInt(data.split(":")[2], 10);
    const emp = await prisma.employee.findFirst({
      where: { id: empId, prorabId: prorab.id },
    });
    if (!emp) return;

    await setConversation(ctx.from!.id, {
      module: "finance",
      step: "amount",
      data: {
        type: "bonus",
        employeeId: emp.id,
        employeeName: emp.fullName,
      },
    });
    await ctx.editMessageText(
      `🎁 Premiya: ${emp.fullName}\n\nPremiya summasini kiriting (so'mda):`
    );
    return;
  }

  if (data.startsWith("fin:bon_obj:")) {
    const objId = parseInt(data.split(":")[2], 10);
    const obj = await prisma.object.findFirst({
      where: { id: objId, prorabId: prorab.id },
    });
    if (!obj) return;

    const conv = await getConversation(ctx.from!.id);
    if (!conv || conv.module !== "finance") return;

    conv.data.objectId = obj.id;
    conv.data.objectName = obj.name;
    conv.step = "confirm";
    await setConversation(ctx.from!.id, conv);
    await showFinanceConfirm(ctx, conv);
    return;
  }

  if (data === "fin:bon_skip_obj") {
    const conv = await getConversation(ctx.from!.id);
    if (!conv || conv.module !== "finance") return;
    conv.step = "confirm";
    await setConversation(ctx.from!.id, conv);
    await showFinanceConfirm(ctx, conv);
    return;
  }

  if (data === "fin:bon_confirm") {
    const conv = await getConversation(ctx.from!.id);
    if (!conv || conv.module !== "finance" || conv.data.type !== "bonus") return;

    const tx = await createTransaction({
      prorabId: prorab.id,
      employeeId: conv.data.employeeId,
      objectId: conv.data.objectId,
      type: "bonus",
      amount: BigInt(conv.data.amount!),
      description: conv.data.description,
    });

    await clearConversation(ctx.from!.id);
    await ctx.editMessageText(
      `✅ Premiya muvaffaqiyatli kiritildi!\n\n` +
        `👤 ${conv.data.employeeName}\n` +
        `💰 Summa: ${formatMoney(tx.amount)}\n` +
        `📝 Sabab: ${conv.data.description || "-"}\n` +
        `📅 Sana: ${formatDate(tx.txDate)}`
    );
    await showFinanceMenu(ctx);
    return;
  }

  // ═══════════════════════════════
  // XARAJAT
  // ═══════════════════════════════

  if (data === "fin:expense") {
    if (await isMonthClosed(prorab.id, monthYear)) {
      await ctx.editMessageText("🔒 Bu oy yopilgan, xarajat kiritib bo'lmaydi.");
      return;
    }
    const objects = await prisma.object.findMany({
      where: { prorabId: prorab.id, status: "active" },
      orderBy: { name: "asc" },
    });
    if (objects.length === 0) {
      await ctx.editMessageText(
        "🏗 Faol ob'ektlar yo'q. Avval ob'ekt qo'shing.",
        { reply_markup: financeMenuKeyboard() }
      );
      return;
    }
    await ctx.editMessageText("🧾 Xarajat kiritish\n\nOb'ektni tanlang:", {
      reply_markup: objectSelectKeyboard(objects, "fin:exp_obj"),
    });
    return;
  }

  if (data.startsWith("fin:exp_obj:")) {
    const objId = parseInt(data.split(":")[2], 10);
    const obj = await prisma.object.findFirst({
      where: { id: objId, prorabId: prorab.id },
    });
    if (!obj) return;

    await setConversation(ctx.from!.id, {
      module: "finance",
      step: "amount",
      data: {
        type: "expense",
        objectId: obj.id,
        objectName: obj.name,
      },
    });
    await ctx.editMessageText(
      `🧾 Xarajat: ${obj.name}\n\nXarajat summasini kiriting (so'mda):`
    );
    return;
  }

  if (data === "fin:exp_confirm") {
    const conv = await getConversation(ctx.from!.id);
    if (!conv || conv.module !== "finance" || conv.data.type !== "expense") return;

    const tx = await createTransaction({
      prorabId: prorab.id,
      objectId: conv.data.objectId,
      type: "expense",
      amount: BigInt(conv.data.amount!),
      description: conv.data.description,
    });

    await clearConversation(ctx.from!.id);
    await ctx.editMessageText(
      `✅ Xarajat muvaffaqiyatli kiritildi!\n\n` +
        `🏗 ${conv.data.objectName}\n` +
        `💰 Summa: ${formatMoney(tx.amount)}\n` +
        `📝 Izoh: ${conv.data.description || "-"}\n` +
        `📅 Sana: ${formatDate(tx.txDate)}`
    );
    await showFinanceMenu(ctx);
    return;
  }

  // ═══════════════════════════════
  // TO'LOV (buyurtmachidan)
  // ═══════════════════════════════

  if (data === "fin:payment") {
    const objects = await prisma.object.findMany({
      where: { prorabId: prorab.id, status: "active" },
      orderBy: { name: "asc" },
    });
    if (objects.length === 0) {
      await ctx.editMessageText(
        "🏗 Faol ob'ektlar yo'q. Avval ob'ekt qo'shing.",
        { reply_markup: financeMenuKeyboard() }
      );
      return;
    }
    await ctx.editMessageText("💵 Buyurtmachidan to'lov\n\nOb'ektni tanlang:", {
      reply_markup: objectSelectKeyboard(objects, "fin:pay_obj"),
    });
    return;
  }

  if (data.startsWith("fin:pay_obj:")) {
    const objId = parseInt(data.split(":")[2], 10);
    const obj = await prisma.object.findFirst({
      where: { id: objId, prorabId: prorab.id },
    });
    if (!obj) return;

    const paid = await getObjectPaymentTotal(obj.id);
    const remaining = obj.contractAmount - paid;

    await setConversation(ctx.from!.id, {
      module: "finance",
      step: "amount",
      data: {
        type: "payment",
        objectId: obj.id,
        objectName: obj.name,
      },
    });
    await ctx.editMessageText(
      `💵 To'lov: ${obj.name}\n\n` +
        `📋 Shartnoma: ${formatMoney(obj.contractAmount)}\n` +
        `✅ To'langan: ${formatMoney(paid)}\n` +
        `📊 Qoldiq: ${formatMoney(remaining)}\n\n` +
        `To'lov summasini kiriting (so'mda):`
    );
    return;
  }

  if (data === "fin:pay_confirm") {
    const conv = await getConversation(ctx.from!.id);
    if (!conv || conv.module !== "finance" || conv.data.type !== "payment") return;

    const tx = await createTransaction({
      prorabId: prorab.id,
      objectId: conv.data.objectId,
      type: "payment",
      amount: BigInt(conv.data.amount!),
    });

    // Show updated balance
    const obj = await prisma.object.findUnique({
      where: { id: conv.data.objectId! },
    });
    const newPaid = await getObjectPaymentTotal(conv.data.objectId!);
    const newRemaining = obj ? obj.contractAmount - newPaid : BigInt(0);

    await clearConversation(ctx.from!.id);
    await ctx.editMessageText(
      `✅ To'lov muvaffaqiyatli kiritildi!\n\n` +
        `🏗 ${conv.data.objectName}\n` +
        `💰 Summa: ${formatMoney(tx.amount)}\n` +
        `📅 Sana: ${formatDate(tx.txDate)}\n\n` +
        `📊 Yangi qoldiq: ${formatMoney(newRemaining)}`
    );
    await showFinanceMenu(ctx);
    return;
  }
}

// ─── Text handler for FSM ───

export async function financeTextHandler(
  ctx: Context,
  next: NextFunction
): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return next();

  const conv = await getConversation(telegramId);
  if (!conv || conv.module !== "finance") return next();

  const text = ctx.message?.text?.trim();
  if (!text) return next();

  const prorab = await getProrab(telegramId);
  if (!prorab) return next();

  switch (conv.step) {
    case "amount":
      await handleAmountStep(ctx, conv, telegramId, text, prorab.id);
      break;
    case "description":
      await handleDescriptionStep(ctx, conv, telegramId, text, prorab.id);
      break;
    default:
      return next();
  }
}

// ─── FSM step handlers ───

async function handleAmountStep(
  ctx: Context,
  conv: ConversationState & { module: "finance" },
  telegramId: number,
  text: string,
  prorabId: number
): Promise<void> {
  const cleaned = text.replace(/[\s,._]/g, "");
  const amount = parseInt(cleaned, 10);

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("❌ Noto'g'ri summa. Faqat raqam kiriting (masalan: 500000):");
    return;
  }

  conv.data.amount = amount.toString();

  // Advance: check limit
  if (conv.data.type === "advance") {
    const limit = await checkAdvanceLimit(
      conv.data.employeeId!,
      prorabId,
      BigInt(amount)
    );

    if (limit.status === "over") {
      conv.step = "confirm";
      await setConversation(telegramId, conv);
      await ctx.reply(
        `⚠️ Avans chegarasidan oshadi!\n\n` +
          `👤 ${conv.data.employeeName}\n` +
          `💰 Oylik: ${formatMoney(limit.monthlySalary)}\n` +
          `📊 Joriy avanslar: ${formatMoney(limit.currentAdvances)}\n` +
          `➕ Yangi avans: ${formatMoney(amount)}\n` +
          `🔴 Chegara: ${formatMoney(limit.maxAdvance)} (${limit.limitPct}%)\n\n` +
          `Davom etasizmi?`,
        { reply_markup: advanceWarningKeyboard() }
      );
      return;
    }

    if (limit.status === "warning") {
      // Show warning but proceed to confirm
      conv.step = "confirm";
      await setConversation(telegramId, conv);
      await ctx.reply(
        `⚠️ Avans chegarasiga yaqinlashmoqda!\n\n` +
          `👤 ${conv.data.employeeName}\n` +
          `📊 Joriy avanslar: ${formatMoney(limit.currentAdvances)}\n` +
          `➕ Yangi avans: ${formatMoney(amount)}\n` +
          `🟡 Qoldiq: ${formatMoney(limit.remaining - BigInt(amount))}\n\n` +
          `Saqlaysizmi?`,
        { reply_markup: confirmFinanceKeyboard("fin:adv_confirm") }
      );
      return;
    }

    // OK — go straight to confirm
    conv.step = "confirm";
    await setConversation(telegramId, conv);
    await ctx.reply(
      `💸 Avans tasdiqlash\n\n` +
        `👤 ${conv.data.employeeName}\n` +
        `💰 Summa: ${formatMoney(amount)}\n\n` +
        `Saqlaysizmi?`,
      { reply_markup: confirmFinanceKeyboard("fin:adv_confirm") }
    );
    return;
  }

  // Bonus: ask for reason (description is mandatory)
  if (conv.data.type === "bonus") {
    conv.step = "description";
    await setConversation(telegramId, conv);
    await ctx.reply("📝 Premiya sababini kiriting (majburiy):");
    return;
  }

  // Expense: ask for description
  if (conv.data.type === "expense") {
    conv.step = "description";
    await setConversation(telegramId, conv);
    await ctx.reply("📝 Xarajat izohini kiriting (masalan: sement, qum):");
    return;
  }

  // Payment: go to confirm directly
  if (conv.data.type === "payment") {
    conv.step = "confirm";
    await setConversation(telegramId, conv);
    await ctx.reply(
      `💵 To'lov tasdiqlash\n\n` +
        `🏗 ${conv.data.objectName}\n` +
        `💰 Summa: ${formatMoney(amount)}\n\n` +
        `Saqlaysizmi?`,
      { reply_markup: confirmFinanceKeyboard("fin:pay_confirm") }
    );
    return;
  }
}

async function handleDescriptionStep(
  ctx: Context,
  conv: ConversationState & { module: "finance" },
  telegramId: number,
  text: string,
  prorabId: number
): Promise<void> {
  if (conv.data.type === "bonus" && text.length < 2) {
    await ctx.reply("❌ Sabab kamida 2 ta belgidan iborat bo'lishi kerak:");
    return;
  }

  conv.data.description = text;

  // Bonus: ask to link to object (optional)
  if (conv.data.type === "bonus") {
    const objects = await prisma.object.findMany({
      where: { prorabId: prorabId, status: "active" },
      orderBy: { name: "asc" },
    });

    if (objects.length > 0) {
      // Don't go to confirm yet — ask about object
      await setConversation(telegramId, conv);
      await ctx.reply("🏗 Ob'ektga bog'laysizmi?", {
        reply_markup: objectSelectWithSkipKeyboard(
          objects,
          "fin:bon_obj",
          "fin:bon_skip_obj"
        ),
      });
      return;
    }

    // No objects — go to confirm
    conv.step = "confirm";
    await setConversation(telegramId, conv);
    await showFinanceConfirm(ctx, conv);
    return;
  }

  // Expense: go to confirm
  if (conv.data.type === "expense") {
    conv.step = "confirm";
    await setConversation(telegramId, conv);
    await ctx.reply(
      `🧾 Xarajat tasdiqlash\n\n` +
        `🏗 ${conv.data.objectName}\n` +
        `💰 Summa: ${formatMoney(parseInt(conv.data.amount!))}\n` +
        `📝 Izoh: ${conv.data.description}\n\n` +
        `Saqlaysizmi?`,
      { reply_markup: confirmFinanceKeyboard("fin:exp_confirm") }
    );
    return;
  }
}

// ─── Display functions ───

async function showFinanceMenu(
  ctx: Context,
  edit: boolean = false
): Promise<void> {
  const text = "💰 Moliya bo'limi\n\nQuyidagi operatsiyalardan birini tanlang:";
  const kb = financeMenuKeyboard();
  if (edit) {
    await ctx.editMessageText(text, { reply_markup: kb }).catch(() => {
      ctx.reply(text, { reply_markup: kb });
    });
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}

async function showFinanceConfirm(
  ctx: Context,
  conv: ConversationState & { module: "finance" }
): Promise<void> {
  const amount = parseInt(conv.data.amount!);
  let text = `🎁 Premiya tasdiqlash\n\n`;
  text += `👤 ${conv.data.employeeName}\n`;
  text += `💰 Summa: ${formatMoney(amount)}\n`;
  text += `📝 Sabab: ${conv.data.description || "-"}\n`;
  if (conv.data.objectName) {
    text += `🏗 Ob'ekt: ${conv.data.objectName}\n`;
  }
  text += `\nSaqlaysizmi?`;

  await ctx.reply(text, {
    reply_markup: confirmFinanceKeyboard("fin:bon_confirm"),
  });
}

async function showHistory(
  ctx: Context,
  prorabId: number,
  monthYear: string,
  page: number
): Promise<void> {
  const result = await getTransactions(prorabId, monthYear, page);
  const summary = await getMonthSummary(prorabId, monthYear);

  let text = `📜 Tranzaksiyalar tarixi (${monthYear})\n\n`;
  text +=
    `💸 Avanslar: ${formatMoney(summary.totalAdvance)}\n` +
    `🎁 Premiyalar: ${formatMoney(summary.totalBonus)}\n` +
    `🧾 Xarajatlar: ${formatMoney(summary.totalExpense)}\n` +
    `💵 To'lovlar: ${formatMoney(summary.totalPayment)}\n\n`;

  if (result.total === 0) {
    text += "Bu oyda tranzaksiyalar yo'q.";
  } else {
    for (const tx of result.transactions) {
      const label = TX_TYPE_LABELS[tx.type] || tx.type;
      text += `${label} — ${formatMoney(tx.amount)}`;
      if (tx.description) text += ` (${tx.description})`;
      text += `\n`;
    }
  }

  const kb = transactionListKeyboard(page, result.totalPages);
  await ctx.editMessageText(text, { reply_markup: kb }).catch(() => {
    ctx.reply(text, { reply_markup: kb });
  });
}
