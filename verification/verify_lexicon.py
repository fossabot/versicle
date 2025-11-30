import os
from playwright.sync_api import sync_playwright, expect

def verify_lexicon():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            page.goto("http://localhost:5173", timeout=15000)

            # Wait for initial load
            page.wait_for_timeout(2000)

            # Check if book exists
            if page.get_by_test_id("book-card").count() == 0:
                print("No books found. Attempting to load demo...")
                # Try finding button by partial text
                demo_btn = page.locator("button", has_text="Load Demo Book")
                if demo_btn.is_visible():
                    demo_btn.click()
                    print("Clicked demo button. Waiting for book...")
                    # Increase timeout for download and processing
                    expect(page.get_by_test_id("book-card").first).to_be_visible(timeout=30000)
                else:
                    print("Demo button not found. Dumping content...")

            # Open book
            print("Opening book...")
            page.get_by_test_id("book-card").first.click()

            # Wait for Reader View
            print("Waiting for reader view...")
            # Note: ReaderView.tsx doesn't have a single wrapper with data-testid="reader-view".
            # It has components like "reader-back-button", "reader-iframe-container"
            expect(page.get_by_test_id("reader-iframe-container")).to_be_visible(timeout=20000)

            # Open Settings
            print("Opening settings...")
            # Wait a bit for UI to settle
            page.wait_for_timeout(1000)
            page.get_by_label("Settings").click()

            expect(page.get_by_test_id("settings-panel")).to_be_visible()

            # Open Pronunciation Lexicon
            print("Opening Lexicon...")
            page.get_by_text("Pronunciation Lexicon").click()
            expect(page.get_by_text("Define custom pronunciation rules")).to_be_visible()

            # Add a rule
            print("Adding rule...")
            page.get_by_role("button", name="Add Rule").click()

            page.get_by_placeholder("Original").fill("Alice")
            page.get_by_placeholder("Replacement").fill("A-LICE")

            page.locator("button:has(svg.lucide-save)").click()

            # Verify
            expect(page.get_by_text("A-LICE")).to_be_visible()

            # Test
            print("Testing rule...")
            page.get_by_placeholder("Type a sentence containing your words...").fill("Alice is here.")
            page.get_by_role("button").filter(has=page.locator("svg.lucide-volume-2")).click()

            expect(page.get_by_text("A-LICE is here.")).to_be_visible()

            # Screenshot
            os.makedirs("verification", exist_ok=True)
            page.screenshot(path="verification/verify_lexicon.png")
            print("Verification successful!")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/error_lexicon.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_lexicon()
