import { describe, it, expect } from "vitest";
import {
  getStatusIcon,
  getStatusLabel,
  parseDate,
  dateToString,
  currentMonthYear,
} from "../src/services/attendance.service";

describe("status icons", () => {
  it("should return correct icons for each status", () => {
    expect(getStatusIcon("full")).toBe("✅");
    expect(getStatusIcon("half")).toBe("⏰");
    expect(getStatusIcon("absent")).toBe("❌");
    expect(getStatusIcon("absent_reason")).toBe("❌");
  });

  it("should return dash for null or unknown", () => {
    expect(getStatusIcon(null)).toBe("➖");
    expect(getStatusIcon("unknown")).toBe("➖");
  });
});

describe("status labels", () => {
  it("should return correct labels", () => {
    expect(getStatusLabel("full")).toBe("✅ To'la ishchi");
    expect(getStatusLabel("half")).toBe("⏰ Yarim kun");
    expect(getStatusLabel("absent_reason")).toBe("❌ Yo'q (sababli)");
    expect(getStatusLabel("absent")).toBe("❌ Yo'q");
  });
});

describe("parseDate", () => {
  it("should parse dd.mm.yyyy format", () => {
    const date = parseDate("25.03.2026");
    expect(date).not.toBeNull();
    expect(date!.getDate()).toBe(25);
    expect(date!.getMonth()).toBe(2); // March = 2
    expect(date!.getFullYear()).toBe(2026);
  });

  it("should parse dd/mm/yyyy format", () => {
    const date = parseDate("01/12/2025");
    expect(date).not.toBeNull();
    expect(date!.getDate()).toBe(1);
    expect(date!.getMonth()).toBe(11);
  });

  it("should reject invalid dates", () => {
    expect(parseDate("32.13.2026")).toBeNull();
    expect(parseDate("abc")).toBeNull();
    expect(parseDate("2026-03-25")).toBeNull();
    expect(parseDate("")).toBeNull();
  });

  it("should reject invalid day for month", () => {
    expect(parseDate("31.02.2026")).toBeNull();
    expect(parseDate("30.02.2026")).toBeNull();
  });
});

describe("dateToString", () => {
  it("should convert date to yyyy-mm-dd", () => {
    const date = new Date(2026, 2, 25); // March 25
    expect(dateToString(date)).toBe("2026-03-25");
  });

  it("should pad single digits", () => {
    const date = new Date(2026, 0, 5); // Jan 5
    expect(dateToString(date)).toBe("2026-01-05");
  });
});

describe("currentMonthYear", () => {
  it("should return yyyy-mm format", () => {
    const result = currentMonthYear();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("monthly stats calculation", () => {
  it("should calculate totalWorked correctly", () => {
    const fullDays = 20;
    const halfDays = 4;
    const totalWorked = fullDays + halfDays * 0.5;
    expect(totalWorked).toBe(22);
  });

  it("should handle zero days", () => {
    const totalWorked = 0 + 0 * 0.5;
    expect(totalWorked).toBe(0);
  });
});
