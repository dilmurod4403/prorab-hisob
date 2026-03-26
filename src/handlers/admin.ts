import { CommandContext, Context, CallbackQueryContext, NextFunction } from "grammy";
import { config } from "../config";
import { prisma } from "../db";
import { escapeHtml, formatMoney, MAX_NAME_LENGTH } from "../utils/formatters";
import { InlineKeyboard } from "grammy";
import {
  getConversation,
  setConversation,
  clearConversation,
  ConversationState,
} from "../types/conversation";

// ─── Helpers ───

function isAdmin(telegramId: number): boolean {
  return BigInt(telegramId) === config.adminTelegramId;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Keyboards ───

function adminMenuKeyboard(
  pendingList: { id: number; fullName: string }[]
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const p of pendingList) {
    kb.text(`⏳ ${p.fullName}`, `adm:detail:${p.id}`).row();
  }
  kb.text("➕ Prorab qo'shish", "adm:add")
    .text("📊 Hisobot", "adm:stats")
    .row();
  kb.text("📋 Barcha prorablar", "adm:all").row();
  return kb;
}

function prorabDetailKeyboard(
  prorabId: number,
  approved: boolean
): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (!approved) {
    kb.text("✅ Tasdiqlash", `adm:approve:${prorabId}`)
      .text("❌ Rad etish", `adm:reject:${prorabId}`);
  } else {
    kb.text("🚫 Bloklash", `adm:block:${prorabId}`);
  }
  kb.row().text("🔙 Orqaga", "adm:menu");
  return kb;
}

function skipPhoneKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("⏭ O'tkazib yuborish", "adm:add_skip_phone")
    .row()
    .text("❌ Bekor qilish", "adm:add_cancel");
}

function confirmAddKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Saqlash", "adm:add_save")
    .text("❌ Bekor qilish", "adm:add_cancel");
}

// ─── /admin command ───

export async function adminCommand(
  ctx: CommandContext<Context>
): Promise<void> {
  if (!ctx.from?.id || !isAdmin(ctx.from.id)) {
    await ctx.reply("⛔ Bu buyruq faqat admin uchun.");
    return;
  }
  await showAdminMenu(ctx, false);
}

// ─── Callback router ───

