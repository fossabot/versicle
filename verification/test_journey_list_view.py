import os
import pytest
from playwright.sync_api import Page, expect
from verification.utils import ensure_library_with_book, reset_app

def test_journey_list_view(page: Page):
    """
    Verifies the List View user journey:
    1. Setup library with a book.
    2. Toggle between Grid and List view.
    3. Verify List Item content.
    4. Verify persistence of view mode.
    """
    reset_app(page)

    # 1. Setup: Ensure library has at least one book
    ensure_library_with_book(page)

    # 2. Toggle to List View
    # Locate the toggle button. It should start in Grid mode, so the button icon is List.
    # Note: Depending on how the icon renders, we might rely on the aria-label which is dynamic

    toggle_btn = page.get_by_test_id("view-toggle-button")
    expect(toggle_btn).to_be_visible()

    # Initial state should be grid
    # BookCard should be visible
    book_card = page.locator("[data-testid^='book-card-']")
    expect(book_card).to_be_visible()

    # Click to switch to List
    toggle_btn.click()

    # 3. Verify List Item Content
    # BookListItem should be visible
    # We used data-testid="book-list-item-{id}"
    book_list_item = page.locator("[data-testid^='book-list-item-']")
    expect(book_list_item).to_be_visible()

    # Check that BookCard is NOT visible (or at least check that we are rendering list items)
    # Since we conditionally render, BookCard might still be in DOM if we didn't wait, but let's check visibility
    # Actually, BookCard is inside GridCell which is not rendered in List mode.
    # But let's focus on positive assertion of List Item content.

    # Check for metadata text (Author is usually visible in List Item)
    # The Alice book usually has "Lewis Carroll"
    expect(book_list_item).to_contain_text("Lewis Carroll")

    # Check that file size is displayed (it might be missing for existing books, but new ingestion should have it)
    # Since ensure_library_with_book likely loads the demo book or uses existing,
    # if it was freshly ingested, it might have size.
    # If not, the test shouldn't fail on missing size if it's undefined.
    # However, the demo book loading in `ensure_library_with_book` might not trigger ingestion.ts `processEpub`
    # if it just loads into DB directly?
    # Actually `EmptyLibrary` calls `fetch('alice.epub')` then `processEpub`. So it should have size.

    # Let's check for separator
    # expect(book_list_item).to_contain_text("•")

    # 4. Persistence
    # Reload page
    page.reload()

    # Wait for library to load
    expect(book_list_item).to_be_visible()

    # Verify we are still in List mode
    # Toggle button should now show Grid icon (aria-label="Switch to grid view")
    expect(toggle_btn).to_have_attribute("aria-label", "Switch to grid view")

    # 5. Toggle back to Grid
    toggle_btn.click()
    expect(book_card).to_be_visible()
    expect(book_list_item).not_to_be_visible()
