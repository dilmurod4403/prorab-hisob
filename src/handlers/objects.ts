import {
  CommandContext,
  Context,
  CallbackQueryContext,
  NextFunction,
} from "grammy";
import { getProrab } from "../utils/prorab";
import { formatMoney } from "../utils/formatters";
import {
  objectListKeyboard,
  objectDetailKeyboard,
  confirmCompleteKeyboard,
  skipAddressKeyboard,
  confirmObjectKeyboard,
} from "../utils/keyboards";
import {
  getObjects,
  getObjectById,
  createObject,
  updateObjectStatus,
  getObjectFinanceSummary,
} from "../services/object.service";
import {
  getConversation,
  setConversation,
  clearConversation,
  ConversationState,
} from "../types/conversation";

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

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const STATUS_LABELS: Record<string, string> = {
  active: "🟢 Faol",
  completed: "✅ Tugallangan",
  paused: "⏸ To'xtatilgan",
};

// ─── /obyektlar command ───

export async function objectsCommand(
  ctx: CommandContext<Context>
): Promise<void> {
  const prorab = await requireProrab(ctx);
  if (!prorab) return;
  await showObjectList(ctx, prorab.id, "active", 1);
}

// ─── Callback query router ───

export async function objectsCallback(
  ctx: CallbackQueryContext<Context>
): Promise<void> {
  const prorab = await requireProrab(ctx);
  if (!prorab) return;

  const data = ctx.callbackQuery.data!;
  await ctx.answerCallbackQuery();

  // obj:list / obj:list:{page}
  if (data === "obj:list" || data.startsWith("obj:list:")) {
    const page = data === "obj:list" ? 1 : parseInt(data.split(":")[2], 10);
    await showObjectList(ctx, prorab.id, "active", page, true);
    return;
  }

  // obj:completed / obj:completed:{page}
  if (data === "obj:completed" || data.startsWith("obj:completed:")) {
    const page =
      data === "obj:completed" ? 1 : parseInt(data.split(":")[2], 10);
    await showObjectList(ctx, prorab.id, "completed", page, true);
    return;
  }

  // obj:detail:{id}
  if (data.startsWith("obj:detail:")) {
    const objId = parseInt(data.split(":")[2], 10);
    await showObjectDetail(ctx, objId, prorab.id);
    return;
  }

  // obj:complete:{id}
  if (
    data.startsWith("obj:complete:") &&
    !data.startsWith("obj:complete_yes:")
  ) {
    const objId = parseInt(data.split(":")[2], 10);
    const obj = await getObjectById(objId, prorab.id);
    if (!obj) return;
    await ctx.editMessageText(
      `✅ "${obj.name}" ob'ektini tugallanganlar qatoriga o'tkazmoqchimisiz?`,
      { reply_markup: confirmCompleteKeyboard(objId) }
    );
    return;
  }

  // obj:complete_yes:{id}
  if (data.startsWith("obj:complete_yes:")) {
    const objId = parseInt(data.split(":")[2], 10);
    const obj = await updateObjectStatus(objId, prorab.id, "completed");
    if (obj) {
      await ctx.editMessageText(`✅ "${obj.name}" tugallandi.`);
      await showObjectList(ctx, prorab.id, "active", 1);
    }
    return;
  }

  // obj:pause:{id}
  if (data.startsWith("obj:pause:")) {
    const objId = parseInt(data.split(":")[2], 10);
    const obj = await updateObjectStatus(objId, prorab.id, "paused");
    if (obj) {
      await ctx.editMessageText(`⏸ "${obj.name}" to'xtatildi.`);
      await showObjectList(ctx, prorab.id, "active", 1);
    }
    return;
  }

  // obj:resume:{id}
  if (data.startsWith("obj:resume:")) {
    const objId = parseInt(data.split(":")[2], 10);
    const obj = await updateObjectStatus(objId, prorab.id, "active");
    if (obj) {
      await ctx.editMessageText(`▶️ "${obj.name}" qayta faollashtirildi.`);
      await showObjectList(ctx, prorab.id, "active", 1);
    }
    return;
  }

  // ─── Add object flow (callback parts) ───

  if (data === "obj:add") {
    await setConversation(ctx.from!.id, {
      module: "object",
      step: "name",
      data: {},
    });
    await ctx.reply("🏗 Yangi ob'ekt\n\nOb'ekt nomini kiriting:");
    return;
  }

  if (data === "obj:add_skip_address") {
    const conv = await getConversation(ctx.from!.id);
    if (!conv || conv.module !== "object" || conv.step !== "address") return;

    conv.data.address = null;
    conv.step = "confirm";
    await setConversation(ctx.from!.id, conv);
    await showObjectConfirm(ctx, conv);
    return;
  }

  if (data === "obj:add_save") {
    const conv = await getConversation(ctx.from!.id);
    if (!conv || conv.module !== "object" || conv.step !== "confirm") return;

    const obj = await createObject({
      prorabId: prorab.id,
      name: conv.data.name!,
      clientName: conv.data.clientName!,
      contractAmount: BigInt(conv.data.contractAmount!),
      address: conv.data.address || null,
    });

    await clearConversation(ctx.from!.id);
    await ctx.editMessageText(
      `✅ Ob'ekt muvaffaqiyatli yaratildi!\n\n` +
        `🏗 ${obj.name}\n` +
        `👤 Buyurtmachi: ${obj.clientName}\n` +
        `💰 Shartnoma: ${formatMoney(obj.contractAmount)}`
    );
    await showObjectList(ctx, prorab.id, "active", 1);
    return;
  }

  if (data === "obj:add_cancel") {
    await clearConversation(ctx.from!.id);
    await ctx.editMessageText("❌ Ob'ekt yaratish bekor qilindi.");
    await showObjectList(ctx, prorab.id, "active", 1);
    return;
  }
}

