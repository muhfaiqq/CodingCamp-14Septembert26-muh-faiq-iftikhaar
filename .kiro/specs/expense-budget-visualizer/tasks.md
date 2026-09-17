# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a fully client-side expense tracking app using HTML, CSS, and Vanilla JavaScript (ES6+). The app uses Chart.js via CDN for the pie chart, localStorage for persistence, and follows a single-file-per-type structure. Tasks are ordered so each step builds on the last, ending with full integration.

---

## Tasks

- [x] 1. Set up project structure and static HTML shell
  - Create `index.html` with the full page structure: balance display (`#balance`), transaction form (`#item-name`, `#amount`, `#category`, `#add-btn`, `.error-msg` spans), transaction list (`#transaction-list`), chart container (`#chart-container`, `#chart-canvas`, `#chart-placeholder`), storage warning banner (`#storage-warning`), chart error banner (`#chart-error-banner`)
  - Add `<link>` to `css/style.css` and `<script src="js/app.js" defer>`
  - Add Chart.js CDN `<script>` tag with `onerror` handler that sets `window.chartUnavailable = true`
  - Create empty `css/style.css` and `js/app.js` files
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 2. Implement core styles
  - Style the overall layout to be responsive between 320 px and 1920 px viewport widths
  - Style the transaction form, input fields, and submit button
  - Style the transaction list as a scrollable container with per-item layout (name, amount, category, delete button)
  - Style the balance display at the top of the page
  - Style the chart container, placeholder, and error banner
  - Style warning/error banners (`#storage-warning`, `#chart-error-banner`) as non-blocking notices
  - Apply a minimum touch target of 44×44 CSS pixels to all buttons, inputs, and dropdowns for viewports ≤ 767 px
  - _Requirements: 2.2, 6.1, 7.4, 7.5_

