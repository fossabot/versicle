# Learnings from Library Search Implementation

## Mobile Layout Patterns
- **Stacked Headers:** For complex headers with actions, search, and sorting, a 3-row stacked layout is effective on mobile (vertical flex container) while transitioning to a single row on desktop.
- **Icon-Only Buttons:** Using `variant="ghost"` and `size="icon"` for action buttons (like Settings or Import) saves critical horizontal space on mobile screens.
- **Full-Width Inputs:** Search inputs should span the full width on mobile devices to provide an accessible touch target and readable text area.

## Search Implementation
- **Client-Side Filtering:** For moderate dataset sizes (like a personal book library), client-side filtering (using `Array.prototype.filter`) is performant and responsive, avoiding the need for complex backend search infrastructure.
- **State Management:** Simple React state (`useState`) is sufficient for managing the search query and filtering logic within the view component.

## Verification
- **Viewport Specifics:** Verification scripts for mobile layouts must explicitly set the viewport size (e.g., `390x844`) to trigger responsive design breakpoints correctly.
- **Build vs. Preview:** When using `npm run preview`, the server serves the `dist` folder. It is critical to run `npm run build` after code changes and before verification to ensure the preview server reflects the latest code.
