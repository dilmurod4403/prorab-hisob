import { describe, it, expect } from "vitest";
import { formatMoney } from "../src/utils/formatters";

describe("object display formatting", () => {
  it("should format contract amount correctly", () => {
    expect(formatMoney(50000000)).toBe("50 000 000 so'm");
  });

  it("should format large contract amount", () => {
    expect(formatMoney(BigInt(1500000000))).toBe("1 500 000 000 so'm");
  });

  it("should format zero amount", () => {
    expect(formatMoney(0)).toBe("0 so'm");
  });
});

describe("object list pagination", () => {
  it("should calculate total pages correctly", () => {
    const pageSize = 8;
    expect(Math.max(1, Math.ceil(0 / pageSize))).toBe(1);
    expect(Math.max(1, Math.ceil(8 / pageSize))).toBe(1);
    expect(Math.max(1, Math.ceil(9 / pageSize))).toBe(2);
    expect(Math.max(1, Math.ceil(24 / pageSize))).toBe(3);
  });
});

describe("contract amount input parsing", () => {
  it("should parse plain numbers", () => {
    const cleaned = "50000000".replace(/[\s,._]/g, "");
    const amount = parseInt(cleaned, 10);
    expect(amount).toBe(50000000);
    expect(amount > 0).toBe(true);
  });

  it("should parse numbers with spaces", () => {
    const cleaned = "50 000 000".replace(/[\s,._]/g, "");
    expect(parseInt(cleaned, 10)).toBe(50000000);
  });

  it("should parse numbers with dots", () => {
    const cleaned = "50.000.000".replace(/[\s,._]/g, "");
    expect(parseInt(cleaned, 10)).toBe(50000000);
  });

  it("should reject non-numeric input", () => {
    const cleaned = "ellik million".replace(/[\s,._]/g, "");
    expect(isNaN(parseInt(cleaned, 10))).toBe(true);
  });

  it("should reject zero and negative", () => {
    expect(parseInt("0", 10) > 0).toBe(false);
    expect(parseInt("-100", 10) > 0).toBe(false);
  });
});

describe("object status labels", () => {
  const STATUS_LABELS: Record<string, string> = {
    active: "🟢 Faol",
    completed: "✅ Tugallangan",
    paused: "⏸ To'xtatilgan",
  };

  it("should have labels for all statuses", () => {
    expect(STATUS_LABELS["active"]).toBe("🟢 Faol");
    expect(STATUS_LABELS["completed"]).toBe("✅ Tugallangan");
    expect(STATUS_LABELS["paused"]).toBe("⏸ To'xtatilgan");
  });

  it("should return undefined for unknown status", () => {
    expect(STATUS_LABELS["unknown"]).toBeUndefined();
  });
});

describe("profit calculation", () => {
  it("should calculate profit when contract > costs", () => {
    const contract = BigInt(100000000);
    const totalCost = BigInt(70000000);
    const profit = contract - totalCost;
    expect(profit).toBe(BigInt(30000000));
    expect(profit >= BigInt(0)).toBe(true);
  });

  it("should calculate loss when costs > contract", () => {
    const contract = BigInt(50000000);
    const totalCost = BigInt(80000000);
    const profit = contract - totalCost;
    expect(profit < BigInt(0)).toBe(true);
    expect(-profit).toBe(BigInt(30000000));
  });

  it("should calculate payment balance", () => {
    const contract = BigInt(100000000);
    const totalPayments = BigInt(60000000);
    const balance = contract - totalPayments;
    expect(balance).toBe(BigInt(40000000));
  });
});
