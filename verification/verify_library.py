from playwright.sync_api import sync_playwright

def verify_library_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173")
            page.wait_for_load_state("networkidle")

            # Since we have no books in the browser session (persistence is local indexeddb),
            # we should see "No books yet" message or the empty library.
            # We want to verify the library page structure and "My Library" header.

            header = page.get_by_role("heading", name="My Library")
            if header.is_visible():
                print("Library header is visible.")
            else:
                print("Library header NOT visible.")

            # Take screenshot
            page.screenshot(path="verification/library_page.png")

            # Note: We cannot easily verify cover display without uploading a file in this script,
            # but we verified the logic in integration tests. The screenshot confirms the page loads.

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_library_page()
