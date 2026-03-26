# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Prorab Hisob-Kitob** — a Telegram bot for construction foremen (prorab) in Uzbekistan to manage employee salaries, bonuses, advances, attendance, and construction object finances. The interface language is Uzbek.

## Tech Stack

- **Language:** TypeScript + Node.js 20+
- **Bot framework:** grammy 1.x
- **Database:** PostgreSQL 15+
- **ORM:** Prisma 5.x
- **Cache/session:** Redis (ioredis)
- **Deployment:** Docker + Docker Compose
- **Testing:** vitest

## Commands

```bash
npm run dev          # Start bot in dev mode (tsx watch)
npm run build        # TypeScript compile
npm start            # Run compiled bot
npm test             # Run all tests
npm run test:watch   # Watch mode tests
npx prisma generate  # Generate Prisma client after schema changes
npx prisma migrate dev  # Create and apply migration
npx prisma db push   # Push schema to DB without migration
npx prisma studio    # Visual DB editor
npx tsc --noEmit     # Type check without build
```

**Proxy note:** This dev environment uses a corporate proxy. If npm install fails, use:
```bash
npm install --proxy="" --https-proxy=""
```

## Architecture

```
src/
├── index.ts          # Entry point: connects DB/Redis, starts bot
├── bot.ts            # Bot instance, registers handlers
├── config.ts         # Environment config (dotenv + validation)
├── db.ts             # Prisma client instance
├── redis.ts          # ioredis client instance
├── handlers/         # Telegram command/callback handlers
│   └── start.ts      # /start — registration and main menu
├── services/         # Business logic (salary calc, advance check, etc.)
├── reports/          # PDF/Excel report generation
└── utils/
    ├── keyboards.ts  # Inline keyboard builders
    └── formatters.ts # Amount formatting (1234567 → "1 234 567 so'm")
```

**Data flow:** User → grammy handler → Prisma (PostgreSQL) → response with InlineKeyboard

## Database (Prisma)

Schema: `prisma/schema.prisma` — 7 models:
- **Prorab** — bot user (telegram_id unique)
- **Employee** — worker with monthly salary
- **Object** — construction site with contract amount
- **EmployeeObject** — many-to-many with work_percent
- **Attendance** — daily: full/half/absent (unique per employee+date)
- **Transaction** — salary/advance/bonus/expense/payment
- **MonthClose** — monthly finalization (immutable after close)

All monetary values are `BigInt`. Field mapping uses `@map()` for snake_case DB columns.

## Key Domain Concepts

- **Prorab** — construction foreman (the bot user), identified by Telegram ID
- **Xodim (Employee)** — worker under a prorab, has monthly salary
- **Ob'ekt (Object)** — construction site with a contract amount and client
- **Davomat (Attendance)** — daily attendance: present / half-day / absent
- **Avans (Advance)** — early salary payment, deducted from monthly pay (default limit: 80%)
- **Oy yopilishi (Month closing)** — finalizes monthly accounting, data becomes immutable

## Design Documents

All specifications are in `docs/` (Uzbek language, `.docx` format):
- `BT_Prorab_Hisob_Kitob_v2.0.docx` — Business requirements
- `TZ_Prorab_Hisob_Kitob_v1.0.docx` — Technical specification (DB schema, bot commands)
- `Ilova_UI_Arxitektura.docx` — UI mockups and system architecture diagrams
