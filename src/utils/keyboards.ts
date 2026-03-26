import { InlineKeyboard } from "grammy";
import { Employee, Object as PrismaObject, Transaction } from "@prisma/client";

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("👥 Xodimlar", "employees")
    .text("🏗 Ob'ektlar", "objects")
    .row()
    .text("📋 Davomat", "attendance")
    .text("💰 Moliya", "finance")
    .row()
    .text("📈 Hisobotlar", "reports")
    .text("⚙️ Sozlamalar", "settings");
}

// ─── Employee keyboards ───

export function employeeListKeyboard(
  employees: Employee[],
  page: number,
  totalPages: number,
  isInactive: boolean = false
): InlineKeyboard {
  const kb = new InlineKeyboard();

  for (const emp of employees) {
    kb.text(`${emp.fullName}`, `emp:detail:${emp.id}`).row();
  }

  // Pagination
  if (totalPages > 1) {
    if (page > 1) {
      const prefix = isInactive ? "emp:inactive" : "emp:list";
      kb.text("⬅️ Oldingi", `${prefix}:${page - 1}`);
    }
    kb.text(`${page}/${totalPages}`, "noop");
    if (page < totalPages) {
      const prefix = isInactive ? "emp:inactive" : "emp:list";
      kb.text("Keyingi ➡️", `${prefix}:${page + 1}`);
    }
    kb.row();
  }

  // Action buttons
  if (isInactive) {
    kb.text("👥 Faol xodimlar", "emp:list").row();
  } else {
    kb.text("➕ Yangi xodim", "emp:add")
      .text("👻 Faolsizlar", "emp:inactive")
      .row();
  }

  kb.text("🔙 Asosiy menyu", "main_menu");
  return kb;
}

export function employeeDetailKeyboard(
  employeeId: number,
  isActive: boolean
): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (isActive) {
    kb.text("🚫 Faolsizlashtirish", `emp:deactivate:${employeeId}`);
  } else {
    kb.text("✅ Faollashtirish", `emp:activate:${employeeId}`);
  }
  kb.row().text("🔙 Orqaga", "emp:list");
  return kb;
}

export function positionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔧 Suvokchi", "emp:add_pos:Suvokchi")
    .text("⚡ Elektrik", "emp:add_pos:Elektrik")
    .row()
    .text("🔨 Usta", "emp:add_pos:Usta")
    .text("👷 Ishchi", "emp:add_pos:Ishchi")
    .row()
    .text("📝 Boshqa", "emp:add_pos:Boshqa")
    .row()
    .text("❌ Bekor qilish", "emp:add_cancel");
}

export function skipPhoneKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("⏭ O'tkazib yuborish", "emp:add_skip_phone")
    .row()
    .text("❌ Bekor qilish", "emp:add_cancel");
}

export function confirmEmployeeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Saqlash", "emp:add_save")
    .text("❌ Bekor qilish", "emp:add_cancel");
}

export function confirmDeactivateKeyboard(employeeId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("Ha, faolsizlashtirish", `emp:deactivate_yes:${employeeId}`)
    .text("Yo'q, orqaga", `emp:detail:${employeeId}`);
}

// ─── Finance keyboards ───

export function financeMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("💸 Avans berish", "fin:advance")
    .text("🎁 Premiya berish", "fin:bonus")
    .row()
    .text("🧾 Xarajat kiritish", "fin:expense")
    .text("💵 To'lov kiritish", "fin:payment")
    .row()
    .text("📜 Tarix", "fin:history")
    .row()
    .text("🔙 Asosiy menyu", "main_menu");
}

export function employeeSelectKeyboard(
  employees: Employee[],
  callbackPrefix: string
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const emp of employees) {
    kb.text(emp.fullName, `${callbackPrefix}:${emp.id}`).row();
  }
  kb.text("❌ Bekor qilish", "fin:cancel");
  return kb;
}

export function objectSelectKeyboard(
  objects: PrismaObject[],
  callbackPrefix: string
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const obj of objects) {
    kb.text(obj.name, `${callbackPrefix}:${obj.id}`).row();
  }
  kb.text("❌ Bekor qilish", "fin:cancel");
  return kb;
}

export function objectSelectWithSkipKeyboard(
  objects: PrismaObject[],
  callbackPrefix: string,
  skipCallback: string
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const obj of objects) {
    kb.text(obj.name, `${callbackPrefix}:${obj.id}`).row();
  }
  kb.text("⏭ Bog'lamasdan", skipCallback).row();
  kb.text("❌ Bekor qilish", "fin:cancel");
  return kb;
}

export function confirmFinanceKeyboard(confirmCallback: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Saqlash", confirmCallback)
    .text("❌ Bekor qilish", "fin:cancel");
}

export function advanceWarningKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("⚠️ Davom etish", "fin:adv_force")
    .text("❌ Bekor qilish", "fin:cancel");
}

export function transactionListKeyboard(
  page: number,
  totalPages: number
): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (totalPages > 1) {
    if (page > 1) kb.text("⬅️ Oldingi", `fin:history:${page - 1}`);
    kb.text(`${page}/${totalPages}`, "noop");
    if (page < totalPages) kb.text("Keyingi ➡️", `fin:history:${page + 1}`);
    kb.row();
  }
  kb.text("🔙 Moliya menyu", "fin:menu");
  return kb;
}

