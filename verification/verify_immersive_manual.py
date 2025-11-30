
from playwright.sync_api import sync_playwright, expect
import os

def verify_immersive_mode():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create context to set permissions if needed, though standard is fine
        context = browser.new_context()
        page = context.new_page()

        try:
            print("Navigating to app...")
            page.goto('http://localhost:5173/')

            # Wait for library
            expect(page.get_by_text("Library")).to_be_visible()

            # Ensure book exists
            if page.get_by_text("Alice's Adventures in Wonderland").count() == 0:
                print("Uploading book...")
                page.set_input_files("input[type='file']", "src/test/fixtures/alice.epub")
                expect(page.get_by_text("Alice's Adventures in Wonderland")).to_be_visible(timeout=10000)

            # Open book
            print("Opening book...")
            page.click("text=Alice's Adventures in Wonderland")
            expect(page.get_by_test_id("reader-iframe-container")).to_be_visible(timeout=10000)

            # Wait for content
            frame = page.frame_locator("iframe")
            frame.locator("body").wait_for(state="visible", timeout=10000)
            page.wait_for_timeout(2000) # Wait for UI to settle

            # Verify 'Enter Immersive' button exists
            enter_btn = page.get_by_test_id("reader-immersive-enter-button")
            expect(enter_btn).to_be_visible()
            print("Enter button visible.")

            # Click Enter Immersive
            print("Entering immersive mode...")
            enter_btn.click()
            page.wait_for_timeout(1000)

            # Verify Header Hidden
            expect(page.locator("header")).to_be_hidden()
            print("Header hidden.")

            # Verify Exit Button Visible
            exit_btn = page.get_by_test_id("reader-immersive-exit-button")
            expect(exit_btn).to_be_visible()
            print("Exit button visible.")

            # Screenshot Immersive State
            os.makedirs("verification", exist_ok=True)
            screenshot_path = "verification/verify_immersive_manual.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

            # Click Exit
            print("Exiting immersive mode...")
            exit_btn.click()
            page.wait_for_timeout(1000)

            # Verify Header Visible
            expect(page.locator("header")).to_be_visible()
            print("Header restored.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_immersive.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_immersive_mode()
