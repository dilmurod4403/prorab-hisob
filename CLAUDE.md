# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Prorab Hisob-Kitob** — a Telegram bot for construction foremen (prorab) in Uzbekistan to manage employee salaries, bonuses, advances, attendance, and construction object finances. The interface language is Uzbek.

## Planned Tech Stack (from TZ v1.0)

- **Language:** Python 3.11+
- **Bot framework:** python-telegram-bot 20.x (async)
- **Database:** PostgreSQL 15+
- **ORM:** SQLAlchemy 2.0+ (async)
- **Migrations:** Alembic
- **Cache/session:** Redis
- **Reports:** openpyxl (Excel), reportlab (PDF)
- **Scheduler:** APScheduler
- **Deployment:** Docker + Docker Compose, Ubuntu 22.04 LTS
- **CI/CD:** GitHub Actions

## Architecture

The system has these layers:
1. **Telegram Bot (frontend)** — inline keyboard UI, conversation handlers
2. **Bot Server (backend)** — Python app with handlers, services, and report generation
3. **PostgreSQL** — main database (prorab, employee, object, attendance, finance tables)
4. **Redis** — session management, conversation state, caching
5. **Scheduler** — reminders and automated tasks
6. **File Generator** — PDF/Excel report generation

All components run inside Docker Compose.

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
- `TZ_Prorab_Hisob_Kitob_v1.0.docx` — Technical specification (DB schema, API, bot commands)
- `Ilova_UI_Arxitektura.docx` — UI mockups and system architecture diagrams
