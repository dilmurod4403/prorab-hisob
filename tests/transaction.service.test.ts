import { describe, it, expect } from "vitest";
import { formatMoney } from "../src/utils/formatters";

describe("advance limit calculation", () => {
  const calculateLimit = (salary: bigint, pct: number) =>
    (salary * BigInt(pct)) / BigInt(100);

  it("should calculate 80% limit correctly", () => {
    const salary = BigInt(5_000_000);
    const limit = calculateLimit(salary, 80);
    expect(limit).toBe(BigInt(4_000_000));
  });

  it("should detect over-limit", () => {
    const maxAdvance = BigInt(4_000_000);
    const currentAdvances = BigInt(3_500_000);
    const newAmount = BigInt(600_000);
    const total = currentAdvances + newAmount;
    expect(total > maxAdvance).toBe(true);
  });

  it("should detect warning at 70%", () => {
    const salary = BigInt(5_000_000);
    const currentAdvances = BigInt(3_400_000);
    const newAmount = BigInt(200_000);
    const total = currentAdvances + newAmount;
    // total * 100 > salary * 70
    const isWarning = total * BigInt(100) > salary * BigInt(70);
    expect(isWarning).toBe(true);
  });

  it("should be ok when under 70%", () => {
    const salary = BigInt(5_000_000);
    const total = BigInt(2_000_000);
    const isWarning = total * BigInt(100) > salary * BigInt(70);
    expect(isWarning).toBe(false);
  });
});

describe("month year format", () => {
  it("should format current month correctly", () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const monthYear = `${y}-${m}`;
    expect(monthYear).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("transaction type labels", () => {
  const labels: Record<string, string> = {
    advance: "💸 Avans",
    bonus: "🎁 Premiya",
    expense: "🧾 Xarajat",
    payment: "💵 To'lov",
    salary: "💰 Oylik",
  };

  it("should have labels for all types", () => {
    expect(Object.keys(labels)).toEqual([
      "advance",
      "bonus",
      "expense",
      "payment",
      "salary",
    ]);
  });

  it("should format amounts in labels", () => {
    const amount = BigInt(1_500_000);
    const text = `${labels.advance} — ${formatMoney(amount)}`;
    expect(text).toBe("💸 Avans — 1 500 000 so'm");
  });
});
