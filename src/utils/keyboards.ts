import { InlineKeyboard } from "grammy";

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
