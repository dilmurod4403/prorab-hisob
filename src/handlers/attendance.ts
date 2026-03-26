import {
  CommandContext,
  Context,
  CallbackQueryContext,
  NextFunction,
} from "grammy";
import { requireProrab, getProrab } from "../utils/prorab";
import {
  attendanceMenuKeyboard,
  attendanceDayKeyboard,
  attendanceStatusKeyboard,
  attendanceMonthKeyboard,
} from "../utils/keyboards";
import {
  getAttendanceForDate,
  markAttendance,
  getMonthlyStats,
  getStatusIcon,
  getStatusLabel,
  todayDate,
  parseDate,
  formatDateShort,
  dateToString,
  currentMonthYear,
} from "../services/attendance.service";
import {
  getConversation,
  setConversation,
  clearConversation,
  ConversationState,
} from "../types/conversation";

// ─── Helpers ───

const PAGE_SIZE = 8;

// ─── /davomat command ───

export async function attendanceCommand(
  ctx: CommandContext<Context>
): Promise<void> {
  const prorab = await requireProrab(ctx);
  if (!prorab) return;
  await ctx.reply("📋 Davomat", { reply_markup: attendanceMenuKeyboard() });
}

// ─── Callback query router ───

export async function attendanceCallback(
  ctx: CallbackQueryContext<Context>
): Promise<void> {
  const prorab = await requireProrab(ctx);
  if (!prorab) return;

  const data = ctx.callbackQuery.data!;
  await ctx.answerCallbackQuery();

  // att:menu
  if (data === "att:menu") {
    await ctx.editMessageText("📋 Davomat", {
      reply_markup: attendanceMenuKeyboard(),
    });
    return;
  }

  // att:today
  if (data === "att:today") {
    const date = todayDate();
    await showDayAttendance(ctx, prorab.id, date, true);
    return;
  }

  // att:other_date — start FSM for date input
  if (data === "att:other_date") {
    await setConversation(ctx.from!.id, {
      module: "attendance",
      step: "date",
      data: {},
    });
    await ctx.editMessageText(
      "📆 Sanani kiriting (dd.mm.yyyy formatda):\n\nMasalan: 25.03.2026"
    );
    return;
  }

  // att:date:{yyyy-mm-dd}
  if (data.startsWith("att:date:")) {
    const dateStr = data.split(":").slice(2).join(":");
    const date = new Date(dateStr);
    await showDayAttendance(ctx, prorab.id, date, true);
    return;
  }

  // att:mark:{empId}:{date} — show status selection
  if (data.startsWith("att:mark:")) {
    const parts = data.split(":");
    const empId = parseInt(parts[2], 10);
    const dateStr = parts[3];
    await ctx.editMessageText("📋 Davomat holatini tanlang:", {
      reply_markup: attendanceStatusKeyboard(empId, dateStr),
    });
    return;
  }

  // att:set:{empId}:{date}:{status}
  if (data.startsWith("att:set:")) {
    const parts = data.split(":");
    const empId = parseInt(parts[2], 10);
    const dateStr = parts[3];
    const status = parts[4];
    const date = new Date(dateStr);

    if (status === "absent_reason") {
      // Need note via FSM
      await setConversation(ctx.from!.id, {
        module: "attendance",
        step: "note",
        data: {
          targetDate: dateStr,
          employeeId: empId,
        },
      });
      await ctx.editMessageText("📝 Yo'qlik sababini kiriting:");
      return;
    }

    await markAttendance({
      employeeId: empId,
      workDate: date,
      status,
    });

    await showDayAttendance(ctx, prorab.id, date, true);
    return;
  }

  // att:month / att:month:{page}
  if (data === "att:month" || data.startsWith("att:month:")) {
    const page = data === "att:month" ? 1 : parseInt(data.split(":")[2], 10);
    await showMonthlyStats(ctx, prorab.id, page, true);
    return;
  }
}

// ─── Text handler for FSM ───

export async function attendanceTextHandler(
  ctx: Context,
  next: NextFunction
): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return next();

  const conv = await getConversation(telegramId);
  if (!conv || conv.module !== "attendance") return next();

  const text = ctx.message?.text?.trim();
  if (!text) return next();

  const prorab = await getProrab(telegramId);
  if (!prorab) return next();

  switch (conv.step) {
    case "date":
      await handleDateStep(ctx, conv, telegramId, text, prorab.id);
      break;
    case "note":
      await handleNoteStep(ctx, conv, telegramId, text, prorab.id);
      break;
    default:
      return next();
  }
}

