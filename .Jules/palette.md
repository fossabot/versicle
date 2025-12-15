## 2025-12-12 - Custom Progress Indicators
**Learning:** Custom div-based progress bars were missing semantic roles, making them invisible to screen readers despite being a key part of the book card UI.
**Action:** Always wrap visual progress bars with `role="progressbar"` and include `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label`.

## 2025-12-12 - Destructive Action Confirmation
**Learning:** Native `window.confirm` is jarring and non-customizable. Radix UI `Dialog` can be easily integrated into list items (like `BookCard`) to provide a consistent, accessible confirmation flow without disrupting the user's context.
**Action:** Replace `window.confirm` with custom `Dialog` components for destructive actions, ensuring `stopPropagation` is handled correctly to prevent navigation.
