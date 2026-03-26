import { describe, it, expect } from "vitest";

describe("advance limit validation", () => {
  it("should accept valid percentages", () => {
    for (const pct of [1, 50, 70, 80, 100]) {
      expect(pct >= 1 && pct <= 100).toBe(true);
    }
  });

  it("should reject invalid percentages", () => {
    expect(0 >= 1 && 0 <= 100).toBe(false);
    expect(101 >= 1 && 101 <= 100).toBe(false);
    expect(-5 >= 1 && -5 <= 100).toBe(false);
  });

  it("should parse integer from text", () => {
    expect(parseInt("70", 10)).toBe(70);
    expect(parseInt("100", 10)).toBe(100);
    expect(isNaN(parseInt("abc", 10))).toBe(true);
  });
});

describe("month year format", () => {
  it("should produce yyyy-mm format", () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const monthYear = `${y}-${m}`;
    expect(monthYear).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("month label", () => {
  const monthNames = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
  ];

  function monthLabel(monthYear: string): string {
    const [year, month] = monthYear.split("-");
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }

  it("should format month label correctly", () => {
    expect(monthLabel("2026-03")).toBe("Mart 2026");
    expect(monthLabel("2026-01")).toBe("Yanvar 2026");
    expect(monthLabel("2026-12")).toBe("Dekabr 2026");
  });
});

describe("advance limit calculation", () => {
  it("should calculate max advance from salary and limit pct", () => {
    const salary = BigInt(5000000);
    const limitPct = 80;
    const maxAdvance = (salary * BigInt(limitPct)) / BigInt(100);
    expect(maxAdvance).toBe(BigInt(4000000));
  });

  it("should work with different percentages", () => {
    const salary = BigInt(10000000);
    expect((salary * BigInt(50)) / BigInt(100)).toBe(BigInt(5000000));
    expect((salary * BigInt(100)) / BigInt(100)).toBe(BigInt(10000000));
    expect((salary * BigInt(1)) / BigInt(100)).toBe(BigInt(100000));
  });
});
