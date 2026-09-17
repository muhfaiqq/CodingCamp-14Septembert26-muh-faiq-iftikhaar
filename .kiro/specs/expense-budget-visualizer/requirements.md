# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, manage a transaction list, and visualize spending distribution by category through a pie chart. The application runs entirely in the browser with no backend server, using Local Storage to persist data between sessions. It is built with HTML, CSS, and Vanilla JavaScript, with no frameworks required.

## Glossary

- **App**: The Expense & Budget Visualizer web application running in the user's browser.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Transaction_Form**: The HTML form that collects item name, amount, and category from the user.
- **Transaction_List**: The scrollable UI component that displays all saved transactions.
- **Balance_Display**: The UI element at the top of the page that shows the current total of all transaction amounts.
- **Chart**: The pie chart visual component that shows spending distribution broken down by category.
- **Local_Storage**: The browser's built-in Web Storage API used to persist transaction data client-side.
- **Category**: A classification label for a transaction. Valid values are: Food, Transport, Fun.
- **Validator**: The client-side logic responsible for checking form field completeness and data correctness before a transaction is saved.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can add a new expense transaction to my list.

#### Acceptance Criteria

1. THE Transaction_Form SHALL provide a text input field for the item name accepting up to 100 characters, a numeric input field for the amount accepting values between 0.01 and 999,999,999.99, and a dropdown selector for the category with the options: Food, Transport, and Fun.
2. WHEN the user submits the Transaction_Form, THE Validator SHALL check that the item name field is not empty, the amount field contains a numeric value between 0.01 and 999,999,999.99, and a category option has been selected from the dropdown.
3. IF the Validator determines that one or more required fields are empty or invalid, THEN THE App SHALL display an inline error message adjacent to each missing or invalid field identifying the specific validation failure, SHALL NOT add a transaction to the Transaction_List, SHALL NOT update application state, and SHALL NOT write to Local_Storage.
4. WHEN the Validator confirms all fields are valid, THE App SHALL create a new Transaction record containing the item name, amount, category, and the current date, and add it to the Transaction_List.
5. WHEN a Transaction is successfully added, THE Transaction_Form SHALL reset the item name field to empty, the amount field to empty, and the category dropdown to its unselected default state.
6. IF the item name input exceeds 100 characters, THEN THE Transaction_Form SHALL restrict input to a maximum of 100 characters and SHALL NOT accept additional characters beyond the limit.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see a scrollable list of all my added transactions so that I can review and manage my expenses.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all saved Transactions, each showing the item name (truncated at 50 characters if necessary), amount formatted as a currency value with two decimal places, and category.
2. WHILE the number of Transactions exceeds the visible area of the Transaction_List, THE Transaction_List SHALL be scrollable to allow the user to view all entries.
3. THE Transaction_List SHALL display Transactions in reverse insertion order, with the most recently added Transaction appearing at the top of the list.
4. THE Transaction_List SHALL render a delete button alongside each Transaction entry at all times.
5. WHEN the user activates the delete button for a Transaction and the deletion succeeds, THE App SHALL atomically remove that Transaction from the Transaction_List and update the Balance_Display to reflect the new total within 100 milliseconds, such that if either operation fails, neither the Transaction_List removal nor the Balance_Display update shall be applied.
6. WHEN the user activates the delete button for a Transaction, THE App SHALL update the Chart to reflect the updated spending distribution within 100 milliseconds.
7. WHILE the Transaction_List contains zero Transactions, THE Transaction_List SHALL display a placeholder message indicating that no transactions have been added yet.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total balance prominently at the top of the page so that I know my cumulative spending at a glance.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all Transaction amounts currently in the Transaction_List, formatted as a currency value with a currency symbol prefix and two decimal places (e.g., $0.00).
2. WHEN a new Transaction is added to the Transaction_List, THE Balance_Display SHALL update to reflect the new total within 100 milliseconds.
3. WHEN a Transaction is deleted from the Transaction_List, THE Balance_Display SHALL update to reflect the new total within 100 milliseconds.
4. WHILE the Transaction_List contains zero Transactions, THE Balance_Display SHALL show a value of $0.00.

---

