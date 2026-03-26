import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, TableRow, TableCell, Table,
  WidthType, ShadingType,
} from "docx";
import * as fs from "fs";
import * as path from "path";

// ─── Helpers ───

function heading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel]) {
  return new Paragraph({ heading: level, spacing: { before: 300, after: 100 }, children: [new TextRun({ text, bold: true })] });
}

function para(text: string, bold = false) {
  return new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text, bold })] });
}

function bulletItem(text: string, bold?: string) {
  const children: TextRun[] = [];
  if (bold) {
    children.push(new TextRun({ text: bold, bold: true }));
    children.push(new TextRun({ text }));
  } else {
    children.push(new TextRun({ text }));
  }
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children });
}

function numberedItem(text: string) {
  return new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text })] });
}

function note(text: string) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: { left: 400 },
    children: [new TextRun({ text: "⚠️ " + text, italics: true })],
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 100 }, children: [] });
}

function tableRow(cells: string[], header = false) {
  return new TableRow({
    children: cells.map(c => new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      shading: header ? { type: ShadingType.SOLID, color: "E8E8E8" } : undefined,
      children: [new Paragraph({ children: [new TextRun({ text: c, bold: header })] })],
    })),
  });
}

// ─── Document ───

const doc = new Document({
  numbering: {
    config: [{
      reference: "steps",
      levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START, style: { paragraph: { indent: { left: 400, hanging: 200 } } } }],
    }],
  },
  sections: [{
    properties: {},
    children: [
      // Title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "PRORAB HISOB-KITOB", bold: true, size: 48 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: "Foydalanuvchi Qo'llanmasi", size: 32 })],
      }),

      // 1. Kirish
      heading("1. Kirish", HeadingLevel.HEADING_1),
      para("Prorab Hisob-Kitob — qurilish prorablar uchun mo'ljallangan Telegram bot. Bu bot orqali siz:"),
      bulletItem("Xodimlarni boshqarasiz (qo'shish, oylik belgilash)"),
      bulletItem("Moliyaviy operatsiyalar kiritasiz (avans, premiya, xarajat, to'lov)"),
      bulletItem("Ob'ektlarni boshqarasiz (shartnoma, xarajat, foyda hisobi)"),
      bulletItem("Kunlik davomatni belgilaysiz"),
      bulletItem("Oylik hisobotlarni ko'rasiz"),
      bulletItem("Oy yakunini chiqarasiz"),

      // 2. Botga kirish
      heading("2. Botga kirish", HeadingLevel.HEADING_1),
      para("Botga kirish uchun admin sizni ro'yxatga olishi kerak. Admin sizning Telegram ID raqamingizni botga kiritadi."),
      emptyLine(),
      para("Telegram ID'ingizni bilish uchun:", true),
      numberedItem("Telegram'da @userinfobot ga yozing"),
      numberedItem("U sizga ID raqamingizni ko'rsatadi"),
      numberedItem("Bu raqamni admin'ga yuboring"),
      emptyLine(),
      para("Admin sizni qo'shgandan keyin, botga /start yuboring — asosiy menyu ochiladi."),

      // 3. Asosiy menyu
      heading("3. Asosiy menyu", HeadingLevel.HEADING_1),
      para("/start yoki /menu buyrug'i bilan asosiy menyuga qaytishingiz mumkin:"),
      emptyLine(),
      bulletItem("👥 Xodimlar — xodimlarni boshqarish"),
      bulletItem("🏗 Ob'ektlar — qurilish ob'ektlari"),
      bulletItem("📋 Davomat — kunlik davomat"),
      bulletItem("💰 Moliya — moliyaviy operatsiyalar"),
      bulletItem("📈 Hisobotlar — oylik hisobotlar"),
      bulletItem("⚙️ Sozlamalar — bot sozlamalari"),

      // 4. Xodimlar
      heading("4. Xodimlar boshqaruvi", HeadingLevel.HEADING_1),
      para("Buyruq: /xodimlar yoki asosiy menyudan \"👥 Xodimlar\""),
      emptyLine(),
      heading("Yangi xodim qo'shish", HeadingLevel.HEADING_2),
      numberedItem("\"➕ Yangi xodim\" tugmasini bosing"),
      numberedItem("Ism kiriting (F.I.O)"),
      numberedItem("Lavozim tanlang (Suvokchi, Elektrik, Usta, Ishchi, Boshqa)"),
      numberedItem("Telefon raqam kiriting yoki o'tkazib yuboring"),
      numberedItem("Oylik maosh summasini kiriting (masalan: 5000000)"),
      numberedItem("Tasdiqlang"),
      emptyLine(),
      heading("Xodim ma'lumotlarini ko'rish", HeadingLevel.HEADING_2),
      para("Ro'yxatdan xodim ismini bosing — oylik maosh, lavozim, telefon, ishga olingan sana ko'rinadi."),
      emptyLine(),
      heading("Faolsizlashtirish", HeadingLevel.HEADING_2),
      para("Xodim sahifasida \"🚫 Faolsizlashtirish\" bosing. Faolsiz xodimlar \"👻 Faolsizlar\" bo'limida ko'rinadi. Qayta faollashtirish mumkin."),

      // 5. Moliya
      heading("5. Moliya bo'limi", HeadingLevel.HEADING_1),
      para("Buyruq: /moliya yoki asosiy menyudan \"💰 Moliya\""),
      emptyLine(),

      heading("5.1. Avans berish", HeadingLevel.HEADING_2),
      numberedItem("\"💸 Avans berish\" bosing"),
      numberedItem("Xodimni tanlang"),
      numberedItem("Summa kiriting"),
      numberedItem("Agar avans chegarasidan oshsa — ogohlantirish chiqadi"),
      numberedItem("Tasdiqlang"),
      note("Avans chegarasi: Har bir xodimga oylik maoshining ma'lum foizi (standart: 80%) gacha avans beriladi. Sozlamalar orqali o'zgartiriladi."),

      heading("5.2. Premiya berish", HeadingLevel.HEADING_2),
      numberedItem("\"🎁 Premiya berish\" bosing"),
      numberedItem("Xodimni tanlang"),
      numberedItem("Summa kiriting"),
      numberedItem("Sabab kiriting (majburiy)"),
      numberedItem("Ob'ektga bog'lash (ixtiyoriy)"),
      numberedItem("Tasdiqlang"),

      heading("5.3. Xarajat kiritish", HeadingLevel.HEADING_2),
      numberedItem("\"🧾 Xarajat kiritish\" bosing"),
      numberedItem("Ob'ektni tanlang"),
      numberedItem("Summa kiriting"),
      numberedItem("Izoh kiriting (masalan: sement, qum, temir)"),
      numberedItem("Tasdiqlang"),

      heading("5.4. To'lov kiritish (buyurtmachidan)", HeadingLevel.HEADING_2),
      numberedItem("\"💵 To'lov kiritish\" bosing"),
      numberedItem("Ob'ektni tanlang (shartnoma summasi va qoldiq ko'rinadi)"),
      numberedItem("Summa kiriting"),
      numberedItem("Tasdiqlang"),

      heading("5.5. Tarix ko'rish", HeadingLevel.HEADING_2),
      para("\"📜 Tarix\" — joriy oydagi barcha operatsiyalar ro'yxati. Sahifalangan (8 tadan)."),

      // 6. Ob'ektlar
      heading("6. Ob'ektlar boshqaruvi", HeadingLevel.HEADING_1),
      para("Buyruq: /obyektlar yoki asosiy menyudan \"🏗 Ob'ektlar\""),
      emptyLine(),

      heading("Yangi ob'ekt yaratish", HeadingLevel.HEADING_2),
      numberedItem("\"➕ Yangi ob'ekt\" bosing"),
      numberedItem("Nom kiriting (masalan: Navoiy ko'cha 15-uy)"),
      numberedItem("Buyurtmachi ismini kiriting"),
      numberedItem("Shartnoma summasini kiriting"),
      numberedItem("Manzil kiriting yoki o'tkazib yuboring"),
      numberedItem("Tasdiqlang"),

      heading("Ob'ekt ma'lumotlari", HeadingLevel.HEADING_2),
      para("Ob'ekt sahifasida ko'rinadi:"),
      bulletItem("Shartnoma summasi, to'langan summa va qoldiq"),
      bulletItem("Xarajatlar, oyliklar, premiyalar"),
      bulletItem("Jami xarajat"),
      bulletItem("Foyda yoki zarar"),

      heading("Ob'ekt holati", HeadingLevel.HEADING_2),
      bulletItem("\"✅ Tugallash\" — ob'ektni yakunlash"),
      bulletItem("\"⏸ To'xtatish\" — vaqtincha to'xtatish"),
      bulletItem("\"▶️ Davom ettirish\" — qayta boshlash"),

      // 7. Davomat
      heading("7. Davomat", HeadingLevel.HEADING_1),
      para("Buyruq: /davomat yoki asosiy menyudan \"📋 Davomat\""),
      emptyLine(),

      heading("Kunlik davomat belgilash", HeadingLevel.HEADING_2),
      numberedItem("\"📅 Bugungi davomat\" bosing"),
      numberedItem("Xodim ismini bosing"),
      numberedItem("Holatni tanlang:"),
      bulletItem("✅ To'la ishchi — butun kun ishladi"),
      bulletItem("⏰ Yarim kun — yarim kun ishladi (0.5 kun hisoblanadi)"),
      bulletItem("❌ Sababli — kelmaslik sababi bilan (sabab yoziladi)"),
      bulletItem("❌ Yo'q — sababsiz kelmadi"),

      heading("Boshqa kun uchun", HeadingLevel.HEADING_2),
      numberedItem("\"📆 Boshqa kun\" bosing"),
      numberedItem("Sanani kiriting: dd.mm.yyyy formatda (masalan: 25.03.2026)"),
      numberedItem("Xodimlarni belgilang"),

      // 8. Hisobotlar
      heading("8. Hisobotlar", HeadingLevel.HEADING_1),
      para("Buyruq: /hisobotlar yoki asosiy menyudan \"📈 Hisobotlar\""),
      emptyLine(),

      heading("8.1. Oylik moliyaviy hisobot", HeadingLevel.HEADING_2),
      para("Joriy oy uchun umumiy ko'rinish:"),
      bulletItem("Kirimlar (to'lovlar)"),
      bulletItem("Chiqimlar (avanslar, premiyalar, xarajatlar)"),
      bulletItem("Farq (kirim - chiqim)"),

      heading("8.2. Xodimlar hisoboti", HeadingLevel.HEADING_2),
      para("Har bir xodim uchun:"),
      bulletItem("Oylik maosh"),
      bulletItem("Berilgan avanslar va premiyalar"),
      bulletItem("Qo'liga olgan summa"),
      bulletItem("Qoldiq (oylik + premiya - avans)"),

      heading("8.3. Ob'ektlar hisoboti", HeadingLevel.HEADING_2),
      para("Faol ob'ektlar bo'yicha: shartnoma, to'langan, xarajat, foyda/zarar."),

      heading("8.4. Davomat hisoboti", HeadingLevel.HEADING_2),
      para("Har bir xodim uchun oylik: to'la kunlar, yarim kunlar, yo'q kunlar, jami ish kunlari."),

      // 9. Sozlamalar
      heading("9. Sozlamalar", HeadingLevel.HEADING_1),
      para("Buyruq: /sozlamalar yoki asosiy menyudan \"⚙️ Sozlamalar\""),
      emptyLine(),

      heading("9.1. Oyni yopish", HeadingLevel.HEADING_2),
      para("Oyni yopish — oylik hisob-kitobni yakunlash."),
      emptyLine(),
      para("Oqim:", true),
      numberedItem("\"🔒 Oyni yopish\" bosing"),
      numberedItem("Umumiy xulosa ko'rsatiladi (avanslar, premiyalar, har bir xodim)"),
      numberedItem("Tasdiqlang"),
      emptyLine(),
      para("Nima bo'ladi:", true),
      bulletItem("Har bir faol xodimga oylik maosh tranzaksiyasi yaratiladi"),
      bulletItem("Oy yopiladi — bu oy uchun boshqa operatsiya kiritib bo'lmaydi"),
      note("Oyni yopish qaytarib bo'lmaydi! Yopishdan oldin barcha operatsiyalar to'g'ri kiritilganligini tekshiring."),

      heading("9.2. Avans limiti", HeadingLevel.HEADING_2),
      numberedItem("\"💰 Avans limiti\" bosing"),
      numberedItem("Hozirgi foiz ko'rsatiladi"),
      numberedItem("Yangi foizni kiriting (1 dan 100 gacha)"),
      numberedItem("Tasdiqlang"),

      heading("9.3. Profil", HeadingLevel.HEADING_2),
      para("Sizning ma'lumotlaringiz: ism, telefon, avans limiti, ro'yxatdan o'tgan sana."),

      // 10. Foydali maslahatlar
      heading("10. Foydali maslahatlar", HeadingLevel.HEADING_1),
      numberedItem("Har kuni davomat belgilang — oy oxirida aniq hisobot chiqadi"),
      numberedItem("Avans berishdan oldin limitni tekshiring — bot avtomatik ogohlantiradi"),
      numberedItem("Ob'ekt xarajatlarini o'z vaqtida kiriting — foyda/zarar aniq ko'rinadi"),
      numberedItem("Oyni o'z vaqtida yoping — keyingi oyga o'tish uchun"),
      numberedItem("Asosiy menyuga qaytish — /menu buyrug'i yoki \"🔙 Asosiy menyu\" tugmasi"),

      // 11. Buyruqlar jadvali
      heading("11. Bot buyruqlari", HeadingLevel.HEADING_1),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          tableRow(["Buyruq", "Tavsif"], true),
          tableRow(["/start", "Botga kirish, asosiy menyu"]),
          tableRow(["/menu", "Asosiy menyuga qaytish"]),
          tableRow(["/xodimlar", "Xodimlar ro'yxati"]),
          tableRow(["/moliya", "Moliya bo'limi"]),
          tableRow(["/obyektlar", "Ob'ektlar ro'yxati"]),
          tableRow(["/davomat", "Davomat bo'limi"]),
          tableRow(["/hisobotlar", "Hisobotlar"]),
          tableRow(["/sozlamalar", "Sozlamalar"]),
        ],
      }),

      // 12. FAQ
      heading("12. Tez-tez so'raladigan savollar", HeadingLevel.HEADING_1),
      emptyLine(),
      para("Savol: Noto'g'ri avans kiritdim, qanday o'chiraman?", true),
      para("Javob: Hozircha o'chirish funksiyasi yo'q. Admin bilan bog'laning."),
      emptyLine(),
      para("Savol: Oyni yopgandan keyin xato topdim, nima qilaman?", true),
      para("Javob: Yopilgan oy o'zgartirilmaydi. Keyingi oyda tuzatish kiriting."),
      emptyLine(),
      para("Savol: Bir xodimga ikki marta oylik yozilmaydimi?", true),
      para("Javob: Oy faqat bir marta yopiladi. Ikkinchi marta yopishga urinilsa, \"allaqachon yopilgan\" xabari chiqadi."),
      emptyLine(),
      para("Savol: Boshqa prorabning ma'lumotlarini ko'ra olamanmi?", true),
      para("Javob: Yo'q. Har bir prorab faqat o'z xodimlari, ob'ektlari va moliyasini ko'radi."),

      // Footer
      emptyLine(),
      emptyLine(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Prorab Hisob-Kitob Bot — qurilish hisob-kitobini osonlashtiradi!", italics: true })],
      }),
    ],
  }],
});

// ─── Generate ───

async function main() {
  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, "..", "docs", "Foydalanuvchi_Qollanma.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Generated:", outPath);
}

main().catch(console.error);
