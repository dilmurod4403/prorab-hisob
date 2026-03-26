import {
  CommandContext,
  Context,
  CallbackQueryContext,
  NextFunction,
} from "grammy";
import { requireProrab, getProrab } from "../utils/prorab";
import { formatMoney } from "../utils/formatters";
import {
  settingsMenuKeyboard,
  confirmMonthCloseKeyboard,
  confirmLimitKeyboard,
} from "../utils/keyboards";
import {
  isMonthClosed,
  getMonthSummary,
  getEmployeeMonthSummaries,
  currentMonthYear,
  createTransaction,
} from "../services/transaction.service";
import { prisma } from "../db";
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

function monthLabel(monthYear: string): string {
  const monthNames = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
  ];
  const [year, month] = monthYear.split("-");
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// ─── /sozlamalar command ───

export async function settingsCommand(
  ctx: CommandContext<Context>
): Promise<void> {
  const prorab = await requireProrab(ctx);
  if (!prorab) return;
  await ctx.reply("⚙️ Sozlamalar", { reply_markup: settingsMenuKeyboard() });
}

// ─── Callback query router ───

export async function settingsCallback(
  ctx: CallbackQueryContext<Context>
): Promise<void> {
  const prorab = await requireProrab(ctx);
  if (!prorab) return;

  const data = ctx.callbackQuery.data!;
  await ctx.answerCallbackQuery();

  // set:menu
  if (data === "set:menu") {
    await clearConversation(ctx.from!.id);
    await ctx.editMessageText("⚙️ Sozlamalar", {
      reply_markup: settingsMenuKeyboard(),
    });
    return;
  }

  // set:close_month — show summary and ask confirmation
  if (data === "set:close_month") {
    const monthYear = currentMonthYear();

    if (await isMonthClosed(prorab.id, monthYear)) {
      await ctx.editMessageText(
        `🔒 ${monthLabel(monthYear)} allaqachon yopilgan.`,
        { reply_markup: settingsMenuKeyboard() }
      );
      return;
    }

    const summary = await getMonthSummary(prorab.id, monthYear);
    const empSummaries = await getEmployeeMonthSummaries(prorab.id, monthYear);

    let empLines = "";
    if (empSummaries.length > 0) {
      const lines = empSummaries.map((s, i) => {
        const received = s.totalAdvance + s.totalBonus;
        const parts = [`${i + 1}. ${s.fullName}`];
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
      empLines = `\n── Xodimlar ──\n${lines.join("\n\n")}\n`;
    }

    const text =
      `🔒 Oyni yopish — ${monthLabel(monthYear)}\n\n` +
      `── Umumiy xulosa ──\n` +
      `💸 Avanslar: ${formatMoney(summary.totalAdvance)}\n` +
      `🎁 Premiyalar: ${formatMoney(summary.totalBonus)}\n` +
      `🧾 Xarajatlar: ${formatMoney(summary.totalExpense)}\n` +
      `💵 To'lovlar: ${formatMoney(summary.totalPayment)}\n` +
      empLines +
      `\n⚠️ Oy yopilgandan keyin bu oy uchun moliyaviy operatsiyalar kiritib bo'lmaydi.\n\n` +
      `Davom etasizmi?`;

    await ctx.editMessageText(text, {
      reply_markup: confirmMonthCloseKeyboard(),
    });
    return;
  }

  // set:confirm_close — actually close the month
  if (data === "set:confirm_close") {
    const monthYear = currentMonthYear();

    if (await isMonthClosed(prorab.id, monthYear)) {
      await ctx.editMessageText(
        `🔒 ${monthLabel(monthYear)} allaqachon yopilgan.`,
        { reply_markup: settingsMenuKeyboard() }
      );
      return;
    }

    // Har bir faol xodimga oylik (salary) tranzaksiyasi yaratish
    const employees = await prisma.employee.findMany({
      where: { prorabId: prorab.id, status: "active" },
    });

    let totalSalary = BigInt(0);
    for (const emp of employees) {
      await createTransaction({
        prorabId: prorab.id,
        employeeId: emp.id,
        type: "salary",
        amount: emp.monthlySalary,
        description: `${monthLabel(monthYear)} oyligi`,
      });
      totalSalary += emp.monthlySalary;
    }

    const summary = await getMonthSummary(prorab.id, monthYear);

    await prisma.monthClose.create({
      data: {
        prorabId: prorab.id,
        monthYear,
        totalSalary,
        totalBonus: summary.totalBonus,
        totalAdvance: summary.totalAdvance,
        totalExpense: summary.totalExpense,
      },
    });

    await ctx.editMessageText(
      `✅ ${monthLabel(monthYear)} muvaffaqiyatli yopildi!\n\n` +
        `Endi bu oy uchun yangi operatsiyalar kiritib bo'lmaydi.`,
      { reply_markup: settingsMenuKeyboard() }
    );
    return;
  }

  // set:adv_limit — show current and ask for new
  if (data === "set:adv_limit") {
    const text =
      `💰 Avans limiti\n\n` +
      `Hozirgi limit: ${prorab.advanceLimitPct}%\n\n` +
      `Yangi foizni kiriting (1 dan 100 gacha).\n` +
      `Masalan: 70`;

    await setConversation(ctx.from!.id, {
      module: "settings",
      step: "new_limit",
      data: {},
    });
    await ctx.editMessageText(text);
    return;
  }

  // set:confirm_limit — save new limit
  if (data === "set:confirm_limit") {
    const conv = await getConversation(ctx.from!.id);
    if (!conv || conv.module !== "settings" || conv.step !== "new_limit") return;

    const newPct = conv.data.newLimitPct!;

    await prisma.prorab.update({
      where: { id: prorab.id },
      data: { advanceLimitPct: newPct },
    });

    await clearConversation(ctx.from!.id);
    await ctx.editMessageText(
      `✅ Avans limiti ${newPct}% ga o'zgartirildi.`,
      { reply_markup: settingsMenuKeyboard() }
    );
    return;
  }

  // set:profile
  if (data === "set:profile") {
    const text =
      `👤 Profil\n\n` +
      `📛 Ism: ${prorab.fullName}\n` +
      `📞 Telefon: ${prorab.phone || "kiritilmagan"}\n` +
      `💰 Avans limiti: ${prorab.advanceLimitPct}%\n` +
      `📅 Ro'yxatdan o'tgan: ${formatDate(prorab.createdAt)}`;

    await ctx.editMessageText(text, {
      reply_markup: settingsMenuKeyboard(),
    });
    return;
  }
}

// ─── Text handler for FSM ───

export async function settingsTextHandler(
  ctx: Context,
  next: NextFunction
): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return next();

  const conv = await getConversation(telegramId);
  if (!conv || conv.module !== "settings") return next();

  const text = ctx.message?.text?.trim();
  if (!text) return next();

  const prorab = await getProrab(telegramId);
  if (!prorab) return next();

  if (conv.step === "new_limit") {
    await handleNewLimitStep(ctx, conv, telegramId, text, prorab.advanceLimitPct);
  } else {
    return next();
  }
}

// ─── FSM step handler ───

async function handleNewLimitStep(
  ctx: Context,
  conv: ConversationState & { module: "settings" },
  telegramId: number,
  text: string,
  currentPct: number
): Promise<void> {
  const pct = parseInt(text, 10);

  if (isNaN(pct) || pct < 1 || pct > 100) {
    await ctx.reply("❌ 1 dan 100 gacha raqam kiriting:");
    return;
  }

  if (pct === currentPct) {
    await ctx.reply(`❌ Hozirgi limit ham ${pct}%. Boshqa raqam kiriting:`);
    return;
  }

  conv.data.newLimitPct = pct;
  await setConversation(telegramId, conv);

  const text2 =
    `💰 Avans limitini o'zgartirish\n\n` +
    `Hozirgi: ${currentPct}%\n` +
    `Yangi: ${pct}%\n\n` +
    `Saqlaysizmi?`;

  await ctx.reply(text2, { reply_markup: confirmLimitKeyboard() });
}
