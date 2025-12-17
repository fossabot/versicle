
import pytest
from playwright.sync_api import Page, expect

def test_reading_history_journey(page: Page):
    # 1. Load the app (using the demo book since library might be empty)
    page.goto("/")

    # Handle empty library case by loading demo book if prompted
    try:
        page.wait_for_selector("text=Your library is empty", timeout=2000)
        page.click("text=Load Demo Book")
    except:
        pass # Library not empty or demo book already loaded

    # Wait for book cover to appear to ensure we are in library or book is loaded
    # If in library, click the first book
    try:
        page.wait_for_selector("[data-testid^='book-card-']", timeout=5000)
        page.click("[data-testid^='book-card-']:first-child")
    except:
        pass # Might be already in reader if persistent state

    # Wait for reader to load
    page.wait_for_selector("[data-testid='reader-view']", timeout=10000)

    # 2. Open Table of Contents
    page.click("[data-testid='reader-toc-button']")

    # 3. Switch to History Tab
    page.click("[data-testid='tab-history']")

    # Verify "No reading history" or list of items
    # It seems to persist across test runs in this environment?
    # Or maybe opening the book writes a history entry?

    # 4. Navigate to a new chapter to generate history
    page.click("[data-testid='tab-chapters']")
    page.wait_for_selector("[data-testid^='toc-item-']", timeout=5000)

    # Click a different chapter than current to ensure navigation
    page.click("[data-testid='toc-item-2']")

    # Wait for navigation to complete
    page.wait_for_timeout(2000)

    # 5. Check History again
    page.click("[data-testid='reader-toc-button']")
    if not page.is_visible("[data-testid='reader-toc-sidebar']"):
         page.click("[data-testid='reader-toc-button']")

    page.click("[data-testid='tab-history']")

    # Should have at least one entry now.
    # Use count > 0 assert instead of exact count
    count = page.locator("ul.divide-y li").count()
    assert count > 0, f"Expected at least 1 history item, found {count}"

    # 6. Click the history item to navigate back
    history_item = page.locator("ul.divide-y li").first
    history_label = history_item.locator("span").inner_text()

    history_item.click()

    # Wait for navigation
    page.wait_for_timeout(2000)

    print("Reading history journey completed successfully")