export async function adminCallback(
  ctx: CallbackQueryContext<Context>
): Promise<void> {
  if (!ctx.from?.id || !isAdmin(ctx.from.id)) {
    await ctx.answerCallbackQuery({ text: "⛔ Ruxsat yo'q", show_alert: true });
    return;
  }

  const data = ctx.callbackQuery.data!;
  await ctx.answerCallbackQuery();

  // adm:menu
  if (data === "adm:menu") {
    await clearConversation(ctx.from!.id);
    await showAdminMenu(ctx, true);
    return;
  }

  // adm:stats — overall stats
  if (data === "adm:stats") {
    await showStats(ctx);
    return;
  }

  // adm:pstats:{id} — per-prorab detailed stats
  if (data.startsWith("adm:pstats:")) {
    const prorabId = parseInt(data.split(":")[2], 10);
    await showProrabStats(ctx, prorabId);
    return;
  }

  // adm:all — show all prorab
  if (data === "adm:all") {
    await showAllProrabs(ctx);
    return;
  }

  // adm:detail:{id}
  if (data.startsWith("adm:detail:")) {
    const prorabId = parseInt(data.split(":")[2], 10);
    await showProrabDetail(ctx, prorabId);
    return;
  }

  // adm:approve:{id}
  if (data.startsWith("adm:approve:")) {
    const prorabId = parseInt(data.split(":")[2], 10);
    await approveProrab(ctx, prorabId);
    return;
  }

  // adm:reject:{id}
  if (data.startsWith("adm:reject:")) {
    const prorabId = parseInt(data.split(":")[2], 10);
    await rejectProrab(ctx, prorabId);
    return;
  }

  // adm:approve_tg:{telegramId} — from notification
  if (data.startsWith("adm:approve_tg:")) {
    const tgId = BigInt(data.split(":")[2]);
    const prorab = await prisma.prorab.findUnique({
      where: { telegramId: tgId },
    });
    if (prorab) await approveProrab(ctx, prorab.id);
    return;
  }

  // adm:reject_tg:{telegramId} — from notification
  if (data.startsWith("adm:reject_tg:")) {
    const tgId = BigInt(data.split(":")[2]);
    const prorab = await prisma.prorab.findUnique({
      where: { telegramId: tgId },
    });
    if (prorab) await rejectProrab(ctx, prorab.id);
    return;
  }

  // adm:block:{id}
  if (data.startsWith("adm:block:")) {
    const prorabId = parseInt(data.split(":")[2], 10);
    await blockProrab(ctx, prorabId);
    return;
  }

  // ─── Add prorab flow ───

  // adm:add — start adding prorab
  if (data === "adm:add") {
    await setConversation(ctx.from!.id, {
      module: "admin",
      step: "telegram_id",
      data: {},
    });
    await ctx.editMessageText(
      "➕ Yangi prorab qo'shish\n\n" +
        "Prorabning Telegram ID raqamini kiriting:\n\n" +
        "💡 Foydalanuvchi @userinfobot ga yozib ID'sini bilishi mumkin."
    );
    return;
  }

  // adm:add_skip_phone
  if (data === "adm:add_skip_phone") {
    const conv = await getConversation(ctx.from!.id);
    if (!conv || conv.module !== "admin" || conv.step !== "phone") return;

    conv.data.phone = null;
    conv.step = "confirm";
    await setConversation(ctx.from!.id, conv);
    await showAddConfirm(ctx, conv);
    return;
  }

  // adm:add_save
  if (data === "adm:add_save") {
    const conv = await getConversation(ctx.from!.id);
    if (!conv || conv.module !== "admin" || conv.step !== "confirm") return;

    const tgId = BigInt(conv.data.telegramId!);

    // Check if already exists
    const existing = await prisma.prorab.findUnique({
      where: { telegramId: tgId },
    });
    if (existing) {
      await clearConversation(ctx.from!.id);
      await ctx.editMessageText(
        `❌ Bu Telegram ID (${tgId}) allaqachon ro'yxatda.`,
        { reply_markup: new InlineKeyboard().text("🔙 Admin panel", "adm:menu") }
      );
      return;
    }

    const prorab = await prisma.prorab.create({
      data: {
        telegramId: tgId,
        fullName: conv.data.fullName!,
        phone: conv.data.phone || null,
        approved: true,
      },
    });

    await clearConversation(ctx.from!.id);
    await ctx.editMessageText(
      `✅ Prorab muvaffaqiyatli qo'shildi!\n\n` +
        `👤 ${escapeHtml(prorab.fullName)}\n` +
        `📱 Telegram ID: ${prorab.telegramId}\n` +
        `📞 Telefon: ${prorab.phone || "kiritilmagan"}\n\n` +
        `Prorab botga /start yuborganda avtomatik kiritiladi.`,
      {
        reply_markup: new InlineKeyboard().text("🔙 Admin panel", "adm:menu"),
      }
    );
    return;
  }

  // adm:add_cancel
  if (data === "adm:add_cancel") {
    await clearConversation(ctx.from!.id);
    await ctx.editMessageText("❌ Prorab qo'shish bekor qilindi.");
    await showAdminMenu(ctx, false);
    return;
  }
}

// ─── Text handler for admin FSM ───

export async function adminTextHandler(
  ctx: Context,
  next: NextFunction
): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId || !isAdmin(telegramId)) return next();

  const conv = await getConversation(telegramId);
  if (!conv || conv.module !== "admin") return next();

  const text = ctx.message?.text?.trim();
  if (!text) return next();

  switch (conv.step) {
    case "telegram_id":
      await handleTelegramIdStep(ctx, conv, telegramId, text);
      break;
    case "name":
      await handleNameStep(ctx, conv, telegramId, text);
      break;
    case "phone":
      await handlePhoneStep(ctx, conv, telegramId, text);
      break;
    default:
      return next();
  }
}

// ─── FSM step handlers ───

async function handleTelegramIdStep(
  ctx: Context,
  conv: ConversationState & { module: "admin" },
  telegramId: number,
  text: string
): Promise<void> {
  const cleaned = text.replace(/\s/g, "");

  // Telegram ID: faqat raqam, 5-15 xonali
  if (!/^\d{5,15}$/.test(cleaned)) {
    await ctx.reply("❌ Noto'g'ri format. Faqat raqam kiriting (masalan: 123456789):");
    return;
  }

  // Check if already exists
  const existing = await prisma.prorab.findUnique({
    where: { telegramId: BigInt(cleaned) },
  });
  if (existing) {
    await ctx.reply(
      `❌ Bu Telegram ID (${cleaned}) allaqachon ro'yxatda: ${existing.fullName}\n\n` +
        `Boshqa ID kiriting yoki /admin orqali qaytadan boshlang.`
    );
    return;
  }

  conv.data.telegramId = cleaned;
  conv.step = "name";
  await setConversation(telegramId, conv);
  await ctx.reply("👤 Prorabning to'liq ismini kiriting (F.I.O):");
}