// ─── Object keyboards ───

export function objectListKeyboard(
  objects: PrismaObject[],
  page: number,
  totalPages: number,
  status: string = "active"
): InlineKeyboard {
  const kb = new InlineKeyboard();

  for (const obj of objects) {
    kb.text(obj.name, `obj:detail:${obj.id}`).row();
  }

  if (totalPages > 1) {
    const prefix = status === "active" ? "obj:list" : "obj:completed";
    if (page > 1) kb.text("⬅️ Oldingi", `${prefix}:${page - 1}`);
    kb.text(`${page}/${totalPages}`, "noop");
    if (page < totalPages) kb.text("Keyingi ➡️", `${prefix}:${page + 1}`);
    kb.row();
  }

  if (status === "active") {
    kb.text("➕ Yangi ob'ekt", "obj:add")
      .text("✅ Tugallanganlar", "obj:completed")
      .row();
  } else {
    kb.text("🏗 Faol ob'ektlar", "obj:list").row();
  }

  kb.text("🔙 Asosiy menyu", "main_menu");
  return kb;
}

export function objectDetailKeyboard(
  objectId: number,
  status: string
): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (status === "active") {
    kb.text("✅ Tugallash", `obj:complete:${objectId}`)
      .text("⏸ To'xtatish", `obj:pause:${objectId}`);
  } else if (status === "paused") {
    kb.text("▶️ Davom ettirish", `obj:resume:${objectId}`);
  }
  kb.row().text("🔙 Orqaga", "obj:list");
  return kb;
}

export function confirmCompleteKeyboard(objectId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("Ha, tugallash", `obj:complete_yes:${objectId}`)
    .text("Yo'q, orqaga", `obj:detail:${objectId}`);
}

export function skipAddressKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("⏭ O'tkazib yuborish", "obj:add_skip_address")
    .row()
    .text("❌ Bekor qilish", "obj:add_cancel");
}

export function confirmObjectKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Saqlash", "obj:add_save")
    .text("❌ Bekor qilish", "obj:add_cancel");
}

// ─── Attendance keyboards ───

export function attendanceMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📅 Bugungi davomat", "att:today")
    .row()
    .text("📆 Boshqa kun", "att:other_date")
    .text("📊 Oylik hisobot", "att:month")
    .row()
    .text("🔙 Asosiy menyu", "main_menu");
}

export function attendanceDayKeyboard(
  rows: { employee: Employee; statusIcon: string }[],
  dateStr: string
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const row of rows) {
    kb.text(
      `${row.statusIcon} ${row.employee.fullName}`,
      `att:mark:${row.employee.id}:${dateStr}`
    ).row();
  }
  kb.text("🔙 Davomat menyu", "att:menu");
  return kb;
}

export function attendanceStatusKeyboard(
  empId: number,
  dateStr: string
): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ To'la ishchi", `att:set:${empId}:${dateStr}:full`)
    .text("⏰ Yarim kun", `att:set:${empId}:${dateStr}:half`)
    .row()
    .text("❌ Sababli", `att:set:${empId}:${dateStr}:absent_reason`)
    .text("❌ Yo'q", `att:set:${empId}:${dateStr}:absent`)
    .row()
    .text("🔙 Orqaga", `att:date:${dateStr}`);
}

export function attendanceMonthKeyboard(
  page: number,
  totalPages: number
): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (totalPages > 1) {
    if (page > 1) kb.text("⬅️ Oldingi", `att:month:${page - 1}`);
    kb.text(`${page}/${totalPages}`, "noop");
    if (page < totalPages) kb.text("Keyingi ➡️", `att:month:${page + 1}`);
    kb.row();
  }
  kb.text("🔙 Davomat menyu", "att:menu");
  return kb;
}

// ─── Settings keyboards ───

export function settingsMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔒 Oyni yopish", "set:close_month")
    .row()
    .text("💰 Avans limiti", "set:adv_limit")
    .text("👤 Profil", "set:profile")
    .row()
    .text("🔙 Asosiy menyu", "main_menu");
}

export function confirmMonthCloseKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Ha, yopish", "set:confirm_close")
    .text("❌ Bekor qilish", "set:menu");
}

export function confirmLimitKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Saqlash", "set:confirm_limit")
    .text("❌ Bekor qilish", "set:menu");
}

// ─── Reports keyboards ───

export function reportsMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("💰 Oylik moliyaviy", "rep:monthly")
    .row()
    .text("👥 Xodimlar", "rep:employees")
    .text("🏗 Ob'ektlar", "rep:objects")
    .row()
    .text("📋 Davomat", "rep:attendance")
    .row()
    .text("🔙 Asosiy menyu", "main_menu");
}

export function reportBackKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text("🔙 Hisobotlar", "rep:menu");
}

export function reportPaginatedKeyboard(
  prefix: string,
  page: number,
  totalPages: number
): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (totalPages > 1) {
    if (page > 1) kb.text("⬅️ Oldingi", `${prefix}:${page - 1}`);
    kb.text(`${page}/${totalPages}`, "noop");
    if (page < totalPages) kb.text("Keyingi ➡️", `${prefix}:${page + 1}`);
    kb.row();
  }
  kb.text("🔙 Hisobotlar", "rep:menu");
  return kb;
}
