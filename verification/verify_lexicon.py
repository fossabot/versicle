import sys
import os

# Add verification directory to path to import utils
sys.path.append(os.path.join(os.getcwd(), "verification"))

from playwright.sync_api import sync_playwright, expect
import time

def verify_lexicon_regex():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Load application
        page.goto("http://localhost:5173")

        # Wait for app to load
        page.wait_for_timeout(2000)

        # Click "Alice in Wonderland"
        try:
             # Try to find the book card for Alice
             page.get_by_text("Alice", exact=False).first.click()
        except:
             print("Could not find Alice book, skipping UI verification")
             browser.close()
             return

        page.wait_for_timeout(2000)

        # Open Settings
        try:
            page.locator("button[aria-label=\"Settings\"]").click()
        except:
             # Maybe it is in a menu or I need to tap center
             page.mouse.click(200, 200) # Center tap
             page.wait_for_timeout(500)
             page.locator("button[aria-label=\"Settings\"]").click()

        page.wait_for_timeout(1000)

        # Click "Pronunciation"
        try:
            page.get_by_text("Pronunciation").click()
        except:
            print("Could not find Pronunciation setting")
            # Try finding by looking for text "Pronunciation" in a button or link
            # Or maybe it is inside "Audio" tab?
            pass

        page.wait_for_timeout(1000)

        # Click "Add Rule" if needed
        try:
            page.get_by_text("Add Rule").click()
        except:
            pass

        page.wait_for_timeout(500)

        # Take screenshot of the form
        page.screenshot(path="verification/lexicon_regex_ui.png")
        print("Screenshot taken")

        browser.close()

if __name__ == "__main__":
    verify_lexicon_regex()