### Requirement 4: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart displaying the proportion of total spending for each Category (Food, Transport, Fun) relative to the sum of all Transaction amounts, where each slice angle is proportional to that Category's share of the total and all slices together sum to 360 degrees.
2. WHEN a new Transaction is added to the Transaction_List, THE Chart SHALL re-render to reflect the updated spending distribution within 100 milliseconds.
3. WHEN a Transaction is deleted from the Transaction_List, THE Chart SHALL re-render to reflect the updated spending distribution within 100 milliseconds.
4. WHILE the Transaction_List contains zero Transactions, THE Chart SHALL display a placeholder state containing a visible message indicating no spending data is available, rather than rendering any chart slices.
5. THE Chart SHALL assign a distinct, consistent color to each Category such that no two Categories share the same color and each Category's color remains unchanged across re-renders.
6. THE Chart SHALL display a legend identifying each Category by name and its corresponding color, where the legend is visible without any user interaction. WHILE the Transaction_List contains zero Transactions, THE Chart legend SHALL display placeholder text indicating no spending data is available.
7. IF a Transaction_List contains Transactions for only a subset of the defined Categories, or if deletions reduce a Category's total to exactly zero, THEN THE Chart SHALL render slices only for Categories with a total amount greater than zero and omit Categories with a total of zero from both the chart and the legend.
8. IF a Transaction's Amount is zero or negative, THEN THE Chart SHALL exclude that Transaction from the spending distribution calculation and not represent it as a slice.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between browser sessions so that I do not lose my data when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a Transaction is successfully added, THE App SHALL write the updated Transaction list to Local_Storage.
2. WHEN a Transaction is deleted, THE App SHALL write the updated Transaction list to Local_Storage.
3. WHEN the App initializes in the browser, THE App SHALL read the Transaction list from Local_Storage and populate the Transaction_List, Balance_Display, and Chart with the stored data.
4. IF Local_Storage contains no previously saved Transaction data, THEN THE App SHALL initialize with an empty Transaction_List, a Balance_Display value of $0.00, and a Chart displaying no data series and no segments.
5. IF Local_Storage is unavailable or the stored Transaction data cannot be parsed as a valid Transaction list, THEN THE App SHALL initialize with an empty Transaction_List and display a warning message that remains visible without blocking user interaction; subsequent add and delete operations SHALL proceed normally for the duration of the session using in-memory state only, without attempting further Local_Storage reads or writes.

---

### Requirement 6: Layout and File Structure

**User Story:** As a developer, I want the project to follow a clean, single-file-per-type structure so that the codebase remains easy to maintain.

#### Acceptance Criteria

1. THE App SHALL load its styles from exactly one CSS file located in the `css/` directory.
2. THE App SHALL load its application logic from exactly one JavaScript file located in the `js/` directory.
3. THE App SHALL be launchable by opening a single `index.html` file directly in a modern browser supporting ECMAScript 2015 (ES6) or later without requiring a backend server or build step.
4. WHERE a charting library is used, THE App SHALL load it via a CDN script tag in `index.html` rather than as a bundled or compiled dependency.
5. IF the CDN charting library fails to load, THEN THE App SHALL display a visible error message indicating the chart is unavailable while all non-chart features (Transaction_Form, Transaction_List, Balance_Display, Data Persistence) SHALL remain fully functional. THE Transaction_Form SHALL remain fully functional whenever the App loads successfully, regardless of whether the CDN charting library loads successfully or fails.

---

### Requirement 7: Browser Compatibility and Performance

**User Story:** As a user, I want the app to work reliably across modern browsers and respond instantly to my interactions so that I have a smooth experience.

#### Acceptance Criteria

1. THE App SHALL function correctly in the current stable versions of Chrome, Firefox, Edge, and Safari without polyfills or browser-specific workarounds.
2. THE App SHALL complete its initial load and render the full UI in under 2 seconds on a connection with a download speed of at least 10 Mbps, and SHALL NOT remain in a permanent load failure state.
3. WHEN the user submits the Transaction_Form or deletes a Transaction, THE App SHALL reflect all resulting UI changes (Transaction_List, Balance_Display, Chart) within 100 milliseconds of the triggering user action.
4. THE App SHALL maintain correct functionality and layout on viewport widths between 320px and 1920px.
5. WHERE the App is rendered on a viewport width between 320px and 767px, THE App SHALL render all interactive controls (buttons, inputs, dropdowns) with a minimum touch target size of 44×44 CSS pixels.
