import { CommandContext, Context, CallbackQueryContext } from "grammy";
import { getProrab } from "../utils/prorab";
import { formatMoney } from "../utils/formatters";
import {
  reportsMenuKeyboard,
  reportBackKeyboard,
  reportPaginatedKeyboard,
} from "../utils/keyboards";
import {
  getMonthSummary,
  getEmployeeMonthSummaries,
  currentMonthYear,
} from "../services/transaction.service";
import {
  getObjects,
  getObjectFinanceSummary,
} from "../services/object.service";
import { getMonthlyStats } from "../services/attendance.service";

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

const PAGE_SIZE = 8;

function monthLabel(monthYear: string): string {
  const monthNames = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
  ];
  const [year, month] = monthYear.split("-");
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// ─── /hisobotlar command ───

export async function reportsCommand(
  ctx: CommandContext<Context>
): Promise<void> {
  const prorab = await requireProrab(ctx);
  if (!prorab) return;
  await ctx.reply("📈 Hisobotlar", { reply_markup: reportsMenuKeyboard() });
}

// ─── Callback query router ───

export async function reportsCallback(
  ctx: CallbackQueryContext<Context>
): Promise<void> {
  const prorab = await requireProrab(ctx);
  if (!prorab) return;

  const data = ctx.callbackQuery.data!;
  await ctx.answerCallbackQuery();

  // rep:menu
  if (data === "rep:menu") {
    await ctx.editMessageText("📈 Hisobotlar", {
      reply_markup: reportsMenuKeyboard(),
    });
    return;
  }

  // rep:monthly — oylik moliyaviy xulosa
  if (data === "rep:monthly") {
    await showMonthlyReport(ctx, prorab.id);
    return;
  }

  // rep:employees / rep:employees:{page}
  if (data === "rep:employees" || data.startsWith("rep:employees:")) {
    const page = data === "rep:employees" ? 1 : parseInt(data.split(":")[2], 10);
    await showEmployeesReport(ctx, prorab.id, page);
    return;
  }

  // rep:objects / rep:objects:{page}
  if (data === "rep:objects" || data.startsWith("rep:objects:")) {
    const page = data === "rep:objects" ? 1 : parseInt(data.split(":")[2], 10);
    await showObjectsReport(ctx, prorab.id, page);
    return;
  }

  // rep:attendance / rep:attendance:{page}
  if (data === "rep:attendance" || data.startsWith("rep:attendance:")) {
    const page = data === "rep:attendance" ? 1 : parseInt(data.split(":")[2], 10);
    await showAttendanceReport(ctx, prorab.id, page);
    return;
  }
}

// ─── Report display functions ───

async function showMonthlyReport(
  ctx: Context,
  prorabId: number
): Promise<void> {
  const monthYear = currentMonthYear();
  const summary = await getMonthSummary(prorabId, monthYear);

  const totalIn = summary.totalPayment;
  const totalOut = summary.totalAdvance + summary.totalBonus + summary.totalExpense;

  const text =
    `💰 Oylik moliyaviy hisobot\n` +
    `📅 ${monthLabel(monthYear)}\n\n` +
    `── Kirimlar ──\n` +
    `💵 To'lovlar: ${formatMoney(summary.totalPayment)}\n\n` +
    `── Chiqimlar ──\n` +
    `💸 Avanslar: ${formatMoney(summary.totalAdvance)}\n` +
    `🎁 Premiyalar: ${formatMoney(summary.totalBonus)}\n` +
    `🧾 Xarajatlar: ${formatMoney(summary.totalExpense)}\n\n` +
    `── Jami ──\n` +
    `📥 Kirim: ${formatMoney(totalIn)}\n` +
    `📤 Chiqim: ${formatMoney(totalOut)}\n` +
    `📊 Farq: ${formatMoney(totalIn - totalOut)}`;

  await ctx.editMessageText(text, { reply_markup: reportBackKeyboard() });
}