async function handleNameStep(
  ctx: Context,
  conv: ConversationState & { module: "admin" },
  telegramId: number,
  text: string
): Promise<void> {
  if (text.length < 2 || text.length > MAX_NAME_LENGTH) {
    await ctx.reply(`❌ Ism 2 dan ${MAX_NAME_LENGTH} gacha belgi bo'lishi kerak:`);
    return;
  }

  conv.data.fullName = text;
  conv.step = "phone";
  await setConversation(telegramId, conv);
  await ctx.reply(
    "📞 Telefon raqamini kiriting (masalan: +998901234567)\n\nYoki o'tkazib yuboring:",
    { reply_markup: skipPhoneKeyboard() }
  );
}

async function handlePhoneStep(
  ctx: Context,
  conv: ConversationState & { module: "admin" },
  telegramId: number,
  text: string
): Promise<void> {
  const cleaned = text.replace(/[\s\-()]/g, "");
  if (cleaned.length < 9 || !/^\+?\d+$/.test(cleaned)) {
    await ctx.reply(
      "❌ Telefon raqami noto'g'ri formatda.\nMasalan: +998901234567\n\nQaytadan kiriting yoki o'tkazib yuboring:",
      { reply_markup: skipPhoneKeyboard() }
    );
    return;
  }

  conv.data.phone = cleaned;
  conv.step = "confirm";
  await setConversation(telegramId, conv);
  await showAddConfirm(ctx, conv);
}

// ─── Display functions ───

async function showAddConfirm(
  ctx: Context,
  conv: ConversationState & { module: "admin" }
): Promise<void> {
  const text =
    `📋 Yangi prorab ma'lumotlari:\n\n` +
    `📱 Telegram ID: ${conv.data.telegramId}\n` +
    `👤 Ism: ${conv.data.fullName}\n` +
    `📞 Telefon: ${conv.data.phone || "kiritilmagan"}\n\n` +
    `✅ Avtomatik tasdiqlanadi.\n\nSaqlaysizmi?`;

  await ctx.reply(text, { reply_markup: confirmAddKeyboard() });
}

