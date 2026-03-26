import { describe, it, expect } from "vitest";
import { formatAmount, formatMoney } from "../src/utils/formatters";

describe("employee display formatting", () => {
  it("should format salary correctly", () => {
    expect(formatMoney(5000000)).toBe("5 000 000 so'm");
  });

  it("should format large salary", () => {
    expect(formatMoney(BigInt(15000000))).toBe("15 000 000 so'm");
  });

  it("should format small salary", () => {
    expect(formatMoney(800000)).toBe("800 000 so'm");
  });
});

describe("employee list pagination", () => {
  it("should calculate total pages correctly", () => {
    const pageSize = 8;
    expect(Math.max(1, Math.ceil(0 / pageSize))).toBe(1);
    expect(Math.max(1, Math.ceil(5 / pageSize))).toBe(1);
    expect(Math.max(1, Math.ceil(8 / pageSize))).toBe(1);
    expect(Math.max(1, Math.ceil(9 / pageSize))).toBe(2);
    expect(Math.max(1, Math.ceil(16 / pageSize))).toBe(2);
    expect(Math.max(1, Math.ceil(17 / pageSize))).toBe(3);
  });
});

describe("salary input parsing", () => {
  it("should parse plain numbers", () => {
    expect(parseInt("5000000", 10)).toBe(5000000);
  });

  it("should parse after removing spaces and dots", () => {
    const cleaned = "5 000 000".replace(/[\s,._]/g, "");
    expect(parseInt(cleaned, 10)).toBe(5000000);
  });

  it("should parse after removing commas", () => {
    const cleaned = "5,000,000".replace(/[\s,._]/g, "");
    expect(parseInt(cleaned, 10)).toBe(5000000);
  });

  it("should reject non-numeric input", () => {
    const cleaned = "besh million".replace(/[\s,._]/g, "");
    expect(isNaN(parseInt(cleaned, 10))).toBe(true);
  });
});

describe("phone validation", () => {
  it("should accept valid phone numbers", () => {
    const valid = ["+998901234567", "998901234567", "901234567"];
    for (const phone of valid) {
      const cleaned = phone.replace(/[\s\-()]/g, "");
      expect(cleaned.length >= 9 && /^\+?\d+$/.test(cleaned)).toBe(true);
    }
  });

  it("should reject invalid phone numbers", () => {
    const invalid = ["abc", "123", "+99890"];
    for (const phone of invalid) {
      const cleaned = phone.replace(/[\s\-()]/g, "");
      const isValid = cleaned.length >= 9 && /^\+?\d+$/.test(cleaned);
      expect(isValid).toBe(false);
    }
  });
});
