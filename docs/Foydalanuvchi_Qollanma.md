# Prorab Hisob-Kitob — Foydalanuvchi Qo'llanmasi

## Kirish

**Prorab Hisob-Kitob** — qurilish prorablar uchun mo'ljallangan Telegram bot. Bu bot orqali siz:
- Xodimlarni boshqarasiz (qo'shish, oylik belgilash)
- Moliyaviy operatsiyalar kiritasiz (avans, premiya, xarajat, to'lov)
- Ob'ektlarni boshqarasiz (shartnoma, xarajat, foyda hisobi)
- Kunlik davomatni belgilaysiz
- Oylik hisobotlarni ko'rasiz
- Oy yakunini chiqarasiz

---

## 1. Botga kirish

Botga kirish uchun admin sizni ro'yxatga olishi kerak. Admin sizning **Telegram ID** raqamingizni botga kiritadi.

**Telegram ID'ingizni bilish uchun:**
1. Telegram'da `@userinfobot` ga yozing
2. U sizga ID raqamingizni ko'rsatadi
3. Bu raqamni admin'ga yuboring

Admin sizni qo'shgandan keyin, botga `/start` yuboring — asosiy menyu ochiladi.

---

## 2. Asosiy menyu

`/start` yoki `/menu` buyrug'i bilan asosiy menyuga qaytishingiz mumkin:

```
👥 Xodimlar    🏗 Ob'ektlar
📋 Davomat     💰 Moliya
📈 Hisobotlar  ⚙️ Sozlamalar
```

---

## 3. Xodimlar boshqaruvi

**Buyruq:** `/xodimlar` yoki asosiy menyudan "👥 Xodimlar"

### Yangi xodim qo'shish
1. "➕ Yangi xodim" tugmasini bosing
2. **Ism** kiriting (F.I.O)
3. **Lavozim** tanlang (Suvokchi, Elektrik, Usta, Ishchi, Boshqa)
4. **Telefon** raqam kiriting yoki o'tkazib yuboring
5. **Oylik maosh** summasini kiriting (masalan: 5000000)
6. Tasdiqlang

### Xodim ma'lumotlarini ko'rish
- Ro'yxatdan xodim ismini bosing
- Oylik maosh, lavozim, telefon, ishga olingan sana ko'rinadi

### Faolsizlashtirish
- Xodim sahifasida "🚫 Faolsizlashtirish" bosing
- Faolsiz xodimlar "👻 Faolsizlar" bo'limida ko'rinadi
- Qayta faollashtirish mumkin

---

## 4. Moliya bo'limi

**Buyruq:** `/moliya` yoki asosiy menyudan "💰 Moliya"

### 4.1. Avans berish
1. "💸 Avans berish" bosing
2. Xodimni tanlang
3. Summa kiriting
4. Agar avans chegarasidan oshsa — ogohlantirish chiqadi
5. Tasdiqlang

> **Avans chegarasi:** Har bir xodimga oylik maoshining ma'lum foizi (standart: 80%) gacha avans beriladi. Sozlamalar orqali o'zgartiriladi.

### 4.2. Premiya berish
1. "🎁 Premiya berish" bosing
2. Xodimni tanlang
3. Summa kiriting
4. Sabab kiriting (majburiy)
5. Ob'ektga bog'lash (ixtiyoriy)
6. Tasdiqlang

### 4.3. Xarajat kiritish
1. "🧾 Xarajat kiritish" bosing
2. Ob'ektni tanlang
3. Summa kiriting
4. Izoh kiriting (masalan: sement, qum, temir)
5. Tasdiqlang

### 4.4. To'lov kiritish (buyurtmachidan)
1. "💵 To'lov kiritish" bosing
2. Ob'ektni tanlang (shartnoma summasi va qoldiq ko'rinadi)
3. Summa kiriting
4. Tasdiqlang

### 4.5. Tarix ko'rish
- "📜 Tarix" — joriy oydagi barcha operatsiyalar ro'yxati
- Sahifalangan (8 tadan)

---

## 5. Ob'ektlar boshqaruvi

**Buyruq:** `/obyektlar` yoki asosiy menyudan "🏗 Ob'ektlar"

### Yangi ob'ekt yaratish
1. "➕ Yangi ob'ekt" bosing
2. **Nom** kiriting (masalan: Navoiy ko'cha 15-uy)
3. **Buyurtmachi** ismini kiriting
4. **Shartnoma summasi** kiriting
5. **Manzil** kiriting yoki o'tkazib yuboring
6. Tasdiqlang

### Ob'ekt ma'lumotlari
Ob'ekt sahifasida ko'rinadi:
- Shartnoma summasi
- To'langan summa va qoldiq
- Xarajatlar, oyliklar, premiyalar
- Jami xarajat
- **Foyda** yoki **zarar**

### Ob'ekt holati
- "✅ Tugallash" — ob'ektni yakunlash
- "⏸ To'xtatish" — vaqtincha to'xtatish
- "▶️ Davom ettirish" — qayta boshlash

---

## 6. Davomat

**Buyruq:** `/davomat` yoki asosiy menyudan "📋 Davomat"

### Kunlik davomat belgilash
1. "📅 Bugungi davomat" bosing
2. Xodim ismini bosing
3. Holatni tanlang:
   - ✅ **To'la ishchi** — butun kun ishladi
   - ⏰ **Yarim kun** — yarim kun ishladi (0.5 kun hisoblanadi)
   - ❌ **Sababli** — kelmaslik sababi bilan (sabab yoziladi)
   - ❌ **Yo'q** — sababsiz kelmadi

### Boshqa kun uchun
1. "📆 Boshqa kun" bosing
2. Sanani kiriting: `dd.mm.yyyy` formatda (masalan: 25.03.2026)
3. Xodimlarni belgilang

### Oylik hisobot
- "📊 Oylik hisobot" — har bir xodim necha kun ishlagan

---

## 7. Hisobotlar

**Buyruq:** `/hisobotlar` yoki asosiy menyudan "📈 Hisobotlar"

### 7.1. Oylik moliyaviy hisobot
Joriy oy uchun umumiy ko'rinish:
- Kirimlar (to'lovlar)
- Chiqimlar (avanslar, premiyalar, xarajatlar)
- Farq (kirim - chiqim)

### 7.2. Xodimlar hisoboti
Har bir xodim uchun:
- Oylik maosh
- Berilgan avanslar
- Berilgan premiyalar
- Qo'liga olgan summa
- Qoldiq (oylik + premiya - avans)

### 7.3. Ob'ektlar hisoboti
Faol ob'ektlar bo'yicha:
- Shartnoma summasi
- To'langan summa
- Xarajatlar
- Foyda yoki zarar

### 7.4. Davomat hisoboti
Har bir xodim uchun oylik:
- To'la kunlar
- Yarim kunlar
- Yo'q kunlar
- Jami ish kunlari

---

## 8. Sozlamalar

**Buyruq:** `/sozlamalar` yoki asosiy menyudan "⚙️ Sozlamalar"

### 8.1. Oyni yopish
Oyni yopish — oylik hisob-kitobni yakunlash.

**Oqim:**
1. "🔒 Oyni yopish" bosing
2. Umumiy xulosa ko'rsatiladi:
   - Barcha avanslar, premiyalar, xarajatlar, to'lovlar
   - Har bir xodim: oylik, avans, premiya, qo'liga olgan, qoldiq
3. Tasdiqlang

**Nima bo'ladi:**
- Har bir faol xodimga **oylik maosh** tranzaksiyasi yaratiladi
- Oy yopiladi — bu oy uchun boshqa operatsiya kiritib bo'lmaydi
- Ma'lumotlar saqlanib qoladi

> ⚠️ Oyni yopish qaytarib bo'lmaydi! Yopishdan oldin barcha operatsiyalar to'g'ri kiritilganligini tekshiring.

### 8.2. Avans limiti
1. "💰 Avans limiti" bosing
2. Hozirgi foiz ko'rsatiladi
3. Yangi foizni kiriting (1 dan 100 gacha)
4. Tasdiqlang

### 8.3. Profil
Sizning ma'lumotlaringiz:
- Ism, telefon, avans limiti, ro'yxatdan o'tgan sana

---

## 9. Foydali maslahatlar

1. **Har kuni davomat belgilang** — oy oxirida aniq hisobot chiqadi
2. **Avans berishdan oldin limitni tekshiring** — bot avtomatik ogohlantiradi
3. **Ob'ekt xarajatlarini o'z vaqtida kiriting** — foyda/zarar aniq ko'rinadi
4. **Oyni o'z vaqtida yoping** — keyingi oyga o'tish uchun
5. **Asosiy menyuga qaytish** — `/menu` buyrug'i yoki "🔙 Asosiy menyu" tugmasi

---

## 10. Bot buyruqlari

| Buyruq | Tavsif |
|--------|--------|
| `/start` | Botga kirish, asosiy menyu |
| `/menu` | Asosiy menyuga qaytish |
| `/xodimlar` | Xodimlar ro'yxati |
| `/moliya` | Moliya bo'limi |
| `/obyektlar` | Ob'ektlar ro'yxati |
| `/davomat` | Davomat bo'limi |
| `/hisobotlar` | Hisobotlar |
| `/sozlamalar` | Sozlamalar |

---

## 11. Tez-tez so'raladigan savollar

**S: Noto'g'ri avans kiritdim, qanday o'chiraman?**
J: Hozircha o'chirish funksiyasi yo'q. Admin bilan bog'laning.

**S: Oyni yopgandan keyin xato topdim, nima qilaman?**
J: Yopilgan oy o'zgartirilmaydi. Keyingi oyda tuzatish kiriting.

**S: Bir xodimga ikki marta oylik yozilmaydimi?**
J: Oy faqat bir marta yopiladi. Ikkinchi marta yopishga urinilsa, "allaqachon yopilgan" xabari chiqadi.

**S: Boshqa prorabning ma'lumotlarini ko'ra olamanmi?**
J: Yo'q. Har bir prorab faqat o'z xodimlari, ob'ektlari va moliyasini ko'radi.

---

*Prorab Hisob-Kitob Bot — qurilish hisob-kitobini osonlashtiradi!*