async function showAdminMenu(ctx: Context, edit: boolean): Promise<void> {
  const pending = await prisma.prorab.findMany({
    where: { approved: false },
    orderBy: { createdAt: "desc" },
  });

  let text: string;
  if (pending.length === 0) {
    text = "👑 Admin panel\n\nKutilayotgan so'rovlar yo'q.";
  } else {
    text = `👑 Admin panel\n\n⏳ Kutilayotgan so'rovlar: ${pending.length}`;
  }

  const kb = adminMenuKeyboard(pending);

  if (edit) {
    await ctx.editMessageText(text, { reply_markup: kb }).catch(() => {
      ctx.reply(text, { reply_markup: kb });
    });
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}

async function showAllProrabs(ctx: Context): Promise<void> {
  const all = await prisma.prorab.findMany({
    orderBy: { createdAt: "desc" },
  });

  if (all.length === 0) {
    await ctx.editMessageText("Prorablar yo'q.", {
      reply_markup: new InlineKeyboard().text("🔙 Orqaga", "adm:menu"),
    });
    return;
  }

  const lines = all.map((p, i) => {
    const status = p.approved ? "✅" : "⏳";
    return `${i + 1}. ${status} ${escapeHtml(p.fullName)}`;
  });

  const kb = new InlineKeyboard();
  for (const p of all) {
    const icon = p.approved ? "✅" : "⏳";
    kb.text(`${icon} ${p.fullName}`, `adm:detail:${p.id}`).row();
  }
  kb.text("🔙 Orqaga", "adm:menu");

  await ctx.editMessageText(
    `👑 Barcha prorablar (${all.length}):\n\n` + lines.join("\n"),
    { reply_markup: kb }
  );
}

async function showProrabDetail(ctx: Context, prorabId: number): Promise<void> {
  const prorab = await prisma.prorab.findUnique({ where: { id: prorabId } });
  if (!prorab) {
    await ctx.editMessageText("❌ Prorab topilmadi.");
    return;
  }

  const empCount = await prisma.employee.count({
    where: { prorabId: prorab.id },
  });
  const objCount = await prisma.object.count({
    where: { prorabId: prorab.id },
  });

  const status = prorab.approved ? "✅ Tasdiqlangan" : "⏳ Kutilmoqda";

  const text =
    `👤 ${escapeHtml(prorab.fullName)}\n\n` +
    `📱 Telegram ID: <code>${prorab.telegramId}</code>\n` +
    `📞 Telefon: ${prorab.phone || "kiritilmagan"}\n` +
    `📊 Holat: ${status}\n` +
    `📅 Ro'yxatdan: ${formatDate(prorab.createdAt)}\n\n` +
    `👥 Xodimlar: ${empCount}\n` +
    `🏗 Ob'ektlar: ${objCount}`;

  await ctx.editMessageText(text, {
    parse_mode: "HTML",
    reply_markup: prorabDetailKeyboard(prorab.id, prorab.approved),
  });
}

async function approveProrab(ctx: Context, prorabId: number): Promise<void> {
  const prorab = await prisma.prorab.update({
    where: { id: prorabId },
    data: { approved: true },
  });

  await ctx.editMessageText(
    `✅ ${escapeHtml(prorab.fullName)} tasdiqlandi!`,
    { reply_markup: new InlineKeyboard().text("🔙 Admin panel", "adm:menu") }
  );

  // Notify user
  try {
    await ctx.api.sendMessage(
      prorab.telegramId.toString(),
      "✅ Sizning hisobingiz admin tomonidan tasdiqlandi!\n\nEndi botdan foydalanishingiz mumkin.",
      {
        reply_markup: new InlineKeyboard()
          .text("📱 Asosiy menyu", "main_menu_fresh"),
      }
    );
  } catch {
    // User may have blocked the bot
  }
}

async function rejectProrab(ctx: Context, prorabId: number): Promise<void> {
  const prorab = await prisma.prorab.findUnique({ where: { id: prorabId } });
  if (!prorab) return;

  await prisma.prorab.delete({ where: { id: prorabId } });

  await ctx.editMessageText(
    `❌ ${escapeHtml(prorab.fullName)} rad etildi va o'chirildi.`,
    { reply_markup: new InlineKeyboard().text("🔙 Admin panel", "adm:menu") }
  );

  try {
    await ctx.api.sendMessage(
      prorab.telegramId.toString(),
      "❌ Sizning so'rovingiz admin tomonidan rad etildi."
    );
  } catch {
    // User may have blocked the bot
  }
}

async function blockProrab(ctx: Context, prorabId: number): Promise<void> {
  const prorab = await prisma.prorab.update({
    where: { id: prorabId },
    data: { approved: false },
  });

  await ctx.editMessageText(
    `🚫 ${escapeHtml(prorab.fullName)} bloklandi.`,
    { reply_markup: new InlineKeyboard().text("🔙 Admin panel", "adm:menu") }
  );

  try {
    await ctx.api.sendMessage(
      prorab.telegramId.toString(),
      "🚫 Sizning hisobingiz admin tomonidan bloklandi."
    );
  } catch {
    // User may have blocked the bot
  }
}

// ─── Stats / Reports ───

function currentMonthYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(monthYear: string): string {
  const monthNames = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
  ];
  const [year, month] = monthYear.split("-");
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

async function showStats(ctx: Context): Promise<void> {
  const monthYear = currentMonthYear();

  const prorabs = await prisma.prorab.findMany({
    where: { approved: true },
    orderBy: { fullName: "asc" },
  });

  if (prorabs.length === 0) {
    await ctx.editMessageText("📊 Tasdiqlangan prorablar yo'q.", {
      reply_markup: new InlineKeyboard().text("🔙 Orqaga", "adm:menu"),
    });
    return;
  }

  const lines: string[] = [];

  for (let i = 0; i < prorabs.length; i++) {
    const p = prorabs[i];

    const [empCount, objCount, txCount, txSum] = await Promise.all([
      prisma.employee.count({ where: { prorabId: p.id, status: "active" } }),
      prisma.object.count({ where: { prorabId: p.id, status: "active" } }),
      prisma.transaction.count({ where: { prorabId: p.id, monthYear } }),
      prisma.transaction.aggregate({
        where: { prorabId: p.id, monthYear },
        _sum: { amount: true },
      }),
    ]);

    const total = txSum._sum.amount ?? BigInt(0);

    lines.push(
      `${i + 1}. ${escapeHtml(p.fullName)}\n` +
        `   👥 ${empCount} xodim | 🏗 ${objCount} ob'ekt\n` +
        `   💰 ${txCount} ta operatsiya — ${formatMoney(total)}`
    );
  }

  const text =
    `📊 Prorablar hisoboti — ${monthLabel(monthYear)}\n` +
    `(${prorabs.length} prorab)\n\n` +
    lines.join("\n\n");

  const kb = new InlineKeyboard();
  for (const p of prorabs) {
    kb.text(`📊 ${p.fullName}`, `adm:pstats:${p.id}`).row();
  }
  kb.text("🔙 Orqaga", "adm:menu");

  await ctx.editMessageText(text, { reply_markup: kb });
}

async function showProrabStats(ctx: Context, prorabId: number): Promise<void> {
  const prorab = await prisma.prorab.findUnique({ where: { id: prorabId } });
  if (!prorab) {
    await ctx.editMessageText("❌ Prorab topilmadi.");
    return;
  }

  const monthYear = currentMonthYear();

  const [
    activeEmps,
    totalEmps,
    activeObjs,
    totalObjs,
    advanceSum,
    bonusSum,
    expenseSum,
    paymentSum,
    salarySum,
    txCount,
    lastTx,
    monthClosed,
  ] = await Promise.all([
    prisma.employee.count({ where: { prorabId, status: "active" } }),
    prisma.employee.count({ where: { prorabId } }),
    prisma.object.count({ where: { prorabId, status: "active" } }),
    prisma.object.count({ where: { prorabId } }),
    prisma.transaction.aggregate({
      where: { prorabId, monthYear, type: "advance" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { prorabId, monthYear, type: "bonus" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { prorabId, monthYear, type: "expense" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { prorabId, monthYear, type: "payment" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { prorabId, monthYear, type: "salary" },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: { prorabId, monthYear } }),
    prisma.transaction.findFirst({
      where: { prorabId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.monthClose.findUnique({
      where: { prorabId_monthYear: { prorabId, monthYear } },
    }),
  ]);

  const advance = advanceSum._sum.amount ?? BigInt(0);
  const bonus = bonusSum._sum.amount ?? BigInt(0);
  const expense = expenseSum._sum.amount ?? BigInt(0);
  const payment = paymentSum._sum.amount ?? BigInt(0);
  const salary = salarySum._sum.amount ?? BigInt(0);

  const lastActivity = lastTx
    ? formatDate(lastTx.createdAt)
    : "hali yo'q";

  const monthStatus = monthClosed ? "🔒 Yopilgan" : "🔓 Ochiq";

  const text =
    `📊 ${escapeHtml(prorab.fullName)} — ${monthLabel(monthYear)}\n\n` +
    `── Umumiy ──\n` +
    `👥 Xodimlar: ${activeEmps} faol / ${totalEmps} jami\n` +
    `🏗 Ob'ektlar: ${activeObjs} faol / ${totalObjs} jami\n` +
    `📅 Oxirgi faollik: ${lastActivity}\n` +
    `${monthStatus}\n\n` +
    `── Joriy oy (${txCount} operatsiya) ──\n` +
    `💵 To'lovlar: ${formatMoney(payment)}\n` +
    `💸 Avanslar: ${formatMoney(advance)}\n` +
    `🎁 Premiyalar: ${formatMoney(bonus)}\n` +
    `🧾 Xarajatlar: ${formatMoney(expense)}\n` +
    `💰 Oyliklar: ${formatMoney(salary)}\n\n` +
    `📥 Kirim: ${formatMoney(payment)}\n` +
    `📤 Chiqim: ${formatMoney(advance + bonus + expense + salary)}`;

  await ctx.editMessageText(text, {
    reply_markup: new InlineKeyboard()
      .text("🔙 Umumiy hisobot", "adm:stats")
      .row()
      .text("🔙 Admin panel", "adm:menu"),
  });
}

// ─── Notify admin about new registration ───

export async function notifyAdminNewUser(
  ctx: Context,
  fullName: string,
  telegramId: bigint
): Promise<void> {
  try {
    await ctx.api.sendMessage(
      config.adminTelegramId.toString(),
      `🆕 Yangi foydalanuvchi ro'yxatdan o'tdi!\n\n` +
        `👤 ${escapeHtml(fullName)}\n` +
        `📱 Telegram ID: ${telegramId}\n\n` +
        `Tasdiqlaysizmi?`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("✅ Tasdiqlash", `adm:approve_tg:${telegramId}`)
          .text("❌ Rad etish", `adm:reject_tg:${telegramId}`),
      }
    );
  } catch {
    // Admin may have not started the bot yet
  }
}
