/**
 * Standard utility functions for Fuloozi
 */

export function createPageUrl(pageName: string): string {
  return '/' + pageName.toLowerCase().replace(/ /g, '-');
}

/**
 * Format currency in AED (UAE Dirham) by default
 * Handles numbers and numeric strings, negative values, and rounding.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options?: {
    currency?: string;
    showSign?: boolean;
    compact?: boolean;
  }
): string {
  const { currency = 'AED', showSign = false, compact = false } = options || {};
  if (amount === null || amount === undefined || amount === '') {
    return `${currency} 0.00`;
  }

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${currency} 0.00`;

  const absVal = Math.abs(num);
  let formatted = '';

  if (compact && absVal >= 10000) {
    if (absVal >= 1000000) {
      formatted = (absVal / 1000000).toFixed(1) + 'M';
    } else {
      formatted = (absVal / 1000).toFixed(1) + 'k';
    }
  } else {
    formatted = absVal.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const sign = num < 0 ? '-' : showSign && num > 0 ? '+' : '';
  return `${sign}${currency} ${formatted}`;
}

/**
 * Universal Category Taxonomy for Fuloozi
 * Maps legacy database keys (e.g. alimentacao, receita, despesa) and modern keys
 */
export const CATEGORY_LABELS: Record<string, string> = {
  // Expense Categories
  alimentacao: 'Food & Groceries',
  groceries: 'Food & Groceries',
  transporte: 'Transport & Fuel',
  transport: 'Transport & Fuel',
  moradia: 'Housing & Rent',
  housing: 'Housing & Rent',
  contas: 'Bills & Utilities',
  utilities: 'Bills & Utilities',
  bills: 'Bills & Utilities',
  saude: 'Health & Wellness',
  health: 'Health & Wellness',
  educacao: 'Education & Kids',
  education: 'Education & Kids',
  lazer: 'Dining & Lifestyle',
  leisure: 'Dining & Lifestyle',
  compras: 'Shopping & Retail',
  shopping: 'Shopping & Retail',
  outros_gastos: 'Other Expenses',
  other_expense: 'Other Expenses',

  // Income Categories
  salario: 'Salary & Income',
  salary: 'Salary & Income',
  freelance: 'Consulting & Freelance',
  investimentos: 'Investments & Returns',
  investments: 'Investments & Returns',
  outras_receitas: 'Other Income',
  other_income: 'Other Income',
};

export function getCategoryLabel(categoryKey: string | undefined | null): string {
  if (!categoryKey) return 'Uncategorized';
  return CATEGORY_LABELS[categoryKey] || categoryKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
