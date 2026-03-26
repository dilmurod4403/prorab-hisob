/**
 * Format amount with space-separated thousands
 * 1234567 → "1 234 567"
 */
export function formatAmount(amount: number | bigint): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Format amount with currency suffix
 * 1234567 → "1 234 567 so'm"
 */
export function formatMoney(amount: number | bigint): string {
  return `${formatAmount(amount)} so'm`;
}

/**
 * Escape HTML special characters for Telegram parse_mode: "HTML"
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Input validation constants ───

export const MAX_TEXT_LENGTH = 500;
export const MAX_NAME_LENGTH = 200;
export const MAX_AMOUNT = 100_000_000_000; // 100 mlrd so'm
