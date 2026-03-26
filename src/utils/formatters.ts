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
