
import os
import sys
from playwright.sync_api import sync_playwright, expect
import time

# Ensure we can import utils
sys.path.append(os.getcwd())
from verification.utils import ensure_library_with_book

def verify_sidebar_back(page):
    print("Navigating to reader...")
    # Ensure book is loaded (using alice.epub which is standard in verification)
    ensure_library_with_book(page)

    # Click on the first book to open reader
    page.click('text=Alice\'s Adventures in Wonderland')

    # Wait for reader to load
    page.wait_for_selector('[data-testid="reader-view"]', timeout=10000)

    # 1. Verify TOC Sidebar
    print("Testing TOC sidebar...")
    # Open TOC
    page.click('[data-testid="reader-toc-button"]')
    expect(page.locator('[data-testid="reader-toc-sidebar"]')).to_be_visible()

    # Take screenshot of TOC open
    page.screenshot(path="verification/sidebar_toc_open.png")

    # Go Back
    print("Going back (should close TOC)...")
    page.go_back()

    # Verify TOC is closed
    expect(page.locator('[data-testid="reader-toc-sidebar"]')).not_to_be_visible()
    # Verify we are still in reader
    expect(page.locator('[data-testid="reader-view"]')).to_be_visible()

    # 2. Verify Annotations Sidebar
    print("Testing Annotations sidebar...")
    page.click('[data-testid="reader-annotations-button"]')
    expect(page.locator('[data-testid="reader-annotations-sidebar"]')).to_be_visible()

    # Go Back
    print("Going back (should close Annotations)...")
    page.go_back()

    # Verify Annotations is closed
    expect(page.locator('[data-testid="reader-annotations-sidebar"]')).not_to_be_visible()
    expect(page.locator('[data-testid="reader-view"]')).to_be_visible()

    # 3. Verify Search Sidebar
    print("Testing Search sidebar...")
    page.click('[data-testid="reader-search-button"]')
    expect(page.locator('[data-testid="reader-search-sidebar"]')).to_be_visible()

    # Go Back
    print("Going back (should close Search)...")
    page.go_back()

    # Verify Search is closed
    expect(page.locator('[data-testid="reader-search-sidebar"]')).not_to_be_visible()
    expect(page.locator('[data-testid="reader-view"]')).to_be_visible()

    # 4. Verify Final Back leaves Reader
    print("Going back from Reader (should go to Library)...")
    page.go_back()
    expect(page.locator('[data-testid="library-view"]')).to_be_visible()

    print("Verification passed!")
    page.screenshot(path="verification/sidebar_closed_final.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            # Assuming preview runs on 4173
            page.goto("http://localhost:4173")
            verify_sidebar_back(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise
        finally:
            browser.close()
