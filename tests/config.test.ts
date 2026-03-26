import { describe, it, expect } from "vitest";

describe("config", () => {
  it("should have default work days per month as 26", () => {
    const value = parseInt(process.env.WORK_DAYS_PER_MONTH || "26", 10);
    expect(value).toBe(26);
  });

  it("should have default advance limit as 80%", () => {
    const value = parseInt(process.env.ADVANCE_LIMIT_PCT || "80", 10);
    expect(value).toBe(80);
  });

  it("should have default timezone as Asia/Tashkent", () => {
    const value = process.env.TIMEZONE || "Asia/Tashkent";
    expect(value).toBe("Asia/Tashkent");
  });
});
