# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a fully client-side single-page web application built with HTML, CSS, and Vanilla JavaScript (ES6+). It lets users record expense transactions, view them in a scrollable list, and understand their spending distribution through a live pie chart — all without a backend server or build toolchain.

The application stores all data in the browser's `localStorage` so transactions persist across sessions. The pie chart is rendered using **Chart.js** loaded from a CDN, making it the only external dependency. If that CDN call fails, the rest of the application continues to work normally.

### Key Design Goals

- **Zero-dependency build**: the app opens by double-clicking `index.html`.
- **Single-file-per-type structure**: one `index.html`, one `css/style.css`, one `js/app.js`.
- **Immediate UI feedback**: all UI updates (list, balance, chart) complete within 100 ms of user action.
- **Graceful degradation**: localStorage failures and CDN failures are caught and surfaced to the user without breaking unaffected features.

---

## Architecture

The application follows a simple **event-driven MVC-lite** pattern inside a single JavaScript file. There is no framework, no module bundler, and no server.

```
┌─────────────────────────────────────────────┐
│                  index.html                 │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │  Form    │  │   List   │  │   Chart   │ │
│  │  (View)  │  │  (View)  │  │  (View)   │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘ │
│       │              │              │        │
│       └──────────────┼──────────────┘        │
│                      ▼                        │
│           ┌──────────────────────┐            │
│           │   app.js (Controller)│            │
│           │  - State (in-memory) │            │
│           │  - Validator         │            │
│           │  - Renderer          │            │
│           │  - StorageManager    │            │
│           └──────────┬───────────┘            │
│                      │                        │
│           ┌──────────▼───────────┐            │
│           │    localStorage      │            │
│           └──────────────────────┘            │
└─────────────────────────────────────────────┘
```

### Data Flow

1. User fills in the Transaction Form and submits.
2. **Validator** checks all fields; on failure, inline errors are shown and processing stops.
3. On success, a new `Transaction` object is created and pushed to the in-memory `state.transactions` array.
4. **StorageManager** serialises `state.transactions` to `localStorage`.
5. **Renderer** updates the Transaction List, Balance Display, and Chart — all in a single synchronous render pass to stay within the 100 ms budget.

---

## Components and Interfaces

### 1. TransactionForm

Responsible for collecting and submitting user input.

**HTML elements**
- `#item-name` — `<input type="text" maxlength="100">`
- `#amount` — `<input type="number" min="0.01" max="999999999.99" step="0.01">`
- `#category` — `<select>` with options: Food, Transport, Fun (plus a disabled default option)
- `#add-btn` — `<button type="submit">`
- `.error-msg` spans adjacent to each field for inline validation messages

**Behaviour**
- On submit: call `Validator.validate(formData)`.
- On validation failure: display per-field `.error-msg` elements; do not modify state.
- On validation success: call `Controller.addTransaction(formData)`, then reset the form.

---

### 2. TransactionList

Responsible for rendering the list of transactions and handling deletions.

**HTML element**
- `#transaction-list` — `<ul>` or `<div>` acting as a scrollable container.

**Rendered item structure (per transaction)**
```html
<li class="transaction-item" data-id="{id}">
  <span class="tx-name">{name (truncated to 50 chars)}</span>
  <span class="tx-amount">{amount formatted as $0.00}</span>
  <span class="tx-category">{category}</span>
  <button class="delete-btn" aria-label="Delete {name}">Delete</button>
</li>
```

**Behaviour**
- Items are rendered in reverse insertion order (newest first).
- When zero transactions exist, a placeholder `<p id="empty-msg">` is shown instead.
- Delete button fires `Controller.deleteTransaction(id)`.

---

### 3. BalanceDisplay

**HTML element**
- `#balance` — a heading or span.

**Behaviour**
- Shows the sum of all transaction amounts formatted as `$0.00`.
- Updated synchronously within the same render pass as the list and chart.

---

### 4. Chart (SpendingChart)

**HTML element**
- `#chart-canvas` — `<canvas>` element.
- `#chart-container` — wrapper div; `#chart-placeholder` shown when no data.

