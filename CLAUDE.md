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
- **Deployment:** Docker + Docker Compose, Railway.app
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
├── bot.ts            # Bot instance, middleware, registers all handlers
├── config.ts         # Environment config (dotenv + validation)
├── db.ts             # Prisma client instance
├── redis.ts          # ioredis client instance
├── handlers/         # Telegram command/callback handlers
│   ├── start.ts      # /start — main menu (admin auto-creates)
│   ├── admin.ts      # /admin — admin panel (prorab CRUD, stats, notifications)
│   ├── employees.ts  # /xodimlar — employee management
│   ├── finance.ts    # /moliya — advance, bonus, expense, payment
│   ├── objects.ts    # /obyektlar — construction objects
│   ├── attendance.ts # /davomat — daily attendance tracking
│   ├── settings.ts   # /sozlamalar — month close, advance limit, profile
│   └── reports.ts    # /hisobotlar — monthly/employee/object/attendance reports
├── services/         # Business logic
│   ├── employee.service.ts    # Employee CRUD + pagination
│   ├── transaction.service.ts # Transaction CRUD, advance limit check, month summary
│   ├── object.service.ts      # Object CRUD, finance summary
│   └── attendance.service.ts  # Attendance CRUD, monthly stats
├── types/
│   └── conversation.ts        # FSM state types + Redis helpers
└── utils/
    ├── keyboards.ts  # Inline keyboard builders (all modules)
    ├── formatters.ts # Amount formatting, HTML escaping, input validation constants
    ├── prorab.ts     # getProrab() + requireProrab() with approved check
    └── rateLimit.ts  # Redis-based rate limiter middleware (30 req/min)
```

**Data flow:** User → rate limiter → grammy handler → requireProrab (auth+approved) → service → Prisma (PostgreSQL) → response with InlineKeyboard

**FSM pattern:** Text input flows use Redis-stored conversation state (module/step/data). Each handler checks `conv.module` to claim or pass to `next()`.

**Callback convention:** Prefix-based routing with colon separators: `emp:`, `fin:`, `obj:`, `att:`, `set:`, `rep:`, `adm:`

## Database (Prisma)

Schema: `prisma/schema.prisma` — 7 models:
- **Prorab** — bot user (telegram_id unique, `approved` boolean for admin authorization)
- **Employee** — worker with monthly salary
- **Object** — construction site with contract amount
- **EmployeeObject** — many-to-many with work_percent
- **Attendance** — daily: full/half/absent (unique per employee+date)
- **Transaction** — salary/advance/bonus/expense/payment
- **MonthClose** — monthly finalization (immutable after close)

All monetary values are `BigInt`. Field mapping uses `@map()` for snake_case DB columns.

## Security

- **Admin-only registration:** Only admin (ADMIN_TELEGRAM_ID) can add prorab users via /admin panel
- **Prorab approval:** `requireProrab()` checks both existence and `approved` status
- **Data isolation:** All queries filter by `prorabId` — one prorab cannot see another's data
- **Rate limiting:** Redis-based, 30 requests per minute per user
- **HTML escaping:** User-provided names escaped before use in `parse_mode: "HTML"` messages
- **Input validation:** Max lengths (names 200, text 500) and max amount (100B so'm)
- **Error notifications:** Bot errors automatically sent to admin via Telegram with user/action/stack details

## Environment Variables

```
BOT_TOKEN=           # Telegram bot token (required)
ADMIN_TELEGRAM_ID=   # Admin's Telegram user ID (required)
DATABASE_URL=        # PostgreSQL connection string (required)
REDIS_URL=           # Redis connection string (default: redis://localhost:6379/0)
WORK_DAYS_PER_MONTH= # Working days per month (default: 26)
ADVANCE_LIMIT_PCT=   # Default advance limit percentage (default: 80)
TIMEZONE=            # Timezone (default: Asia/Tashkent)
```

## Key Domain Concepts

- **Prorab** — construction foreman (the bot user), identified by Telegram ID
- **Xodim (Employee)** — worker under a prorab, has monthly salary
- **Ob'ekt (Object)** — construction site with a contract amount and client
- **Davomat (Attendance)** — daily attendance: present / half-day / absent
- **Avans (Advance)** — early salary payment, deducted from monthly pay (default limit: 80%)
- **Oy yopilishi (Month closing)** — finalizes monthly accounting, creates salary transactions, data becomes immutable

## Design Documents

All specifications are in `docs/` (Uzbek language):
- `BT_Prorab_Hisob_Kitob_v2.0.docx` — Business requirements
- `TZ_Prorab_Hisob_Kitob_v1.0.docx` — Technical specification (DB schema, bot commands)
- `Ilova_UI_Arxitektura.docx` — UI mockups and system architecture diagrams
- `Foydalanuvchi_Qollanma.md` — User guide for prorab users (Uzbek)
