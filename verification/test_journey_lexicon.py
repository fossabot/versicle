import os
import pytest
from playwright.sync_api import Page, expect

def test_journey_lexicon(page: Page):
    """
    Verifies the Pronunciation Lexicon user journey:
    1. Open app and load a book.
    2. Open Settings -> Pronunciation Lexicon.
    3. Add a new rule (Alice -> A-LICE).
    4. Test the rule.
    5. Verify persistence/display.
    """

    # 1. Load the app
    page.goto("http://localhost:5173", timeout=15000)

    # Wait for initial load
    page.wait_for_timeout(2000)

    # Check if book exists
    if page.get_by_test_id("book-card").count() == 0:
        # Try finding button by partial text to load demo
        demo_btn = page.locator("button", has_text="Load Demo Book")
        if demo_btn.is_visible():
            demo_btn.click()
            # Increase timeout for download and processing
            expect(page.get_by_test_id("book-card").first).to_be_visible(timeout=30000)

    # Open book
    page.get_by_test_id("book-card").first.click()

    # Wait for Reader View
    expect(page.get_by_test_id("reader-iframe-container")).to_be_visible(timeout=20000)

    # Open Settings
    page.wait_for_timeout(1000)
    page.get_by_label("Settings").click()

    expect(page.get_by_test_id("settings-panel")).to_be_visible()

    # Open Pronunciation Lexicon
    page.get_by_text("Pronunciation Lexicon").click()
    expect(page.get_by_text("Define custom pronunciation rules")).to_be_visible()

    # Add a rule
    page.get_by_role("button", name="Add Rule").click()

    page.get_by_placeholder("Original").fill("Alice")
    page.get_by_placeholder("Replacement").fill("A-LICE")

    page.locator("button:has(svg.lucide-save)").click()

    # Verify
    expect(page.get_by_text("A-LICE")).to_be_visible()

    # Test
    page.get_by_placeholder("Type a sentence containing your words...").fill("Alice is here.")
    page.get_by_role("button").filter(has=page.locator("svg.lucide-volume-2")).click()

    expect(page.get_by_text("A-LICE is here.")).to_be_visible()

    # Screenshot
    os.makedirs("verification/screenshots", exist_ok=True)
    page.screenshot(path="verification/screenshots/lexicon_journey.png")
