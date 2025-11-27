from playwright.sync_api import sync_playwright
import os

def verify_library_page_with_book():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173")
            page.wait_for_load_state("networkidle")

            # Upload the alice.epub file
            # The input type="file" is likely hidden or styled, so we use set_input_files on the locator
            # We need to find the file input. Based on FileUploader.tsx (implied), it should be there.
            # Let's try to find it by generic input[type=file]

            # Use absolute path for the file
            epub_path = os.path.abspath("src/test/fixtures/alice.epub")

            # Wait for input to be attached
            page.set_input_files("input[type='file']", epub_path)

            # Wait for processing to finish. The store updates state.
            # We can wait for the "No books yet" message to disappear or a book card to appear.
            # BookCard has an img.

            page.wait_for_selector(".grid", timeout=5000) # Grid of books

            # Wait a bit for the cover to render (blob url creation)
            page.wait_for_timeout(1000)

            # Take screenshot
            page.screenshot(path="verification/library_with_book.png")
            print("Screenshot taken.")

        except Exception as e:
            print(f"Error: {e}")
            # Take error screenshot
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_library_page_with_book()