**Library**: [Chart.js](https://www.chartjs.org/) loaded via CDN.

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
```

**Behaviour**
- Renders a pie chart with one slice per category that has a total amount > 0.
- Category colours are fixed constants (never change between renders).
- On re-render: call `chart.data.datasets[0].data = [...]` then `chart.update()` — avoids destroy/recreate overhead.
- If Chart.js fails to load, `SpendingChart.init()` catches the missing global and sets a `chartUnavailable` flag; a visible error banner is shown and chart-related code is skipped on subsequent operations.

**Category colour constants**
| Category  | Hex colour |
|-----------|-----------|
| Food      | `#FF6384` |
| Transport | `#36A2EB` |
| Fun       | `#FFCE56` |

---

### 5. Validator

A pure function module with no side effects on DOM or state.

```js
/**
 * @param {{ name: string, amount: string, category: string }} formData
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validate(formData) { ... }
```

**Rules**
- `name`: non-empty after trimming.
- `amount`: parseable as a float, between 0.01 and 999,999,999.99 inclusive.
- `category`: one of `['Food', 'Transport', 'Fun']`.

---

### 6. StorageManager

Wraps `localStorage` access. All methods are wrapped in `try/catch`.

```js
const StorageManager = {
  save(transactions) { ... },   // JSON.stringify → localStorage.setItem
  load()            { ... },   // localStorage.getItem → JSON.parse; returns [] on error
  isAvailable()     { ... },   // returns boolean; sets internal unavailable flag on failure
};
```

If `localStorage` is unavailable or a parse error occurs during `load()`, `StorageManager` sets an internal `unavailable` flag and `save()` becomes a no-op for the session. A warning banner is displayed once.

---

### 7. Controller

The central coordinator. Holds `state` and orchestrates Validator → StorageManager → Renderer.

```js
const state = {
  transactions: [],   // Transaction[]
};

const Controller = {
  init()                    { ... },  // load from storage, render
  addTransaction(formData)  { ... },  // validate, push, save, render
  deleteTransaction(id)     { ... },  // splice, save, render
};
```

---

### 8. Renderer

Stateless render functions called after every state change. Receives the full `state.transactions` array.

```js
const Renderer = {
  renderAll(transactions)  { ... },  // calls all three below
  renderList(transactions) { ... },
  renderBalance(transactions) { ... },
  renderChart(transactions) { ... },
};
```

---

## Data Models

### Transaction

```js
/**
 * @typedef {Object} Transaction
 * @property {string} id        - UUID v4 generated with crypto.randomUUID()
 * @property {string} name      - Item name, 1–100 characters
 * @property {number} amount    - Positive float, 0.01–999,999,999.99
 * @property {string} category  - 'Food' | 'Transport' | 'Fun'
 * @property {string} date      - ISO 8601 date string (new Date().toISOString())
 */
```

### Serialised Storage Format

```json
[
  {
    "id": "a1b2c3d4-...",
    "name": "Coffee",
    "amount": 4.5,
    "category": "Food",
    "date": "2025-08-14T10:30:00.000Z"
  }
]
```

The array is stored under the `localStorage` key `"expense_transactions"`.

### CategoryTotals (derived, not stored)

```js
/**
 * Computed on every render pass from state.transactions.
 * @typedef {{ Food: number, Transport: number, Fun: number }} CategoryTotals
 */
```

Only categories with a total > 0 are included in chart data and the legend.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Whitespace-only names are invalid

*For any* string composed entirely of whitespace characters, submitting it as the item name SHALL be rejected by the Validator and the transaction list SHALL remain unchanged.

**Validates: Requirements 1.2, 1.3**

---

### Property 2: Amount boundary enforcement

*For any* numeric value outside the range [0.01, 999,999,999.99], the Validator SHALL reject the transaction and the transaction list SHALL remain unchanged.

**Validates: Requirements 1.2, 1.3**

---

### Property 3: Adding a transaction grows the list

*For any* valid transaction (non-empty trimmed name, amount in range, valid category), adding it SHALL increase the transaction list length by exactly one and the new entry SHALL appear as the first item in the rendered list.

**Validates: Requirements 1.4, 2.3**

---

### Property 4: Balance equals sum of amounts

*For any* collection of transactions, the Balance Display value SHALL equal the arithmetic sum of all transaction amounts formatted to two decimal places.

**Validates: Requirements 3.1, 3.2, 3.3**

---

### Property 5: Chart slices sum to total

*For any* non-empty collection of transactions where all amounts are > 0, the sum of all category totals used for the chart slices SHALL equal the sum of all transaction amounts.

**Validates: Requirements 4.1**

---

### Property 6: Zero-amount transactions excluded from chart

*For any* transaction with an amount ≤ 0, the chart SHALL exclude that transaction from all category totals and slice calculations.

**Validates: Requirements 4.8**

---

### Property 7: Only non-zero categories appear in chart and legend

*For any* set of transactions where at least one category has a total of zero, the chart SHALL render no slice for that category and the legend SHALL not list it.

**Validates: Requirements 4.7**

---

### Property 8: LocalStorage round-trip preserves transactions

*For any* list of valid transactions written to localStorage, reading and parsing the stored value SHALL produce a list of objects equal in length and field values to the original list.

**Validates: Requirements 5.1, 5.2, 5.3**

---

### Property 9: Deletion reduces list and updates balance

*For any* transaction that exists in the list, deleting it SHALL reduce the list length by exactly one and the Balance Display SHALL reflect the sum of the remaining transactions' amounts.

**Validates: Requirements 2.5, 3.3**

---

## Error Handling

### Validation Errors (user-facing)

- Each form field has a dedicated `.error-msg` element (initially hidden).
- On submit, all three fields are validated together; all failing fields show their message simultaneously.
- Error messages are cleared and re-evaluated on the next submit attempt (not on keystroke, to avoid distraction).

| Field    | Error condition                            | Message example                                |
|----------|--------------------------------------------|------------------------------------------------|
| Name     | Empty or whitespace only                   | "Item name is required."                       |
| Amount   | Empty, non-numeric, or out of range        | "Enter an amount between 0.01 and 999,999,999.99." |
| Category | No option selected (default/disabled)      | "Please select a category."                    |

### localStorage Unavailable

- Detected once during `Controller.init()` via `StorageManager.isAvailable()`.
- A non-blocking warning banner `#storage-warning` is shown at the top of the page.
- `StorageManager.save()` becomes a no-op for the session; all other features work normally.
- No further localStorage errors are surfaced (silent no-op).

### localStorage Parse Error

- If `JSON.parse` throws during `load()`, `StorageManager` returns `[]`, sets the `unavailable` flag, and shows the same warning banner.
- This covers corrupted or externally-modified storage values.

### Chart.js CDN Failure

- A `window.onerror` / `<script onerror>` handler on the Chart.js `<script>` tag sets `window.chartUnavailable = true`.
- `SpendingChart.init()` checks this flag; if true, it hides `#chart-canvas`, shows `#chart-error-banner` ("Chart is currently unavailable"), and short-circuits all future `renderChart()` calls.
- Transaction Form, Transaction List, Balance Display, and Data Persistence are unaffected.

### Input Sanitisation

- Item name is retrieved via `.value` and trimmed before storage; no HTML is ever set via `innerHTML` for user-supplied content — the name is inserted using `textContent` to prevent XSS.

---

## Testing Strategy

This application is a UI-heavy client-side app with no build step. PBT applies to the pure logic layer (Validator, StorageManager, CategoryTotals computation, balance calculation). UI rendering and infrastructure wiring use example-based tests.

### Unit / Example-Based Tests

Target: Validator, StorageManager, balance/category helpers in isolation (with `localStorage` mocked via `jest-localstorage-mock` or a simple `Map`-based shim).

**Tool**: [Jest](https://jestjs.io/) with `jsdom` environment.

Key example-based scenarios:
- Validator rejects empty name, invalid amount, missing category.
- Validator accepts boundary values (0.01, 999999999.99).
- StorageManager returns `[]` when no key exists.
- StorageManager returns `[]` and sets unavailable flag when stored JSON is malformed.
- Balance of empty list is 0.
- Balance after deleting the only transaction is 0.
- Empty Transaction List renders placeholder message.
- Delete button fires correct transaction ID.
- Chart shows `#chart-error-banner` when `window.chartUnavailable = true`.

### Property-Based Tests

**Library**: [fast-check](https://fast-check.io/) — available via CDN/npm, well-maintained, supports TypeScript and plain JS.

**Configuration**: minimum 100 runs per property (fast-check default).

Each property test must include a comment tag:
```js
// Feature: expense-budget-visualizer, Property N: <property_text>
```

| Property | Test target | Generator |
|----------|-------------|-----------|
| P1: Whitespace names rejected | `Validator.validate()` | `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` |
| P2: Out-of-range amounts rejected | `Validator.validate()` | `fc.float()` filtered outside [0.01, 999999999.99] |
| P3: Valid add grows list by 1 | `Controller.addTransaction()` | `fc.record({ name: fc.string(1,100), amount: fc.float({min:0.01,max:999999999.99}), category: fc.constantFrom('Food','Transport','Fun') })` |
| P4: Balance = sum of amounts | `computeBalance()` | `fc.array(transactionArb)` |
| P5: Chart slices sum to total | `computeCategoryTotals()` | `fc.array(transactionArb)` |
| P6: Zero-amount excluded from chart | `computeCategoryTotals()` | `fc.array(transactionArb)` with injected zero-amount items |
| P7: Zero-total categories omitted | `computeCategoryTotals()` | `fc.array(transactionArb)` |
| P8: localStorage round-trip | `StorageManager.save()` + `StorageManager.load()` | `fc.array(transactionArb)` |
| P9: Delete reduces list and balance | `Controller.deleteTransaction()` | `fc.array(transactionArb, {minLength:1})` |

### Integration / Smoke Tests

- Open `index.html` in a real browser (Playwright or manual) and verify:
  - The full UI renders on first load.
  - Adding a transaction updates list, balance, and chart.
  - Refreshing the page restores the same transactions.
  - Blocking the Chart.js CDN URL causes the error banner to appear while the form/list/balance remain functional.

### Accessibility

- All interactive controls meet the 44×44 px minimum touch target on narrow viewports (verified via browser DevTools).
- Form inputs have associated `<label>` elements.
- Delete buttons have `aria-label` attributes.
- Note: full WCAG compliance requires manual testing with assistive technologies.
