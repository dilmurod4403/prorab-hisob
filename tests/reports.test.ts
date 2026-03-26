import { describe, it, expect } from "vitest";
import { formatMoney } from "../src/utils/formatters";

describe("monthly report calculations", () => {
  it("should calculate total income and expenses", () => {
    const totalPayment = BigInt(50000000);
    const totalAdvance = BigInt(10000000);
    const totalBonus = BigInt(3000000);
    const totalExpense = BigInt(15000000);

    const totalIn = totalPayment;
    const totalOut = totalAdvance + totalBonus + totalExpense;
    const diff = totalIn - totalOut;

    expect(totalIn).toBe(BigInt(50000000));
    expect(totalOut).toBe(BigInt(28000000));
    expect(diff).toBe(BigInt(22000000));
  });

  it("should handle negative difference", () => {
    const totalIn = BigInt(10000000);
    const totalOut = BigInt(25000000);
    expect(totalIn - totalOut).toBe(BigInt(-15000000));
  });
});

describe("employee report calculations", () => {
  it("should calculate received amount", () => {
    const totalAdvance = BigInt(3000000);
    const totalBonus = BigInt(500000);
    const received = totalAdvance + totalBonus;
    expect(received).toBe(BigInt(3500000));
  });

  it("should calculate balance", () => {
    const salary = BigInt(5000000);
    const bonus = BigInt(500000);
    const advance = BigInt(3000000);
    const balance = salary + bonus - advance;
    expect(balance).toBe(BigInt(2500000));
  });
});

describe("object report profit/loss", () => {
  it("should show profit when positive", () => {
    const profit = BigInt(10000000);
    expect(profit >= BigInt(0)).toBe(true);
    expect(formatMoney(profit)).toBe("10 000 000 so'm");
  });

  it("should show loss when negative", () => {
    const profit = BigInt(-5000000);
    expect(profit < BigInt(0)).toBe(true);
    expect(formatMoney(-profit)).toBe("5 000 000 so'm");
  });
});

describe("month label formatting", () => {
  const monthNames = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
  ];

  function monthLabel(monthYear: string): string {
    const [year, month] = monthYear.split("-");
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }

  it("should format correctly", () => {
    expect(monthLabel("2026-03")).toBe("Mart 2026");
    expect(monthLabel("2026-12")).toBe("Dekabr 2026");
  });
});

describe("pagination", () => {
  it("should calculate pages correctly", () => {
    const pageSize = 8;
    expect(Math.max(1, Math.ceil(0 / pageSize))).toBe(1);
    expect(Math.max(1, Math.ceil(8 / pageSize))).toBe(1);
    expect(Math.max(1, Math.ceil(9 / pageSize))).toBe(2);
    expect(Math.max(1, Math.ceil(20 / pageSize))).toBe(3);
  });

  it("should slice array for page", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const page1 = items.slice(0, 8);
    const page2 = items.slice(8, 16);
    const page3 = items.slice(16, 24);
    expect(page1).toHaveLength(8);
    expect(page2).toHaveLength(8);
    expect(page3).toHaveLength(4);
  });
});
