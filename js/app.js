/* Expense & Budget Visualizer — application logic */
/* Populated in Tasks 3–8 */

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];
const AMOUNT_MIN = 0.01;
const AMOUNT_MAX = 999_999_999.99;

/**
 * Validates transaction form data before it is saved.
 *
 * @param {{ name: string, amount: string, category: string }} formData
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validate(formData) {
  const errors = {};

  // --- Name ---
  const trimmedName = (formData.name ?? '').trim();
  if (trimmedName === '') {
    errors.name = 'Item name is required.';
  }

  // --- Amount ---
  const parsedAmount = parseFloat(formData.amount);
  if (
    formData.amount === '' ||
    formData.amount === null ||
    formData.amount === undefined ||
    isNaN(parsedAmount) ||
    parsedAmount < AMOUNT_MIN ||
    parsedAmount > AMOUNT_MAX
  ) {
    errors.amount = 'Enter an amount between 0.01 and 999,999,999.99.';
  }

  // --- Category ---
  if (!VALID_CATEGORIES.includes(formData.category)) {
    errors.category = 'Please select a category.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// StorageManager
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'expense_transactions';
const STORAGE_PROBE_KEY = '__storage_test__';

const StorageManager = {
  /** Internal flag — true when localStorage is unavailable or data is corrupt. */
  _unavailable: false,

  /**
   * Probes localStorage with a write/read/delete sentinel.
   * Sets `_unavailable` and returns false if any step throws.
   *
   * @returns {boolean}
   */
  isAvailable() {
    try {
      localStorage.setItem(STORAGE_PROBE_KEY, '1');
      localStorage.getItem(STORAGE_PROBE_KEY);
      localStorage.removeItem(STORAGE_PROBE_KEY);
      return true;
    } catch (e) {
      this._unavailable = true;
      return false;
    }
  },

  /**
   * Reads and parses the transaction list from localStorage.
   * Returns an empty array when the key is absent, the value cannot be parsed,
   * or localStorage is unavailable — and sets `_unavailable` in the latter two cases.
   *
   * @returns {Transaction[]}
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        return [];
      }
      const parsed = JSON.parse(raw);
      // Guard against non-array values stored under the key.
      if (!Array.isArray(parsed)) {
        this._unavailable = true;
        return [];
      }
      return parsed;
    } catch (e) {
      this._unavailable = true;
      return [];
    }
  },

  /**
   * Serialises and saves the transaction list to localStorage.
   * Does nothing (no-op) when `_unavailable` is true.
   *
   * @param {Transaction[]} transactions
   */
  save(transactions) {
    if (this._unavailable) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
      this._unavailable = true;
    }
  },
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Computes the total balance across all transactions.
 * Returns 0 when the array is empty.
 *
 * @param {Transaction[]} transactions
 * @returns {number}
 */
function computeBalance(transactions) {
  if (transactions.length === 0) {
    return 0;
  }
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Accumulates transaction amounts per category.
 * Skips any transaction whose amount is <= 0.
 * Returns an object containing only categories whose total is strictly > 0.
 *
 * @param {Transaction[]} transactions
 * @returns {{ Food?: number, Transport?: number, Fun?: number }}
 */
function computeCategoryTotals(transactions) {
  const totals = {};

  for (const tx of transactions) {
    // Requirements 4.8: exclude transactions with amount <= 0
    if (tx.amount <= 0) {
      continue;
    }
    if (totals[tx.category] === undefined) {
      totals[tx.category] = 0;
    }
    totals[tx.category] += tx.amount;
  }

  // Requirements 4.7: omit categories whose total is not strictly > 0
  const result = {};
  for (const category of VALID_CATEGORIES) {
    if (totals[category] > 0) {
      result[category] = totals[category];
    }
  }

  return result;
}