- [x] 3. Implement the Validator module
  - [x] 3.1 Write the `validate(formData)` function in `js/app.js`
    - Trim `formData.name` and reject if empty
    - Parse `formData.amount` as float; reject if NaN, < 0.01, or > 999,999,999.99
    - Reject `formData.category` if not one of `['Food', 'Transport', 'Fun']`
    - Return `{ valid: boolean, errors: { name?, amount?, category? } }`
    - _Requirements: 1.2, 1.3_

  - [ ]* 3.2 Write property test for Validator — Property 1: Whitespace-only names rejected
    - **Property 1: Whitespace-only names are invalid**
    - **Validates: Requirements 1.2, 1.3**
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` as the name generator
    - Assert `validate({ name, amount: '5', category: 'Food' }).valid === false`

  - [ ]* 3.3 Write property test for Validator — Property 2: Amount boundary enforcement
    - **Property 2: Amount boundary enforcement**
    - **Validates: Requirements 1.2, 1.3**
    - Use `fc.float()` filtered to values outside [0.01, 999999999.99]
    - Assert `validate({ name: 'x', amount: String(outOfRange), category: 'Food' }).valid === false`

  - [ ]* 3.4 Write unit tests for Validator
    - Test: rejects empty name; accepts boundary amounts (0.01, 999999999.99); rejects missing category; accepts all valid categories
    - _Requirements: 1.2, 1.3_

- [x] 4. Implement the StorageManager module
  - [x] 4.1 Write `StorageManager` object in `js/app.js`
    - `isAvailable()`: test localStorage with a write/read/delete probe; set internal `_unavailable` flag and return false on failure
    - `load()`: `localStorage.getItem('expense_transactions')` → `JSON.parse`; return `[]` and set `_unavailable` flag on any error
    - `save(transactions)`: `JSON.stringify` → `localStorage.setItem`; no-op if `_unavailable`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 4.2 Write property test for StorageManager — Property 8: localStorage round-trip
    - **Property 8: localStorage round-trip preserves transactions**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - Generate `fc.array(transactionArb)`, call `StorageManager.save()` then `StorageManager.load()`
    - Assert the returned array is deeply equal to the saved array

  - [ ]* 4.3 Write unit tests for StorageManager
    - Test: returns `[]` when key absent; returns `[]` and sets unavailable on malformed JSON; `save()` is a no-op when unavailable
    - _Requirements: 5.4, 5.5_

- [x] 5. Implement pure helper functions for balance and category totals
  - [x] 5.1 Write `computeBalance(transactions)` in `js/app.js`
    - Sum all `transaction.amount` values; return 0 for an empty array
    - _Requirements: 3.1, 3.4_

  - [x] 5.2 Write `computeCategoryTotals(transactions)` in `js/app.js`
    - Accumulate amounts per category; skip transactions with `amount <= 0`
    - Return an object `{ Food: number, Transport: number, Fun: number }` with only categories whose total > 0
    - _Requirements: 4.1, 4.7, 4.8_

  - [ ]* 5.3 Write property test for computeBalance — Property 4: Balance equals sum of amounts
    - **Property 4: Balance equals sum of amounts**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Generate `fc.array(transactionArb)`; assert `computeBalance(txs) === txs.reduce((s,t) => s + t.amount, 0)`

  - [ ]* 5.4 Write property test for computeCategoryTotals — Property 5: Chart slices sum to total
    - **Property 5: Chart slices sum to total**
    - **Validates: Requirements 4.1**
    - Generate `fc.array(transactionArb)` with all amounts > 0; assert `sum(Object.values(computeCategoryTotals(txs))) === computeBalance(txs)`

  - [ ]* 5.5 Write property test for computeCategoryTotals — Property 6: Zero-amount transactions excluded from chart
    - **Property 6: Zero-amount transactions excluded from chart**
    - **Validates: Requirements 4.8**
    - Inject transactions with `amount <= 0`; assert they contribute 0 to all category totals

  - [ ]* 5.6 Write property test for computeCategoryTotals — Property 7: Only non-zero categories appear in chart
    - **Property 7: Only non-zero categories appear in chart and legend**
    - **Validates: Requirements 4.7**
    - Generate arrays that leave at least one category with total 0; assert that category key is absent from the returned object

- [ ] 6. Implement the Renderer module
  - [ ] 6.1 Write `Renderer.renderBalance(transactions)` in `js/app.js`
    - Compute balance via `computeBalance()`; format as `$0.00`; set `#balance` `textContent`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 6.2 Write `Renderer.renderList(transactions)` in `js/app.js`
    - If array is empty, show `#empty-msg` placeholder and return
    - Otherwise render `<li>` items in reverse insertion order using `textContent` (no `innerHTML` for user data)
    - Each `<li>` includes: name truncated to 50 chars, amount as `$0.00`, category, delete button with `aria-label="Delete {name}"` and `data-id="{id}"`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

  - [ ] 6.3 Write `Renderer.renderChart(transactions)` in `js/app.js`
    - Skip all chart logic if `window.chartUnavailable` is true
    - Compute `computeCategoryTotals(transactions)`
    - If no categories have total > 0, destroy/hide chart and show `#chart-placeholder`; also set legend to placeholder text
    - Otherwise update `chart.data.datasets[0].data` and `chart.data.labels` then call `chart.update()`
    - Use fixed colour constants: Food `#FF6384`, Transport `#36A2EB`, Fun `#FFCE56`
    - _Requirements: 4.1, 4.4, 4.5, 4.6, 4.7_

  - [ ] 6.4 Write `Renderer.renderAll(transactions)` in `js/app.js`
    - Call `renderBalance`, `renderList`, and `renderChart` in sequence (single synchronous pass)
    - _Requirements: 7.3_

- [ ] 7. Implement SpendingChart initialisation
  - Write `SpendingChart.init()` in `js/app.js`
  - Check `window.chartUnavailable`; if true, hide `#chart-canvas`, show `#chart-error-banner`, return
  - Otherwise create a `new Chart(canvas, { type: 'pie', ... })` instance stored in a module-level variable
  - _Requirements: 4.1, 4.5, 6.4, 6.5_