// ─── Text handler for FSM ───

export async function objectsTextHandler(
  ctx: Context,
  next: NextFunction
): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return next();

  const conv = await getConversation(telegramId);
  if (!conv || conv.module !== "object") return next();

  const text = ctx.message?.text?.trim();
  if (!text) return next();

  const prorab = await getProrab(telegramId);
  if (!prorab) return next();

  switch (conv.step) {
    case "name":
      await handleNameStep(ctx, conv, telegramId, text);
      break;
    case "client":
      await handleClientStep(ctx, conv, telegramId, text);
      break;
    case "amount":
      await handleAmountStep(ctx, conv, telegramId, text);
      break;
    case "address":
      await handleAddressStep(ctx, conv, telegramId, text);
      break;
    default:
      return next();
  }
}

// ─── FSM step handlers ───

async function handleNameStep(
  ctx: Context,
  conv: ConversationState & { module: "object" },
  telegramId: number,
  text: string
): Promise<void> {
  if (text.length < 2) {
    await ctx.reply("❌ Nom kamida 2 ta belgidan iborat bo'lishi kerak:");
    return;
  }
  conv.data.name = text;
  conv.step = "client";
  await setConversation(telegramId, conv);
  await ctx.reply("👤 Buyurtmachi ismini kiriting:");
}

async function handleClientStep(
  ctx: Context,
  conv: ConversationState & { module: "object" },
  telegramId: number,
  text: string
): Promise<void> {
  if (text.length < 2) {
    await ctx.reply("❌ Ism kamida 2 ta belgidan iborat bo'lishi kerak:");
    return;
  }
  conv.data.clientName = text;
  conv.step = "amount";
  await setConversation(telegramId, conv);
  await ctx.reply("💰 Shartnoma summasini kiriting (so'mda):");
}

async function handleAmountStep(
  ctx: Context,
  conv: ConversationState & { module: "object" },
  telegramId: number,
  text: string
): Promise<void> {
  const cleaned = text.replace(/[\s,._]/g, "");
  const amount = parseInt(cleaned, 10);

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("❌ Noto'g'ri summa. Faqat raqam kiriting:");
    return;
  }

  conv.data.contractAmount = amount.toString();
  conv.step = "address";
  await setConversation(telegramId, conv);
  await ctx.reply(
    "📍 Manzilni kiriting\n\nYoki o'tkazib yuboring:",
    { reply_markup: skipAddressKeyboard() }
  );
}

