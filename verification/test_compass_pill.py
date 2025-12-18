import re
from playwright.sync_api import Page, expect
from verification import utils

def test_compass_pill(page: Page):
    print("Starting Compass Pill Journey...")
    utils.reset_app(page)
    utils.ensure_library_with_book(page)

    # 1. Open Book
    print("Opening book...")
    page.locator("[data-testid^='book-card-']").first.click()
    expect(page).to_have_url(re.compile(r".*/read/.*"))

    # 2. Simulate reading (navigate to a chapter)
    print("Navigating to chapter to ensure progress...")
    # This uses TOC to jump to a chapter, which guarantees progress > 0
    utils.navigate_to_chapter(page)

    # We need to wait for > 2 seconds for history to be saved (ReaderView.tsx constraint)
    # And for dbService.saveProgress debounce (1s)
    print("Reading for a few seconds...")
    page.wait_for_timeout(3000)

    # 3. Go back to Library
    print("Going back to library...")
    page.get_by_test_id("reader-back-button").click()
    expect(page).to_have_url(re.compile(r".*/$"))

    # Wait for library to load and update
    page.wait_for_timeout(1000)

    # 4. Check for Compass Pill
    print("Checking for Compass Pill...")
    pill = page.get_by_test_id("continue-reading-pill")
    expect(pill).to_be_visible()

    expect(pill).to_contain_text("Continue Reading")
    expect(pill).to_contain_text("%")

    utils.capture_screenshot(page, "compass_pill_visible")

    # 5. Click Compass Pill
    print("Clicking Compass Pill...")
    pill.click()

    # 6. Verify returned to reader
    expect(page).to_have_url(re.compile(r".*/read/.*"))
    utils.capture_screenshot(page, "compass_pill_clicked")

    print("Compass Pill Journey Passed!")