async function showEmployeesReport(
  ctx: Context,
  prorabId: number,
  page: number
): Promise<void> {
  const monthYear = currentMonthYear();
  const allSummaries = await getEmployeeMonthSummaries(prorabId, monthYear);

  if (allSummaries.length === 0) {
    await ctx.editMessageText(
      `👥 Xodimlar hisoboti — ${monthLabel(monthYear)}\n\nMa'lumot yo'q.`,
      { reply_markup: reportBackKeyboard() }
    );
    return;
  }

  const totalPages = Math.max(1, Math.ceil(allSummaries.length / PAGE_SIZE));
  const pageSummaries = allSummaries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const lines = pageSummaries.map((s, i) => {
    const num = (page - 1) * PAGE_SIZE + i + 1;
    const received = s.totalAdvance + s.totalBonus;
    const parts = [`${num}. ${s.fullName}`];
    parts.push(`   💰 Oylik: ${formatMoney(s.monthlySalary)}`);
    if (s.totalAdvance > BigInt(0)) {
      parts.push(`   💸 Avans: ${formatMoney(s.totalAdvance)}`);
    }
    if (s.totalBonus > BigInt(0)) {
      parts.push(`   🎁 Premiya: ${formatMoney(s.totalBonus)}`);
    }
    parts.push(`   🤑 Qo'liga olgan: ${formatMoney(received)}`);
    parts.push(`   📊 Qoldiq: ${formatMoney(s.balance)}`);
    return parts.join("\n");
  });

  const text =
    `👥 Xodimlar hisoboti — ${monthLabel(monthYear)}\n` +
    `(${allSummaries.length} xodim)\n\n` +
    lines.join("\n\n");

  await ctx.editMessageText(text, {
    reply_markup: reportPaginatedKeyboard("rep:employees", page, totalPages),
  });
}

async function showObjectsReport(
  ctx: Context,
  prorabId: number,
  page: number
): Promise<void> {
  const result = await getObjects(prorabId, "active", page);

  if (result.total === 0) {
    await ctx.editMessageText(
      "🏗 Ob'ektlar hisoboti\n\nFaol ob'ektlar yo'q.",
      { reply_markup: reportBackKeyboard() }
    );
    return;
  }

  const lines: string[] = [];
  for (let i = 0; i < result.objects.length; i++) {
    const obj = result.objects[i];
    const fin = await getObjectFinanceSummary(obj.id);
    const num = (page - 1) * 8 + i + 1;
    const profitLine = fin.profit >= BigInt(0)
      ? `   ✅ Foyda: ${formatMoney(fin.profit)}`
      : `   🔴 Zarar: ${formatMoney(-fin.profit)}`;

    lines.push(
      `${num}. ${obj.name}\n` +
      `   💰 Shartnoma: ${formatMoney(fin.contractAmount)}\n` +
      `   💵 To'langan: ${formatMoney(fin.totalPayments)}\n` +
      `   📦 Xarajat: ${formatMoney(fin.totalCost)}\n` +
      profitLine
    );
  }

  const text =
    `🏗 Ob'ektlar hisoboti (${result.total} ta)\n\n` +
    lines.join("\n\n");

  await ctx.editMessageText(text, {
    reply_markup: reportPaginatedKeyboard("rep:objects", page, result.totalPages),
  });
}

async function showAttendanceReport(
  ctx: Context,
  prorabId: number,
  page: number
): Promise<void> {
  const monthYear = currentMonthYear();
  const allStats = await getMonthlyStats(prorabId, monthYear);

  if (allStats.length === 0) {
    await ctx.editMessageText(
      `📋 Davomat hisoboti — ${monthLabel(monthYear)}\n\nMa'lumot yo'q.`,
      { reply_markup: reportBackKeyboard() }
    );
    return;
  }

  const totalPages = Math.max(1, Math.ceil(allStats.length / PAGE_SIZE));
  const pageStats = allStats.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const lines = pageStats.map((s, i) => {
    const num = (page - 1) * PAGE_SIZE + i + 1;
    return (
      `${num}. ${s.employee.fullName}\n` +
      `   ✅ ${s.fullDays} kun | ⏰ ${s.halfDays} yarim | ❌ ${s.absentDays} yo'q\n` +
      `   📊 Jami: ${s.totalWorked} ish kuni`
    );
  });

  const text =
    `📋 Davomat hisoboti — ${monthLabel(monthYear)}\n` +
    `(${allStats.length} xodim)\n\n` +
    lines.join("\n\n");

  await ctx.editMessageText(text, {
    reply_markup: reportPaginatedKeyboard("rep:attendance", page, totalPages),
  });
}