- [ ] 8. Implement the Controller and wire everything together
  - [ ] 8.1 Write `Controller.init()` in `js/app.js`
    - Call `StorageManager.isAvailable()`; if false, show `#storage-warning`
    - Call `StorageManager.load()` and populate `state.transactions`
    - Call `SpendingChart.init()` then `Renderer.renderAll(state.transactions)`
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ] 8.2 Write `Controller.addTransaction(formData)` in `js/app.js`
    - Run `Validator.validate(formData)`; on failure display per-field `.error-msg` and return
    - On success: create a `Transaction` object with `crypto.randomUUID()`, current ISO date, trimmed name, parsed amount, and selected category
    - Push to `state.transactions`, call `StorageManager.save()`, call `Renderer.renderAll()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [ ] 8.3 Write `Controller.deleteTransaction(id)` in `js/app.js`
    - Find and remove the transaction from `state.transactions` by id
    - Call `StorageManager.save()` and `Renderer.renderAll()` atomically (both or neither applied to state)
    - _Requirements: 2.5, 2.6, 3.3_

  - [ ] 8.4 Attach DOM event listeners in `js/app.js`
    - Form `submit` event → call `Controller.addTransaction(formData)` and reset form fields on success
    - Transaction list delegated `click` event on `.delete-btn` → call `Controller.deleteTransaction(id)` using `dataset.id`
    - Call `Controller.init()` on `DOMContentLoaded`
    - _Requirements: 1.1, 1.5, 1.6, 2.4_

  - [ ]* 8.5 Write property test for Controller.addTransaction — Property 3: Adding a transaction grows the list
    - **Property 3: Adding a transaction grows the list**
    - **Validates: Requirements 1.4, 2.3**
    - Generate valid `formData`; assert list length increases by 1 and new item is first in rendered order

  - [ ]* 8.6 Write property test for Controller.deleteTransaction — Property 9: Deletion reduces list and updates balance
    - **Property 9: Deletion reduces list and updates balance**
    - **Validates: Requirements 2.5, 3.3**
    - Generate `fc.array(transactionArb, { minLength: 1 })`; pick a random id; assert list shrinks by 1 and balance equals sum of remaining amounts

- [ ] 9. Checkpoint — verify core features end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement form field character limit enforcement and inline validation UX
  - Set `maxlength="100"` on `#item-name` (also enforced in HTML from task 1; confirm attribute is present)
  - Clear all `.error-msg` content at the start of each submit handler before re-evaluating validation
  - Ensure error messages are displayed adjacent to the correct fields per the error table in the design
  - _Requirements: 1.3, 1.6_

  - [ ]* 10.1 Write unit tests for form validation UX
    - Test: all three fields fail simultaneously; error messages clear on next submit; form resets after successful add
    - _Requirements: 1.3, 1.5_

- [ ] 11. Final checkpoint — full regression
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All user-supplied content must be written via `textContent` (never `innerHTML`) to prevent XSS
- `crypto.randomUUID()` is available in all ES6+ modern browsers; no polyfill needed
- Jest with `jsdom` environment is the recommended test runner; fast-check is the PBT library
- Property tests must include a comment: `// Feature: expense-budget-visualizer, Property N: <text>`
- Each property sub-task maps to a named property in `design.md` under "Correctness Properties"

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "3.1", "4.1", "5.1", "5.2"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "4.2", "4.3", "5.3", "5.4", "5.5", "5.6", "6.1", "6.2", "7"] },
    { "id": 3, "tasks": ["6.3", "6.4"] },
    { "id": 4, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 5, "tasks": ["8.4"] },
    { "id": 6, "tasks": ["8.5", "8.6", "10"] },
    { "id": 7, "tasks": ["10.1"] }
  ]
}
```
