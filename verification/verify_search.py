
import time
from playwright.sync_api import sync_playwright, expect

def verify_library_search():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        try:
            # Go to library
            page.goto("http://localhost:4173/")

            # Wait for library to load
            expect(page.get_by_role("heading", name="My Library")).to_be_visible()

            # Load Demo Book
            print("Loading demo book...")
            page.get_by_text("Load Demo Book (Alice in Wonderland)").click()

            # Wait for book to appear (Alice in Wonderland)
            expect(page.get_by_text("Alice's Adventures in Wonderland")).to_be_visible(timeout=10000)
            print("Demo book loaded.")

            # Take a screenshot of library with book
            page.screenshot(path="verification/library_with_book.png")

            # Search for non-existent book
            print("Searching for non-existent book...")
            search_input = page.get_by_test_id("library-search-input")
            search_input.fill("Harry Potter")

            # Verify "No books found" message
            expect(page.get_by_text('No books found matching "Harry Potter"')).to_be_visible()

            # Take a screenshot of search results (empty)
            page.screenshot(path="verification/library_search_no_results.png")
            print("Screenshot saved to verification/library_search_no_results.png")

            # Search for existing book
            print("Searching for existing book...")
            search_input.fill("Wonderland")

            # Verify book is visible
            expect(page.get_by_text("Alice's Adventures in Wonderland")).to_be_visible()

            # Take a screenshot of search results (found)
            page.screenshot(path="verification/library_search_results.png")
            print("Screenshot saved to verification/library_search_results.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_library_search()
