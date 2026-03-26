import { describe, it, expect } from "vitest";
import { formatAmount, formatMoney } from "../src/utils/formatters";

describe("formatAmount", () => {
  it("should format thousands with spaces", () => {
    expect(formatAmount(1234567)).toBe("1 234 567");
  });

  it("should handle small numbers", () => {
    expect(formatAmount(500)).toBe("500");
  });

  it("should handle zero", () => {
    expect(formatAmount(0)).toBe("0");
  });

  it("should handle bigint", () => {
    expect(formatAmount(BigInt(5000000))).toBe("5 000 000");
  });
});

describe("formatMoney", () => {
  it("should append so'm suffix", () => {
    expect(formatMoney(1500000)).toBe("1 500 000 so'm");
  });
});