// ─── FSM step handlers ───

async function handleDateStep(
  ctx: Context,
  conv: ConversationState & { module: "attendance" },
  telegramId: number,
  text: string,
  prorabId: number
): Promise<void> {
  const date = parseDate(text);
  if (!date) {
    await ctx.reply(
      "❌ Noto'g'ri format. dd.mm.yyyy formatda kiriting:\n\nMasalan: 25.03.2026"
    );
    return;
  }

  // Check not in the future
  const today = todayDate();
  if (date > today) {
    await ctx.reply("❌ Kelajakdagi sana kiritib bo'lmaydi. Qaytadan kiriting:");
    return;
  }

  await clearConversation(telegramId);
  await showDayAttendance(ctx, prorabId, date, false);
}

async function handleNoteStep(
  ctx: Context,
  conv: ConversationState & { module: "attendance" },
  telegramId: number,
  text: string,
  prorabId: number
): Promise<void> {
  const dateStr = conv.data.targetDate!;
  const empId = conv.data.employeeId!;
  const date = new Date(dateStr);

  await markAttendance({
    employeeId: empId,
    workDate: date,
    status: "absent_reason",
    note: text,
  });

  await clearConversation(telegramId);
  await showDayAttendance(ctx, prorabId, date, false);
}

// ─── Display functions ───

async function showDayAttendance(
  ctx: Context,
  prorabId: number,
  date: Date,
  edit: boolean
): Promise<void> {
  const rows = await getAttendanceForDate(prorabId, date);
  const dateStr = dateToString(date);
  const dateDisplay = formatDateShort(date);

  if (rows.length === 0) {
    const text = `📋 ${dateDisplay} — Davomat\n\n👥 Faol xodimlar yo'q.\nAvval xodim qo'shing.`;
    if (edit) {
      await ctx.editMessageText(text, {
        reply_markup: attendanceMenuKeyboard(),
      }).catch(() => ctx.reply(text, { reply_markup: attendanceMenuKeyboard() }));
    } else {
      await ctx.reply(text, { reply_markup: attendanceMenuKeyboard() });
    }
    return;
  }

  const kbRows = rows.map((r) => ({
    employee: r.employee,
    statusIcon: getStatusIcon(r.attendance?.status || null),
  }));

  // Summary line
  const marked = rows.filter((r) => r.attendance).length;
  const total = rows.length;

  const text =
    `📋 ${dateDisplay} — Davomat\n\n` +
    `📊 Belgilangan: ${marked}/${total}\n\n` +
    `Xodimni bosib holatini belgilang:`;

  const kb = attendanceDayKeyboard(kbRows, dateStr);

  if (edit) {
    await ctx.editMessageText(text, { reply_markup: kb }).catch(() => {
      ctx.reply(text, { reply_markup: kb });
    });
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}

async function showMonthlyStats(
  ctx: Context,
  prorabId: number,
  page: number,
  edit: boolean
): Promise<void> {
  const monthYear = currentMonthYear();
  const stats = await getMonthlyStats(prorabId, monthYear);

  if (stats.length === 0) {
    const text = "📊 Oylik davomat\n\nMa'lumot yo'q.";
    if (edit) {
      await ctx.editMessageText(text, {
        reply_markup: attendanceMenuKeyboard(),
      }).catch(() => ctx.reply(text, { reply_markup: attendanceMenuKeyboard() }));
    } else {
      await ctx.reply(text, { reply_markup: attendanceMenuKeyboard() });
    }
    return;
  }

  const totalPages = Math.max(1, Math.ceil(stats.length / PAGE_SIZE));
  const pageStats = stats.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const [year, month] = monthYear.split("-");
  const monthNames = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
  ];
  const monthName = monthNames[parseInt(month) - 1];

  const lines = pageStats.map((s, i) => {
    const num = (page - 1) * PAGE_SIZE + i + 1;
    return (
      `${num}. ${s.employee.fullName}\n` +
      `   ✅ ${s.fullDays} | ⏰ ${s.halfDays} | ❌ ${s.absentDays} | Jami: ${s.totalWorked} kun`
    );
  });

  const text =
    `📊 ${monthName} ${year} — Oylik davomat\n` +
    `(${stats.length} xodim)\n\n` +
    lines.join("\n\n");

  const kb = attendanceMonthKeyboard(page, totalPages);

  if (edit) {
    await ctx.editMessageText(text, { reply_markup: kb }).catch(() => {
      ctx.reply(text, { reply_markup: kb });
    });
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}