async function handleAddressStep(
  ctx: Context,
  conv: ConversationState & { module: "object" },
  telegramId: number,
  text: string
): Promise<void> {
  conv.data.address = text;
  conv.step = "confirm";
  await setConversation(telegramId, conv);
  await showObjectConfirm(ctx, conv);
}

// ─── Display functions ───

async function showObjectList(
  ctx: Context,
  prorabId: number,
  status: string,
  page: number,
  edit: boolean = false
): Promise<void> {
  const result = await getObjects(prorabId, status, page);
  const isCompleted = status === "completed";
  const label = isCompleted ? "Tugallangan" : "Faol";

  let text: string;
  if (result.total === 0) {
    text = isCompleted
      ? "✅ Tugallangan ob'ektlar yo'q."
      : "🏗 Hozircha ob'ektlar yo'q.\n\n➕ Yangi ob'ekt qo'shish tugmasini bosing.";
  } else {
    const lines = result.objects.map((obj, i) => {
      const num = (page - 1) * 8 + i + 1;
      return (
        `${num}. ${obj.name}\n` +
        `   👤 ${obj.clientName} | 💰 ${formatMoney(obj.contractAmount)}`
      );
    });
    text = `🏗 ${label} ob'ektlar (${result.total} ta)\n\n${lines.join("\n\n")}`;
  }

  const kb = objectListKeyboard(result.objects, page, result.totalPages, status);

  if (edit) {
    await ctx.editMessageText(text, { reply_markup: kb }).catch(() => {
      ctx.reply(text, { reply_markup: kb });
    });
  } else {
    await ctx.reply(text, { reply_markup: kb });
  }
}

async function showObjectDetail(
  ctx: Context,
  objectId: number,
  prorabId: number
): Promise<void> {
  const obj = await getObjectById(objectId, prorabId);
  if (!obj) {
    await ctx.editMessageText("❌ Ob'ekt topilmadi.");
    return;
  }

  const fin = await getObjectFinanceSummary(objectId);
  const statusText = STATUS_LABELS[obj.status] || obj.status;

  let text =
    `🏗 ${obj.name}\n\n` +
    `👤 Buyurtmachi: ${obj.clientName}\n` +
    `📍 Manzil: ${obj.address || "kiritilmagan"}\n` +
    `📅 Boshlangan: ${formatDate(obj.startDate)}\n`;

  if (obj.endDate) {
    text += `📅 Tugallangan: ${formatDate(obj.endDate)}\n`;
  }

  text +=
    `${statusText}\n\n` +
    `── Moliyaviy xulosa ──\n` +
    `💰 Shartnoma: ${formatMoney(fin.contractAmount)}\n` +
    `💵 To'langan: ${formatMoney(fin.totalPayments)}\n` +
    `📊 Qoldiq: ${formatMoney(fin.paymentBalance)}\n\n` +
    `🧾 Xarajatlar: ${formatMoney(fin.totalExpenses)}\n` +
    `💰 Oyliklar: ${formatMoney(fin.totalSalaries)}\n` +
    `🎁 Premiyalar: ${formatMoney(fin.totalBonuses)}\n` +
    `📦 Jami xarajat: ${formatMoney(fin.totalCost)}\n\n`;

  if (fin.profit >= BigInt(0)) {
    text += `✅ Foyda: ${formatMoney(fin.profit)}`;
  } else {
    text += `🔴 Zarar: ${formatMoney(-fin.profit)}`;
  }

  await ctx.editMessageText(text, {
    reply_markup: objectDetailKeyboard(obj.id, obj.status),
  });
}

async function showObjectConfirm(
  ctx: Context,
  conv: ConversationState & { module: "object" }
): Promise<void> {
  const amount = parseInt(conv.data.contractAmount!);
  const text =
    `📋 Yangi ob'ekt ma'lumotlari:\n\n` +
    `🏗 Nom: ${conv.data.name}\n` +
    `👤 Buyurtmachi: ${conv.data.clientName}\n` +
    `💰 Shartnoma: ${formatMoney(amount)}\n` +
    `📍 Manzil: ${conv.data.address || "kiritilmagan"}\n\n` +
    `Saqlaysizmi?`;

  await ctx.reply(text, { reply_markup: confirmObjectKeyboard() });
}
